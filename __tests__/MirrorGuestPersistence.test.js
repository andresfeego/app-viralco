import AsyncStorage from '@react-native-async-storage/async-storage';
import { unlink } from '@dr.pogodin/react-native-fs';
import { archiveMirrorRuntime, cleanGuestOriginals, serializeMirrorRuntime } from '../src/services/mirrorRuntimeStorage';
import { syncMirrorRun } from '../src/services/mirrorRuntimeSync';
import * as api from '../src/services/api/events';

jest.mock('../src/services/api/events', () => ({
  registerOfflineMirrorSessionApi: jest.fn(async () => ({ session: { id: 'registered' } })),
  createMagicMirrorRunApi: jest.fn(async () => ({ run: { id: 'server' } })),
  updateMagicMirrorRunApi: jest.fn(async () => ({})),
  prepareMagicMirrorCaptureApi: jest.fn(async () => ({ capture: { id: 'capture' } })),
  completeMagicMirrorCaptureApi: jest.fn(),
  prepareMagicMirrorAssetApi: jest.fn(async () => ({ asset: { id: 'output' } })),
  completeMagicMirrorAssetApi: jest.fn(async () => ({ asset: { id: 'output', publicHash: 'qr' } })),
  uploadFileToPreparedUrl: jest.fn(),
}));
const context = { session: { id: 'session' }, eventId: 'event', eventModeId: 'mode', localManifest: [], config: { capture: { preserveOriginals: false } } };
const run = { clientRunId: 'run', retentionPolicyVersion: 1, captures: [{ clientCaptureId: 'one', path: '/tmp/documents/kaptura-mirror-captures/session/run/one.jpg' }], output: { clientAssetId: 'asset', path: '/tmp/documents/kaptura-mirror-captures/session/run/output.jpg' } };
beforeEach(() => { jest.clearAllMocks(); });

it('registers an offline session using its original publication before uploading and retains the local identity', async () => {
  const offline = { ...context, offlineSession: true, version: { id: 'historical' }, installationId: 'phone', clientSessionId: 'uuid', session: { id: 'offline-uuid', startedAt: '2026-01-01' } };
  await syncMirrorRun(offline, { ...run, startedAt: '2026-01-02' });
  expect(api.registerOfflineMirrorSessionApi).toHaveBeenCalledWith('event', 'mode', { configVersionId: 'historical', clientSessionId: 'uuid', deviceInstallationId: 'phone', startedAt: '2026-01-01', through: '2026-01-02' });
  expect(api.createMagicMirrorRunApi).toHaveBeenCalledWith('event', 'mode', 'registered', expect.anything());
  expect(offline.session.id).toBe('offline-uuid');
});

it('syncs output without uploading originals when disabled', async () => {
  const result = await syncMirrorRun(context, run);
  expect(api.prepareMagicMirrorCaptureApi).not.toHaveBeenCalled();
  expect(result.captures).toEqual(run.captures);
  expect(result.output.publicHash).toBe('qr');
});

it('retains every local photo during incremental acknowledgements', async () => {
  const update = jest.fn();
  await syncMirrorRun({ ...context, config: { capture: { preserveOriginals: true } } }, { ...run, captures: [...run.captures, { clientCaptureId: 'two' }] }, update);
  expect(api.prepareMagicMirrorCaptureApi).toHaveBeenCalledTimes(2);
  expect(update.mock.calls.every(([value]) => value.captures.length === 2)).toBe(true);
});

it('confirms the composition for QR before originals, preserving it when an original fails', async () => {
  api.completeMagicMirrorAssetApi.mockResolvedValueOnce({ asset: { id: 'output', publicHash: 'qr' }, publicUrl: 'https://kaptura.test/photos/qr' });
  api.prepareMagicMirrorCaptureApi.mockRejectedValueOnce(new Error('original upload failed'));
  const update = jest.fn();
  await expect(syncMirrorRun({ ...context, config: { capture: { preserveOriginals: true } } }, run, update)).rejects.toThrow('original upload failed');
  expect(api.completeMagicMirrorAssetApi.mock.invocationCallOrder[0]).toBeLessThan(api.prepareMagicMirrorCaptureApi.mock.invocationCallOrder[0]);
  expect(update.mock.calls.at(-1)[0].output).toMatchObject({ syncStatus: 'synced', publicUrl: 'https://kaptura.test/photos/qr' });
});

it('retains originals after synchronization for reversible local archiving', async () => {
  expect(await cleanGuestOriginals(context, run)).toEqual(run);
  expect(await cleanGuestOriginals(context, { ...run, retentionPolicyVersion: undefined, syncStatus: 'synced' })).toHaveProperty('captures', run.captures);
  expect(unlink).not.toHaveBeenCalled();
  const cleaned = await cleanGuestOriginals(context, { ...run, syncStatus: 'synced' });
  expect(cleaned.captures).toEqual(run.captures);
  expect(unlink).not.toHaveBeenCalled();
});

it('archives an unfinished active experience with its photographs', async () => {
  await archiveMirrorRuntime({ ...context, completedRuns: [], activeRun: run });
  const saved = JSON.parse(AsyncStorage.setItem.mock.calls.at(-1)[1]);
  expect(saved[0].activeRun).toBe(null);
  expect(saved[0].completedRuns).toEqual(serializeMirrorRuntime({ completedRuns: [run] }).completedRuns);
});
