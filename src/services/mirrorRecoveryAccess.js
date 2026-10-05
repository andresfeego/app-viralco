import AsyncStorage from '@react-native-async-storage/async-storage';
import bcrypt from 'bcryptjs';
import { getMirrorRecoveryApi } from './api/events';
import { samePattern, validPattern } from '../domain/mirrorPattern';

const key = (scope) => `@kaptura/mirror/recovery:v1:${scope.userId}:${scope.accountId}:${scope.eventId}:${scope.eventModeId}`;
const pending = new Map();

export function refreshMirrorRecovery(scope, { strict = false } = {}) {
  const storageKey = key(scope);
  const requestKey = `${storageKey}:${strict}`;
  if (pending.has(requestKey)) return pending.get(requestKey);
  const request = (async () => {
    try {
      const response = await getMirrorRecoveryApi(scope.eventId, scope.eventModeId);
      // Only a verifier is cached; never store the drawn pattern.
      await AsyncStorage.setItem(storageKey, JSON.stringify({ verifier: response.verifier || null }));
      return response;
    } catch (error) {
      if ([401, 403, 404].includes(error?.status)) await AsyncStorage.removeItem(storageKey);
      if (strict) throw error;
      return null;
    } finally { pending.delete(requestKey); }
  })();
  pending.set(requestKey, request);
  return request;
}

export async function verifyMirrorAccess(scope, value, temporaryPattern) {
  const storageKey = key(scope);
  const attemptsKey = `${storageKey}:attempts`;
  const attempts = JSON.parse(await AsyncStorage.getItem(attemptsKey) || '{}');
  if (Number(attempts.blockedUntil || 0) > Date.now()) return false;
  const cache = JSON.parse(await AsyncStorage.getItem(storageKey) || '{}');
  const valid = validPattern(value) && (samePattern(value, temporaryPattern || [])
    || (typeof cache.verifier === 'string' && await bcrypt.compare(value.join('-'), cache.verifier)));
  if (valid) { await AsyncStorage.removeItem(attemptsKey); return true; }
  const failures = Number(attempts.failures || 0) + 1;
  await AsyncStorage.setItem(attemptsKey, JSON.stringify(failures >= 5 ? { failures: 0, blockedUntil: Date.now() + 30000 } : { failures }));
  return false;
}
