import { getActiveMagicMirrorSessionApi, getPublishedMagicMirrorConfigApi, getMagicMirrorSessionPackageApi, startMagicMirrorSessionApi, endMagicMirrorSessionApi } from './api/events';
import { archiveMirrorRuntime, saveMirrorRuntime } from './mirrorRuntimeStorage';
import { createClientUuid } from '../domain/mirrorRuntime';

export const hasPendingMirrorPhotos = (runtime) => Boolean(runtime?.activeRun?.captures?.length && (!runtime.activeRun.output || runtime.activeRun.output.localAvailable === false || runtime.activeRun.retakePhotoNumber));

export function assertMirrorPackageVersion(payload) {
  if (String(payload.session.configVersionId) !== String(payload.version.id)) throw new Error('MIRROR_PACKAGE_VERSION_MISMATCH');
}

// A fresh launch is not an unconditional resume. Publication identity decides
// whether the old experience can be reused; photographs never cross versions.
export async function resolveMirrorLaunchPackage({ eventId, eventModeId, installationId, local, choosePrevious, retry = true, preparedVersionId }) {
  const latest = await getPublishedMagicMirrorConfigApi(eventId, eventModeId, { requireOnline: true });
  if (preparedVersionId && String(latest.version.id) !== String(preparedVersionId)) {
    const error = new Error('MIRROR_PUBLISHED_VERSION_CHANGED');
    error.code = 'MIRROR_PUBLISHED_VERSION_CHANGED';
    throw error;
  }
  const active = await getActiveMagicMirrorSessionApi(eventId, eventModeId);
  if (active?.session && active.session.deviceInstallationId !== installationId && active.session.clientSessionId !== local?.clientSessionId) {
    const error = new Error('MIRROR_SESSION_ALREADY_ACTIVE');
    error.session = active.session;
    throw error;
  }
  const sameSession = active?.session && String(active.session.id) === String(local?.session?.id);
  const changed = active?.session && String(active.session.configVersionId) !== String(latest.version.id);
  const continuePrevious = changed && sameSession && hasPendingMirrorPhotos(local) && await choosePrevious();
  if (active?.session && (!changed || continuePrevious)) {
    // Reuse verified immutable local resources when available, rather than
    // resolving an old experience through today's mutable event assignments.
    const reusable = sameSession && String(local.version?.id) === String(active.session.configVersionId)
      && Array.isArray(local.localManifest) && Array.isArray(local.manifest)
      && local.localManifest.length === local.manifest.length && !local.localManifest.some((file) => file.localAvailable === false);
    const payload = reusable ? { session: active.session, version: local.version, manifest: local.manifest } : await getMagicMirrorSessionPackageApi(eventId, eventModeId, active.session.id);
    assertMirrorPackageVersion(payload);
    return { payload, reuseLocal: Boolean(sameSession), reuseFiles: Boolean(reusable) };
  }
  if (local) {
    const archived = { ...local, pendingSessionAction: active?.session ? 'end' : null };
    await archiveMirrorRuntime(archived);
    // A failure or interruption here must not lose the pending close.
    if (sameSession) await saveMirrorRuntime(archived);
  }
  if (active?.session) await endMagicMirrorSessionApi(eventId, eventModeId, active.session.id);
  if (local) await archiveMirrorRuntime({ ...local, pendingSessionAction: null });
  let payload;
  try {
    payload = await startMagicMirrorSessionApi(eventId, eventModeId, {
      clientSessionId: createClientUuid(), deviceInstallationId: installationId,
      expectedPublishedVersionId: latest.version.id, metadata: { platform: 'mobile-kaptura' },
    });
  } catch (error) {
    if (retry && !preparedVersionId && error.code === 'MIRROR_PUBLISHED_VERSION_CHANGED') return resolveMirrorLaunchPackage({ eventId, eventModeId, installationId, local: null, choosePrevious, retry: false });
    throw error;
  }
  assertMirrorPackageVersion(payload);
  return { payload, reuseLocal: false, reuseFiles: false };
}
