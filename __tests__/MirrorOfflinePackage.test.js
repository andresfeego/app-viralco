import AsyncStorage from '@react-native-async-storage/async-storage';
import { completeMirrorPackage, loadOfflineMirrorPackage, prepareOfflineMirrorPackage } from '../src/services/mirrorOfflinePackage';
import * as storage from '../src/services/mirrorRuntimeStorage';
import { getPublishedMagicMirrorConfigApi } from '../src/services/api/events';
import { refreshMirrorRecovery } from '../src/services/mirrorRecoveryAccess';
import { prepareCatalogForEvent } from '../src/services/primeOfflineCatalog';

jest.mock('../src/services/mirrorRuntimeStorage', () => ({ cacheMirrorPackage: jest.fn(), hydrateMirrorRuntime: jest.fn(async value => value), serializeMirrorRuntime: value => value }));
jest.mock('../src/services/api/events', () => ({ getPublishedMagicMirrorConfigApi: jest.fn() }));
jest.mock('../src/services/mirrorRecoveryAccess', () => ({ refreshMirrorRecovery: jest.fn() }));
jest.mock('../src/services/primeOfflineCatalog', () => ({ prepareCatalogForEvent: jest.fn(async () => {}) }));
const scope = { userId: '1', accountId: '2', eventId: '3', eventModeId: '4' };
const published = { version: { id: '5', version: 2, config: { layout: {} } }, manifest: [{ eventResourceId: '6' }] };
const files = [{ eventResourceId: '6', localAvailable: true, uri: 'file:///video.mp4' }];
beforeEach(async () => {
  jest.clearAllMocks();
  const data = new Map();
  AsyncStorage.getItem.mockImplementation(async key => data.get(key) || null);
  AsyncStorage.setItem.mockImplementation(async (key, value) => { data.set(key, value); });
  getPublishedMagicMirrorConfigApi.mockResolvedValue(published);
  storage.cacheMirrorPackage.mockResolvedValue(files);
  refreshMirrorRecovery.mockResolvedValue({ verifier: null });
  storage.hydrateMirrorRuntime.mockImplementation(async value => value);
});
it('persists an independently reusable package with publication number, without requiring recovery to be configured', async () => {
  const progress = jest.fn();
  const value = await prepareOfflineMirrorPackage(scope, progress);
  expect(value.version.version).toBe(2);
  expect(value.recoveryAvailable).toBe(false);
  expect(prepareCatalogForEvent).toHaveBeenCalledWith(scope);
  expect(storage.cacheMirrorPackage).toHaveBeenCalledWith(expect.objectContaining({ session: { id: 'package-4' } }), progress);
  expect((await loadOfflineMirrorPackage(scope)).version.id).toBe('5');
  expect(await loadOfflineMirrorPackage({ ...scope, userId: 'someone-else' })).toBeNull();
});
it('never replaces a complete package with a partial download', async () => {
  await prepareOfflineMirrorPackage(scope);
  storage.cacheMirrorPackage.mockResolvedValue([]);
  await expect(prepareOfflineMirrorPackage(scope)).rejects.toThrow('MIRROR_PACKAGE_INCOMPLETE');
  expect((await loadOfflineMirrorPackage(scope)).localManifest).toEqual(files);
});
it('does not mark ready when recovery verification cannot be fetched', async () => {
  refreshMirrorRecovery.mockResolvedValue(null);
  await expect(prepareOfflineMirrorPackage(scope)).rejects.toThrow('MIRROR_RECOVERY_NOT_DOWNLOADED');
  expect(await loadOfflineMirrorPackage(scope)).toBeNull();
});

it('does not mark a package ready before its cold-start navigation catalog is saved', async () => {
  prepareCatalogForEvent.mockRejectedValueOnce(new Error('catalog write failed'));
  await expect(prepareOfflineMirrorPackage(scope)).rejects.toThrow('catalog write failed');
  expect(await loadOfflineMirrorPackage(scope)).toBeNull();
});
it('rechecks cached file integrity and rejects missing files', async () => {
  await prepareOfflineMirrorPackage(scope);
  storage.hydrateMirrorRuntime.mockImplementation(async value => ({ ...value, localManifest: [{ ...files[0], localAvailable: false }] }));
  expect(await loadOfflineMirrorPackage(scope)).toBeNull();
});
it('accepts a resource-free published layout and rejects mismatched resource identities', () => {
  expect(completeMirrorPackage({ ...published, manifest: [], localManifest: [] })).toBe(true);
  expect(completeMirrorPackage({ ...published, localManifest: [{ eventResourceId: 'other', localAvailable: true }] })).toBe(false);
});
