import { resolveMirrorLaunchPackage } from '../src/services/mirrorLaunchPackage';
import * as api from '../src/services/api/events';
import * as storage from '../src/services/mirrorRuntimeStorage';

jest.mock('../src/services/api/events', () => ({ getPublishedMagicMirrorConfigApi: jest.fn(), getActiveMagicMirrorSessionApi: jest.fn(), getMagicMirrorSessionPackageApi: jest.fn(), startMagicMirrorSessionApi: jest.fn(), endMagicMirrorSessionApi: jest.fn() }));
jest.mock('../src/services/mirrorRuntimeStorage', () => ({ archiveMirrorRuntime: jest.fn(), saveMirrorRuntime: jest.fn() }));
const session = { id: 'old-session', configVersionId: '1', deviceInstallationId: 'phone' };
const local = { eventModeId: 'mode', session, version: { id: '1', config: { layout: { frameLayers: [] } } }, manifest: [], localManifest: [], completedRuns: [], activeRun: { clientRunId: 'run', captures: [{ photoNumber: 1, uri: 'file:///original.jpg' }] } };
const latest = { version: { id: '2', config: { layout: { frameLayers: [{ resourceId: 'new-frame' }] }, experience: { animationEnabledByStage: { start: true } } } }, manifest: [{ eventResourceId: 'new-video', placement: 'start' }] };
const options = () => ({ eventId: 'event', eventModeId: 'mode', installationId: 'phone', local, choosePrevious: jest.fn(async () => false) });
beforeEach(() => {
  jest.clearAllMocks();
  api.getPublishedMagicMirrorConfigApi.mockResolvedValue(latest);
  api.getActiveMagicMirrorSessionApi.mockResolvedValue({ session });
  api.startMagicMirrorSessionApi.mockResolvedValue({ ...latest, session: { id: 'new-session', configVersionId: '2' } });
  api.endMagicMirrorSessionApi.mockResolvedValue({});
});

it('launches B with its new frames and animations without mixing A captures', async () => {
  const input = options();
  const result = await resolveMirrorLaunchPackage(input);
  expect(input.choosePrevious).toHaveBeenCalledTimes(1);
  expect(storage.archiveMirrorRuntime).toHaveBeenCalledWith(expect.objectContaining({ activeRun: local.activeRun }));
  expect(api.endMagicMirrorSessionApi).toHaveBeenCalledWith('event', 'mode', 'old-session');
  expect(api.startMagicMirrorSessionApi).toHaveBeenCalledWith('event', 'mode', expect.objectContaining({ expectedPublishedVersionId: '2' }));
  expect(result).toEqual({ payload: { ...latest, session: { id: 'new-session', configVersionId: '2' } }, reuseLocal: false, reuseFiles: false });
});

it('continues A with its cached resources when the user chooses recovery', async () => {
  const result = await resolveMirrorLaunchPackage({ ...options(), choosePrevious: async () => true });
  expect(result.reuseLocal).toBe(true);
  expect(result.reuseFiles).toBe(true);
  expect(result.payload.version).toEqual(local.version);
  expect(api.startMagicMirrorSessionApi).not.toHaveBeenCalled();
  expect(api.endMagicMirrorSessionApi).not.toHaveBeenCalled();
});

it('uses the latest publication without prompting when the old result is complete', async () => {
  const input = options();
  await resolveMirrorLaunchPackage({ ...input, local: { ...local, activeRun: { ...local.activeRun, output: { uri: 'file:///result.jpg' } } } });
  expect(input.choosePrevious).not.toHaveBeenCalled();
  expect(api.startMagicMirrorSessionApi).toHaveBeenCalledTimes(1);
});

it('keeps a compatible active session without creating a second one', async () => {
  api.getPublishedMagicMirrorConfigApi.mockResolvedValue({ version: local.version });
  const input = options();
  const result = await resolveMirrorLaunchPackage(input);
  expect(result.payload.version.id).toBe('1');
  expect(input.choosePrevious).not.toHaveBeenCalled();
  expect(api.startMagicMirrorSessionApi).not.toHaveBeenCalled();
});

it('does not close a different device session', async () => {
  api.getActiveMagicMirrorSessionApi.mockResolvedValue({ session: { ...session, deviceInstallationId: 'other', clientSessionId: 'other-session' } });
  await expect(resolveMirrorLaunchPackage(options())).rejects.toMatchObject({ message: 'MIRROR_SESSION_ALREADY_ACTIVE' });
  expect(api.endMagicMirrorSessionApi).not.toHaveBeenCalled();
});

it('retains the pending close and does not start B if closing A fails', async () => {
  api.endMagicMirrorSessionApi.mockRejectedValueOnce(new Error('Offline'));
  await expect(resolveMirrorLaunchPackage(options())).rejects.toThrow('Offline');
  expect(storage.saveMirrorRuntime).toHaveBeenCalledWith(expect.objectContaining({ pendingSessionAction: 'end', activeRun: local.activeRun }));
  expect(api.startMagicMirrorSessionApi).not.toHaveBeenCalled();
});

it('rejects a mismatched session/config response instead of rendering the wrong design', async () => {
  api.startMagicMirrorSessionApi.mockResolvedValueOnce({ ...latest, session: { configVersionId: '1' } });
  await expect(resolveMirrorLaunchPackage(options())).rejects.toThrow('MIRROR_PACKAGE_VERSION_MISMATCH');
});

it('refreshes once when publication changes during session creation', async () => {
  api.getActiveMagicMirrorSessionApi.mockResolvedValue({});
  api.startMagicMirrorSessionApi.mockRejectedValueOnce(Object.assign(new Error('changed'), { code: 'MIRROR_PUBLISHED_VERSION_CHANGED' }));
  const result = await resolveMirrorLaunchPackage({ ...options(), local: null });
  expect(result.payload.version.id).toBe('2');
  expect(api.getPublishedMagicMirrorConfigApi).toHaveBeenCalledTimes(2);
  expect(api.startMagicMirrorSessionApi).toHaveBeenCalledTimes(2);
});

it('asks before discarding an experience whose output file is unavailable', async () => {
  const input = options();
  await resolveMirrorLaunchPackage({ ...input, local: { ...local, activeRun: { ...local.activeRun, output: { localAvailable: false } } } });
  expect(input.choosePrevious).toHaveBeenCalledTimes(1);
});

it('does not close or open sessions when the downloaded publication is stale', async () => {
  await expect(resolveMirrorLaunchPackage({ ...options(), preparedVersionId: '1' })).rejects.toThrow('MIRROR_PUBLISHED_VERSION_CHANGED');
  expect(api.endMagicMirrorSessionApi).not.toHaveBeenCalled();
  expect(api.startMagicMirrorSessionApi).not.toHaveBeenCalled();
});
