import NetInfo from '@react-native-community/netinfo';
import { authorizeMirrorOperation } from './mirrorOperationAccess';
import { registerOfflineMirrorSessionApi } from './api/events';
import {
  completeMagicMirrorAssetApi,
  completeMagicMirrorCaptureApi,
  createMagicMirrorRunApi,
  prepareMagicMirrorAssetApi,
  prepareMagicMirrorCaptureApi,
  updateMagicMirrorRunApi,
  uploadFileToPreparedUrl,
} from './api/events';
import { LOCAL_SYNC_STATUSES } from '../domain/mirrorRuntime';

export async function isMirrorRuntimeOnline() {
  let timer;
  try {
    const state = await Promise.race([NetInfo.fetch(), new Promise(resolve => { timer = setTimeout(() => resolve(null), 3000); })]);
    return Boolean(state?.isConnected && state.isInternetReachable !== false);
  } finally { clearTimeout(timer); }
}

async function syncCapture(context, serverRun, capture, onProgress) {
  if (capture.syncStatus === LOCAL_SYNC_STATUSES.SYNCED) return capture;
  if (capture.localAvailable === false) throw new Error('MIRROR_CAPTURE_FILE_UNAVAILABLE');
  const prepared = await prepareMagicMirrorCaptureApi(context.eventId, context.eventModeId, context.session.id, serverRun.id, {
    clientCaptureId: capture.clientCaptureId,
    photoNumber: capture.photoNumber,
    attempt: capture.attempt,
    contentType: capture.mimeType,
    sizeBytes: capture.sizeBytes,
    sha256: capture.sha256,
    capturedAt: capture.capturedAt,
  });
  if (prepared.upload) {
    await authorizeMirrorOperation(context);
    await uploadFileToPreparedUrl(prepared.upload.uploadUrl, { uri: capture.uri, type: capture.mimeType }, onProgress, prepared.upload.requiredHeaders);
    await completeMagicMirrorCaptureApi(context.eventId, context.eventModeId, context.session.id, serverRun.id, prepared.capture.id);
  }
  return { ...capture, serverId: prepared.capture.id, syncStatus: LOCAL_SYNC_STATUSES.SYNCED };
}

export async function syncMirrorRun(context, run, onUpdate = () => {}, onProgress = () => {}) {
  context = { ...context, runStartedAt: run.startedAt };
  if (!(await isMirrorRuntimeOnline())) return run;
  if (run.syncStatus === LOCAL_SYNC_STATUSES.SYNCED && run.output?.publicUrl) return run;
  await authorizeMirrorOperation(context);
  if (context.offlineSession) {
    const { session } = await registerOfflineMirrorSessionApi(context.eventId, context.eventModeId, {
      clientSessionId: context.clientSessionId, deviceInstallationId: context.installationId,
      configVersionId: context.version.id, startedAt: context.session.startedAt, through: run.startedAt,
    });
    context = { ...context, session };
  }
  const serverPayload = await createMagicMirrorRunApi(context.eventId, context.eventModeId, context.session.id, {
    clientRunId: run.clientRunId,
    startedAt: run.startedAt,
    metadata: run.metadata || null,
  });
  let next = { ...run, serverId: serverPayload.run.id, syncStatus: LOCAL_SYNC_STATUSES.SYNCING };
  onUpdate(next);
  const captures = [];
  const pending = (context.config?.capture?.preserveOriginals === false ? [] : next.captures || []).filter((item) => item.syncStatus !== LOCAL_SYNC_STATUSES.SYNCED);
  const total = pending.reduce((sum, item) => sum + Number(item.sizeBytes || 1), Number(next.output?.sizeBytes || 1));
  let sent = 0;
  const progress = (size, percent, stage) => onProgress({ stage, percent: Math.min(99, Math.floor((sent + size * percent / 100) / total * 100)) });
  onProgress({ stage: 'uploading', percent: 0 });
  if (!next.output) {
    return { ...next, syncStatus: LOCAL_SYNC_STATUSES.PENDING };
  }
  if (next.output.localAvailable === false) throw new Error('MIRROR_OUTPUT_FILE_UNAVAILABLE');
  if (next.output.syncStatus !== LOCAL_SYNC_STATUSES.SYNCED || !next.output.publicUrl) {
  if (next.output.syncStatus !== LOCAL_SYNC_STATUSES.SYNCED) await updateMagicMirrorRunApi(context.eventId, context.eventModeId, context.session.id, serverPayload.run.id, { status: 'processing' });
  const prepared = await prepareMagicMirrorAssetApi(context.eventId, context.eventModeId, context.session.id, serverPayload.run.id, {
    clientAssetId: next.output.clientAssetId,
    contentType: next.output.mimeType,
    sizeBytes: next.output.sizeBytes,
    sha256: next.output.sha256,
    eventResourceIds: context.localManifest.map((item) => item.eventResourceId),
    metadata: { localCreatedAt: next.output.createdAt },
  });
  if (prepared.upload) {
    await authorizeMirrorOperation(context);
    await uploadFileToPreparedUrl(prepared.upload.uploadUrl, { uri: next.output.uri, type: next.output.mimeType }, (percent) => progress(Number(next.output.sizeBytes || 1), percent, 'uploading'), prepared.upload.requiredHeaders);
  }
  progress(Number(next.output.sizeBytes || 1), 100, 'confirming');
  const completed = await completeMagicMirrorAssetApi(context.eventId, context.eventModeId, context.session.id, serverPayload.run.id, prepared.asset.id);
  next = {
    ...next,
    syncStatus: LOCAL_SYNC_STATUSES.PENDING,
    output: { ...next.output, serverId: completed.asset.id, publicHash: completed.asset.publicHash, publicUrl: completed.publicUrl, downloadUrl: completed.downloadUrl, syncStatus: LOCAL_SYNC_STATUSES.SYNCED },
  };
  onUpdate(next);
  }
  sent += Number(next.output.sizeBytes || 1);
  for (const capture of context.config?.capture?.preserveOriginals === false ? [] : next.captures || []) {
    captures.push(await syncCapture(context, serverPayload.run, capture, (percent) => progress(Number(capture.sizeBytes || 1), percent, 'originals')));
    if (capture.syncStatus !== LOCAL_SYNC_STATUSES.SYNCED) sent += Number(capture.sizeBytes || 1);
    next = { ...next, captures: next.captures.map((item) => captures.find((saved) => saved.clientCaptureId === item.clientCaptureId) || item) };
    onUpdate(next);
  }
  next = { ...next, syncStatus: LOCAL_SYNC_STATUSES.SYNCED };
  onUpdate(next);
  onProgress({ stage: 'synced', percent: 100 });
  try {
    const { syncCompositionArchives } = require('./mirrorLocalGallery');
    await syncCompositionArchives(context.eventId, [context.eventModeId]);
  } catch (error) {
    const { recordClientTechnicalError } = require('./errorHandling');
    recordClientTechnicalError({ code: 'MIRROR_ARCHIVE_SYNC_PENDING', detail: error.message });
  }
  return next;
}

export function subscribeMirrorConnectivity(callback) {
  return NetInfo.addEventListener((state) => callback(Boolean(state.isConnected && state.isInternetReachable !== false)));
}
