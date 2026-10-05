import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import { getMirrorRecoveryApi } from '../src/services/api/events';
import { refreshMirrorRecovery, verifyMirrorAccess } from '../src/services/mirrorRecoveryAccess';
jest.mock('../src/services/api/events', () => ({ getMirrorRecoveryApi: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map();
  return {
    getItem: jest.fn(async key => values.get(key) || null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async key => { values.delete(key); }),
    clear: jest.fn(async () => values.clear()),
    getAllKeys: jest.fn(async () => [...values.keys()]),
    multiGet: jest.fn(async keys => keys.map(key => [key, values.get(key)])),
  };
});
const scope = { userId: '3', accountId: '1', eventId: '2', eventModeId: '4' };
const temporary = [0, 1, 2, 5];
const recovery = [6, 7, 8, 5];
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it('accepts the temporary pattern with no recovery configured', async () => {
  expect(await verifyMirrorAccess(scope, temporary, temporary)).toBe(true);
});
it('downloads updates, works offline, isolates events and never caches the raw pattern', async () => {
  getMirrorRecoveryApi.mockResolvedValue({ verifier: bcrypt.hashSync(recovery.join('-'), 4) });
  await refreshMirrorRecovery(scope);
  expect(await verifyMirrorAccess(scope, recovery, temporary)).toBe(true);
  getMirrorRecoveryApi.mockRejectedValue(new Error('Network unavailable'));
  await refreshMirrorRecovery(scope);
  expect(await verifyMirrorAccess(scope, recovery, temporary)).toBe(true);
  expect(await verifyMirrorAccess({ ...scope, eventId: 'other' }, recovery, temporary)).toBe(false);
  const values = await AsyncStorage.multiGet(await AsyncStorage.getAllKeys());
  expect(JSON.stringify(values)).not.toContain(recovery.join('-'));
  getMirrorRecoveryApi.mockResolvedValue({ verifier: bcrypt.hashSync('0-3-6-7', 4) });
  await refreshMirrorRecovery(scope);
  expect(await verifyMirrorAccess(scope, recovery, temporary)).toBe(false);
  expect(await verifyMirrorAccess(scope, [0, 3, 6, 7], temporary)).toBe(true);
});
it('purges cached access after authorization is revoked', async () => {
  getMirrorRecoveryApi.mockResolvedValue({ verifier: bcrypt.hashSync(recovery.join('-'), 4) });
  await refreshMirrorRecovery(scope);
  getMirrorRecoveryApi.mockRejectedValue({ status: 403 });
  await refreshMirrorRecovery(scope);
  expect(await verifyMirrorAccess(scope, recovery, temporary)).toBe(false);
});
it('retains the retry limit across gate reopenings', async () => {
  for (let i = 0; i < 5; i += 1) expect(await verifyMirrorAccess(scope, recovery, temporary)).toBe(false);
  expect(await verifyMirrorAccess(scope, temporary, temporary)).toBe(false);
});
