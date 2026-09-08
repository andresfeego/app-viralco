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
    updatedAt: new Date().toISOString(),
  };
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
    { key: 'resources', ok: (runtime?.manifest || []).length === (runtime?.localManifest || []).length, labelKey: 'runtime_check_resources' },
    { key: 'cameraPermission', ok: cameraPermission, labelKey: 'runtime_check_permission' },
    { key: 'camera', ok: cameraReady, labelKey: 'runtime_check_camera' },
    { key: 'storage', ok: freeSpace > Math.max(requiredBytes * 2, 100 * 1024 * 1024), labelKey: 'runtime_check_storage' },
  ];
  return { ready: checks.every((check) => check.ok), checks };
}

export function captureCount(config) {
  return Math.max(1, Math.min(8, Number(config?.layout?.shotCount || config?.layout?.shots || config?.layout?.slots?.length || 1)));
}
