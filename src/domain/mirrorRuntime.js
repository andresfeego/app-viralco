export const MIRROR_RUNTIME_STAGES = Object.freeze({
  PREPARING: 'preparing',
  READY: 'ready',
  WELCOME: 'welcome',
  BEFORE_CAPTURE: 'beforeCapture',
  COUNTDOWN: 'countdown',
  CAPTURING: 'capturing',
  REVIEW: 'review',
  PROCESSING: 'processing',
  DELIVERY: 'delivery',
  ERROR: 'error',
});

export const LOCAL_SYNC_STATUSES = Object.freeze({
  LOCAL: 'local',
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  FAILED: 'failed',
});

export function createClientUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
    const random = Math.floor(Math.random() * 16);
    const value = token === 'x' ? random : (random % 4) + 8;
    return value.toString(16);
  });
}

export function createMirrorRuntimeState(input = {}) {
  return {
    schemaVersion: 1,
    eventId: String(input.eventId || ''),
    eventModeId: String(input.eventModeId || ''),
    eventName: String(input.eventName || ''),
    accountId: String(input.accountId || ''),
    userId: String(input.userId || ''),
    clientSessionId: input.clientSessionId || createClientUuid(),
    installationId: String(input.installationId || ''),
    session: input.session || null,
    version: input.version || null,
    config: input.version?.config || input.config || null,
    manifest: Array.isArray(input.manifest) ? input.manifest : [],
    localManifest: Array.isArray(input.localManifest) ? input.localManifest : [],
    stage: input.stage || MIRROR_RUNTIME_STAGES.PREPARING,
    activeRun: input.activeRun || null,
    completedRuns: Array.isArray(input.completedRuns) ? input.completedRuns : [],
    pendingSessionAction: input.pendingSessionAction || null,
    offlineSession: Boolean(input.offlineSession),
    cameraPosition: input.cameraPosition || 'front',
    updatedAt: new Date().toISOString(),
  };
}

export const GUEST_STAGE = Object.freeze({
  WELCOME: 'welcome', WAITING: 'waiting', BEFORE: 'beforeCountdown', COUNTDOWN: 'countdown',
  CAPTURE: 'capturing', REVIEW: 'photoReview', AFTER: 'afterCapture', PROCESS: 'processing', RESULT: 'delivery',
});

export const runtimeQuality = (quality) => ({ medium: 0.75, high: 0.92, superior: 1 }[quality] || 0.92);
export const selectedPhotos = (run) => (run?.captures || []).filter((photo) => photo.selected !== false && photo.localAvailable !== false);
export function nextMissingPhoto(config, run) {
  const present = new Set(selectedPhotos(run).map((photo) => Number(photo.photoNumber)));
  const order = config?.layout?.order || Array.from({ length: captureCount(config) }, (_, index) => index + 1);
  return order.find((number) => !present.has(Number(number))) || null;
}
export function recoverGuestStage(runtime) {
  if (!runtime?.activeRun) return GUEST_STAGE.WELCOME;
  if (runtime.activeRun.retakePhotoNumber) return GUEST_STAGE.WAITING;
  if (runtime.activeRun.output && runtime.activeRun.output.localAvailable !== false) return GUEST_STAGE.RESULT;
  return nextMissingPhoto(runtime.config, runtime.activeRun) ? GUEST_STAGE.WAITING : GUEST_STAGE.PROCESS;
}
export function chooseStageAnimation(runtime, stage, random = Math.random) {
  if (runtime?.config?.experience?.animationEnabledByStage?.[stage] !== true) return null;
  const videos = (runtime.localManifest || []).filter((item) => item.purpose === 'animation' && item.placement === stage);
  return videos.length ? videos[runtime.config.experience.randomByStage?.[stage] ? Math.floor(random() * videos.length) : 0] : null;
}

// A network response only contributes acknowledgements for matching file identities.
// It never owns selection, photo order, the active output, or the guest stage.
export function mergeRunAcknowledgements(current, remote) {
  if (!current || current.clientRunId !== remote?.clientRunId) return current;
  const captures = (current.captures || []).map((photo) => {
    const match = (remote.captures || []).find((item) => item.clientCaptureId === photo.clientCaptureId);
    return match ? { ...photo, serverId: match.serverId, syncStatus: match.syncStatus } : photo;
  });
  const sameOutput = current.output?.clientAssetId && current.output.clientAssetId === remote.output?.clientAssetId;
  return { ...current, serverId: remote.serverId || current.serverId, captures,
    output: sameOutput ? { ...current.output, ...remote.output } : current.output,
    syncStatus: sameOutput ? remote.syncStatus : current.syncStatus };
}

