import AsyncStorage from '@react-native-async-storage/async-storage';
import { cacheMirrorPackage, hydrateMirrorRuntime, serializeMirrorRuntime } from './mirrorRuntimeStorage';
import { getPublishedMagicMirrorConfigApi } from './api/events';
import { refreshMirrorRecovery } from './mirrorRecoveryAccess';
import { authorizeMirrorOperation } from './mirrorOperationAccess';
import { prepareCatalogForEvent } from './primeOfflineCatalog';
import { writeCatalog, offlineIdentity, sameOfflineIdentity } from './offlineCatalog';

const key = (scope) => `@kaptura/mirror/offline-package:v1:${scope.userId}:${scope.accountId}:${scope.eventId}:${scope.eventModeId}`;
export const clearOfflineMirrorPackage = (scope) => AsyncStorage.removeItem(key(scope));
export const completeMirrorPackage = (value) => Boolean(value?.version?.id && value.version.config && Array.isArray(value.manifest) && Array.isArray(value.localManifest)
  && value.localManifest.length === value.manifest.length
  && value.manifest.every(item => value.localManifest.some(file => String(file.eventResourceId) === String(item.eventResourceId) && file.localAvailable === true)));

export async function loadOfflineMirrorPackage(scope, onProgress) {
  const raw = await AsyncStorage.getItem(key(scope));
  if (!raw) return null;
  try {
    const value = await hydrateMirrorRuntime(JSON.parse(raw), onProgress);
    return completeMirrorPackage(value) ? value : null;
  } catch { return null; }
}

export async function prepareOfflineMirrorPackage(scope, onProgress) {
  const identity = offlineIdentity();
  await authorizeMirrorOperation(scope);
  const published = await getPublishedMagicMirrorConfigApi(scope.eventId, scope.eventModeId, { requireOnline: true });
  const localManifest = await cacheMirrorPackage({ ...published, session: { id: `package-${scope.eventModeId}` } }, onProgress);
  const recovery = await refreshMirrorRecovery(scope, { strict: true });
  if (!recovery) throw new Error('MIRROR_RECOVERY_NOT_DOWNLOADED');
  const value = { ...published, localManifest, recoveryAvailable: Boolean(recovery.verifier), preparedAt: new Date().toISOString() };
  if (!completeMirrorPackage(value)) throw new Error('MIRROR_PACKAGE_INCOMPLETE');
  if (!sameOfflineIdentity(identity)) throw new Error('MIRROR_SESSION_USER_CHANGED');
  await prepareCatalogForEvent(scope);
  if (!sameOfflineIdentity(identity)) throw new Error('MIRROR_SESSION_USER_CHANGED');
  await writeCatalog(scope.userId, `/api/events/${scope.eventId}/modes/${scope.eventModeId}/config/published`, published);
  // Commit only after all resources and the recovery verifier have been fetched.
  await AsyncStorage.setItem(key(scope), JSON.stringify(serializeMirrorRuntime(value)));
  return value;
}
