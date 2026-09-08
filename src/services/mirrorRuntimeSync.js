import NetInfo from '@react-native-community/netinfo';
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
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

async function syncCapture(context, serverRun, capture) {
  if (capture.syncStatus === LOCAL_SYNC_STATUSES.SYNCED) return capture;
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
    await uploadFileToPreparedUrl(prepared.upload.uploadUrl, { uri: capture.uri, type: capture.mimeType }, null, prepared.upload.requiredHeaders);
    await completeMagicMirrorCaptureApi(context.eventId, context.eventModeId, context.session.id, serverRun.id, prepared.capture.id);
  }
  return { ...capture, serverId: prepared.capture.id, syncStatus: LOCAL_SYNC_STATUSES.SYNCED };
}

export async function syncMirrorRun(context, run, onUpdate = () => {}) {
  if (!(await isMirrorRuntimeOnline())) return run;
  const serverPayload = await createMagicMirrorRunApi(context.eventId, context.eventModeId, context.session.id, {
    clientRunId: run.clientRunId,
    startedAt: run.startedAt,
    metadata: run.metadata || null,
  });
  let next = { ...run, serverId: serverPayload.run.id, syncStatus: LOCAL_SYNC_STATUSES.SYNCING };
  onUpdate(next);
  const captures = [];
  for (const capture of next.captures || []) {
    captures.push(await syncCapture(context, serverPayload.run, capture));
    next = { ...next, captures };
    onUpdate(next);
  }
  if (!next.output) {
    return { ...next, syncStatus: LOCAL_SYNC_STATUSES.PENDING };
  }
  await updateMagicMirrorRunApi(context.eventId, context.eventModeId, context.session.id, serverPayload.run.id, { status: 'processing' });
  const prepared = await prepareMagicMirrorAssetApi(context.eventId, context.eventModeId, context.session.id, serverPayload.run.id, {
    clientAssetId: next.output.clientAssetId,
    contentType: next.output.mimeType,
    sizeBytes: next.output.sizeBytes,
    sha256: next.output.sha256,
    eventResourceIds: context.localManifest.map((item) => item.eventResourceId),
    metadata: { localCreatedAt: next.output.createdAt },
  });
  if (prepared.upload) {
    await uploadFileToPreparedUrl(prepared.upload.uploadUrl, { uri: next.output.uri, type: next.output.mimeType }, null, prepared.upload.requiredHeaders);
  }
  const completed = await completeMagicMirrorAssetApi(context.eventId, context.eventModeId, context.session.id, serverPayload.run.id, prepared.asset.id);
  next = {
    ...next,
    syncStatus: LOCAL_SYNC_STATUSES.SYNCED,
    output: { ...next.output, serverId: completed.asset.id, publicHash: completed.asset.publicHash, downloadUrl: completed.downloadUrl, syncStatus: LOCAL_SYNC_STATUSES.SYNCED },
  };
  onUpdate(next);
  return next;
}

export function subscribeMirrorConnectivity(callback) {
  return NetInfo.addEventListener((state) => callback(Boolean(state.isConnected && state.isInternetReachable !== false)));
}
