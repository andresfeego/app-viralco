import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { loadSecureSession, saveSecureSession, clearSecureSession } from '../src/services/secureSession';
import { listClientTechnicalErrors, userErrorMessage } from '../src/services/errorHandling';
beforeEach(() => {
  jest.clearAllMocks();
  const data = new Map();
  AsyncStorage.getItem.mockImplementation(async key => data.get(key) || null);
  AsyncStorage.setItem.mockImplementation(async (key, value) => { data.set(key, value); });
  AsyncStorage.removeItem.mockImplementation(async key => { data.delete(key); });
  Keychain.getGenericPassword.mockResolvedValue(false);
});
it('stores tokens and profile in protected storage, not AsyncStorage', async () => {
  const session = { accessToken: 'access', refreshToken: 'refresh', user: { id: '1' } };
  await saveSecureSession(session);
  expect(Keychain.setGenericPassword).toHaveBeenCalledWith('session', JSON.stringify(session), expect.objectContaining({ accessible: 'device' }));
  expect(AsyncStorage.setItem.mock.calls.every(([, value]) => !value.includes('accessToken'))).toBe(true);
});
it('migrates the legacy session only after the protected write succeeds', async () => {
  await AsyncStorage.setItem('viralco_session_v1', JSON.stringify({ accessToken: 'old', refreshToken: 'refresh' }));
  expect((await loadSecureSession()).accessToken).toBe('old');
  expect(Keychain.setGenericPassword).toHaveBeenCalled();
  expect(await AsyncStorage.getItem('viralco_session_v1')).toBeNull();
});
it('clears keychain leftovers on a fresh installation and supports local logout', async () => {
  await loadSecureSession();
  expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(1);
  await clearSecureSession();
  expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(2);
});
it('logs a native keychain failure without exposing details or storing plaintext credentials', async () => {
  Keychain.setGenericPassword.mockRejectedValueOnce(new Error("Internal error when a required entitlement isn't present."));
  let failure;
  try { await saveSecureSession({ accessToken: 'private-token' }); } catch (error) { failure = error; }
  expect(failure.code).toBe('SECURE_SESSION_WRITE_FAILED');
  expect(userErrorMessage(failure, 'No se pudo iniciar sesión')).toBe('No se pudo iniciar sesión');
  expect((await listClientTechnicalErrors())[0]).toMatchObject({ code: 'SECURE_SESSION_WRITE_FAILED' });
  expect(AsyncStorage.setItem.mock.calls.every(([, value]) => !value.includes('private-token'))).toBe(true);
  await expect(saveSecureSession({ user: { id: '1' } })).resolves.toBeUndefined();
});
