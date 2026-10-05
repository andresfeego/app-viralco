import AsyncStorage from '@react-native-async-storage/async-storage';
import { setOfflineUser } from '../src/services/offlineCatalog';
import { apiRequest } from '../src/services/api/http';
import { authorizeMirrorOperation, assertOfflineOperation, readOperationAccess } from '../src/services/mirrorOperationAccess';
import { syncMirrorRun } from '../src/services/mirrorRuntimeSync';
import * as events from '../src/services/api/events';
jest.unmock('../src/services/mirrorOperationAccess');
jest.mock('../src/services/offlineBillingGrant', () => ({ verifyBillingGrant: () => ({ issuedAt: 1, expiresAt: Number.MAX_SAFE_INTEGER }), billingGrantAllowsMode: () => true, anchorBillingClock: async () => {}, billingNow: async () => Date.now(), canContinueBillingLaunch: () => false, liveBillingContext: () => null }));
jest.mock('../src/services/api/http', () => ({ apiRequest: jest.fn() }));
jest.mock('../src/services/api/events', () => ({ createMagicMirrorRunApi: jest.fn(), registerOfflineMirrorSessionApi: jest.fn(), uploadFileToPreparedUrl: jest.fn(), updateMagicMirrorRunApi: jest.fn(), prepareMagicMirrorAssetApi: jest.fn(), completeMagicMirrorAssetApi: jest.fn() }));
const context = { eventId: '2', eventModeId: '3', userId: '1', offlineSession: true };
const grant = { allowed: true, userId: '1', eventId: '2', eventModeId: '3' };
beforeEach(() => {
  jest.clearAllMocks(); setOfflineUser('1');
  const data = new Map();
  AsyncStorage.getItem.mockImplementation(async key => data.get(key) || null);
  AsyncStorage.setItem.mockImplementation(async (key, value) => { data.set(key, value); });
  apiRequest.mockResolvedValue(grant);
});
afterEach(() => setOfflineUser(null));
it('retains a previously confirmed operational grant across offline reads', async () => {
  await authorizeMirrorOperation(context);
  apiRequest.mockRejectedValue(new Error('no network'));
  await expect(assertOfflineOperation('2', '3')).resolves.toBeUndefined();
});
it.each([401, 403, 404, 409])('persists denial %s and blocks registration/upload without removing photos', async status => {
  await authorizeMirrorOperation(context);
  apiRequest.mockRejectedValue({ status });
  const run = { captures: [{ uri: 'file:///original.jpg' }], output: { uri: 'file:///result.jpg' } };
  await expect(syncMirrorRun(context, run)).rejects.toMatchObject({ status });
  expect(events.registerOfflineMirrorSessionApi).not.toHaveBeenCalled();
  expect(events.createMagicMirrorRunApi).not.toHaveBeenCalled();
  expect(events.uploadFileToPreparedUrl).not.toHaveBeenCalled();
  await expect(assertOfflineOperation('2', '3')).rejects.toThrow();
  expect(run.captures).toHaveLength(1);
  expect(run.output.uri).toBe('file:///result.jpg');
});
it.each([0, 500])('does not synchronize an unknown authorization (%s), even with an old grant', async status => {
  await authorizeMirrorOperation(context);
  apiRequest.mockRejectedValue({ status });
  await expect(syncMirrorRun(context, { output: {} })).rejects.toMatchObject({ status });
  expect(events.createMagicMirrorRunApi).not.toHaveBeenCalled();
  expect(events.uploadFileToPreparedUrl).not.toHaveBeenCalled();
  expect((await readOperationAccess('2', '3')).allowed).toBe(true);
});
it('isolates authorization by user and event', async () => {
  await authorizeMirrorOperation(context);
  await expect(assertOfflineOperation('2', 'other')).rejects.toThrow();
  setOfflineUser('4');
  await expect(assertOfflineOperation('2', '3')).rejects.toThrow();
  await expect(authorizeMirrorOperation(context)).rejects.toThrow('MIRROR_SESSION_USER_CHANGED');
});
it('requires a fresh server decision for each authorization attempt', async () => {
  await authorizeMirrorOperation(context); await authorizeMirrorOperation(context);
  expect(apiRequest).toHaveBeenCalledTimes(2);
  expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('/api/events/2/modes/3/operation-access?deviceId='), { method: 'GET' }, { requireOnline: true });
});
it('checks again immediately before transferring bytes, even after obtaining a signed URL', async () => {
  apiRequest.mockResolvedValueOnce(grant).mockRejectedValueOnce({ status: 403 });
  events.createMagicMirrorRunApi.mockResolvedValue({ run: { id: 'run' } });
  events.prepareMagicMirrorAssetApi.mockResolvedValue({ asset: { id: 'asset' }, upload: { uploadUrl: 'https://storage.test/signed' } });
  await expect(syncMirrorRun({ ...context, offlineSession: false, session: { id: 'session' }, localManifest: [] }, { output: { uri: 'file:///photo.jpg' }, captures: [] })).rejects.toMatchObject({ status: 403 });
  expect(events.uploadFileToPreparedUrl).not.toHaveBeenCalled();
  expect(events.completeMagicMirrorAssetApi).not.toHaveBeenCalled();
});
