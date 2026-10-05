import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { recordClientTechnicalError } from './errorHandling';

const service = 'com.viralco.kaptura.session.v2';
const marker = '@kaptura/secure-session-installed';
const legacy = 'viralco_session_v1';
const options = { service, accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
let writes = Promise.resolve();
export function saveSecureSession(value) {
  writes = writes.catch(() => {}).then(async () => {
    try {
      await Keychain.setGenericPassword('session', JSON.stringify(value), options);
    } catch (error) {
      await recordClientTechnicalError({ code: 'SECURE_SESSION_WRITE_FAILED', detail: error?.message });
      // Never fall back to unencrypted storage or expose native security errors.
      const failure = new Error('SECURE_SESSION_WRITE_FAILED');
      failure.code = 'SECURE_SESSION_WRITE_FAILED';
      throw failure;
    }
    await AsyncStorage.setItem(marker, '1');
    await AsyncStorage.removeItem(legacy);
  });
  return writes;
}
export function clearSecureSession() {
  writes = writes.catch(() => {}).then(async () => {
    await Keychain.resetGenericPassword({ service });
    await AsyncStorage.removeItem(legacy);
    await AsyncStorage.setItem(marker, '1');
  });
  return writes;
}
export async function loadSecureSession() {
  await writes.catch(() => {});
  // Keychain can outlive uninstall. Never resurrect credentials on a new install.
  if (!(await AsyncStorage.getItem(marker))) {
    await Keychain.resetGenericPassword({ service });
    await AsyncStorage.setItem(marker, '1');
  }
  const stored = await Keychain.getGenericPassword({ service });
  if (stored) return JSON.parse(stored.password);
  const raw = await AsyncStorage.getItem(legacy);
  if (!raw) return null;
  const value = JSON.parse(raw);
  await saveSecureSession(value);
  return value;
}