export function guestSequenceReducer(state, action) {
  switch (action.type) {
    case 'WAIT': return { stage: action.welcome ? GUEST_STAGE.WELCOME : GUEST_STAGE.WAITING, countdown: 0 };
    case 'BEGIN': return [GUEST_STAGE.WELCOME, GUEST_STAGE.WAITING].includes(state.stage) ? { stage: GUEST_STAGE.BEFORE, countdown: 0 } : state;
    case 'COUNT': return { stage: GUEST_STAGE.COUNTDOWN, countdown: action.seconds };
    case 'CAPTURE': return { stage: GUEST_STAGE.CAPTURE, countdown: 0 };
    case 'PHOTO': return { stage: GUEST_STAGE.REVIEW, countdown: 0 };
    case 'AFTER': return { stage: GUEST_STAGE.AFTER, countdown: 0 };
    case 'PROCESS': return { stage: GUEST_STAGE.PROCESS, countdown: 0 };
    case 'RESULT': return { stage: GUEST_STAGE.RESULT, countdown: 0 };
    default: return state;
  }
}

export function mirrorRuntimeReducer(state, action) {
  const updatedAt = new Date().toISOString();
  switch (action.type) {
    case 'PACKAGE_READY':
      return {
        ...state,
        session: action.payload.session,
        version: action.payload.version,
        config: action.payload.version?.config || state.config,
        manifest: action.payload.manifest || [],
        localManifest: action.payload.localManifest || [],
        stage: MIRROR_RUNTIME_STAGES.READY,
        updatedAt,
      };
    case 'SET_STAGE':
      return { ...state, stage: action.stage, updatedAt };
    case 'START_RUN':
      return { ...state, activeRun: action.run, stage: MIRROR_RUNTIME_STAGES.WELCOME, updatedAt };
    case 'UPDATE_RUN':
      return { ...state, activeRun: { ...state.activeRun, ...action.patch }, updatedAt };
    case 'COMPLETE_RUN':
      return {
        ...state,
        activeRun: null,
        completedRuns: [...state.completedRuns, action.run],
        stage: MIRROR_RUNTIME_STAGES.READY,
        updatedAt,
      };
    case 'SESSION_UPDATED':
      return { ...state, session: action.session, pendingSessionAction: null, updatedAt };
    case 'QUEUE_SESSION_ACTION':
      return { ...state, pendingSessionAction: action.value, updatedAt };
    case 'FAIL':
      return { ...state, stage: MIRROR_RUNTIME_STAGES.ERROR, errorCode: action.code || 'UNKNOWN', updatedAt };
    default:
      return state;
  }
}

export function runtimeResourceUrl(item) {
  const asset = item?.asset || {};
  return asset.fileSignedUrl
    || asset.variants?.full?.signedUrl
    || asset.variants?.card?.signedUrl
    || asset.fileUrl
    || '';
}

export function runtimeResourceHash(item) {
  const metadata = item?.asset?.metadata || {};
  return String(metadata.sha256 || metadata.contentHash || item?.asset?.sha256 || '').toLowerCase();
}

export function evaluateMirrorPreflight({ runtime, freeSpace = 0, cameraReady = false, cameraPermission = false }) {
  const config = runtime?.config;
  const requiredBytes = (runtime?.manifest || []).reduce((sum, item) => sum + Number(item?.asset?.sizeBytes || 0), 0);
  const checks = [
    { key: 'publication', ok: Boolean(runtime?.version?.id && config), labelKey: 'runtime_check_publication' },
    { key: 'resources', ok: (runtime?.manifest || []).length === (runtime?.localManifest || []).length && !(runtime?.localManifest || []).some((item) => item.localAvailable === false), labelKey: 'runtime_check_resources' },
    { key: 'cameraPermission', ok: cameraPermission, labelKey: 'runtime_check_permission' },
    { key: 'camera', ok: cameraReady, labelKey: 'runtime_check_camera' },
    { key: 'storage', ok: freeSpace > Math.max(requiredBytes * 2, 100 * 1024 * 1024), labelKey: 'runtime_check_storage' },
  ];
  return { ready: checks.every((check) => check.ok), checks };
}

export function captureCount(config) {
  return Math.max(1, Math.min(8, Number(config?.layout?.shotCount || config?.layout?.shots || config?.layout?.slots?.length || 1)));
}
