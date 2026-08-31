import { apiRequest } from './http';

export function listEventsApi(accountId) {
  return apiRequest(`/api/accounts/${accountId}/events`, { method: 'GET' });
}

export function listEventTypesApi() {
  return apiRequest('/api/events/types', { method: 'GET' });
}

export function listEventModesApi() {
  return apiRequest('/api/events/modes', { method: 'GET' });
}

export function getEventDetailApi(eventId) {
  return apiRequest(`/api/events/${eventId}`, { method: 'GET' });
}

export function createEventApi(accountId, input) {
  return apiRequest(`/api/accounts/${accountId}/events`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateEventApi(eventId, input) {
  return apiRequest(`/api/events/${eventId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function updateEventBrandingApi(eventId, input) {
  return apiRequest(`/api/events/${eventId}/branding`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function listLibraryAssetsApi(accountId) {
  const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : '';
  return apiRequest(`/api/library/assets${query}`, { method: 'GET' });
}

export function listAccountLibraryApi(accountId, filters = {}) {
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiRequest(`/api/accounts/${accountId}/library${suffix}`, { method: 'GET' });
}

export function updateAccountLibraryFavoriteApi(accountId, libraryAssetId, isFavorite) {
  return apiRequest(`/api/accounts/${accountId}/library/${libraryAssetId}/favorite`, { method: 'PATCH', body: JSON.stringify({ isFavorite }) });
}

export function prepareAccountLibraryUploadApi(accountId, input) {
  return apiRequest(`/api/accounts/${accountId}/library/uploads`, { method: 'POST', body: JSON.stringify(input) });
}

export function createAccountLibraryAssetApi(accountId, input) {
  return apiRequest(`/api/accounts/${accountId}/library/assets`, { method: 'POST', body: JSON.stringify(input) });
}

function normalizeUploadUri(value) {
  const uri = String(value || '');
  if (!uri) return '';
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  return `file://${uri}`;
}

export async function createProcessedAccountImageAssetApi(accountId, image, purpose) {
  const fileName = image.fileName || image.name || `${purpose}.jpg`;
  const body = new FormData();
  body.append('purpose', purpose);
  body.append('name', fileName);
  body.append('file', { uri: normalizeUploadUri(image.uri), type: image.type || image.contentType || 'image/jpeg', name: fileName });
  const payload = await apiRequest(`/api/accounts/${accountId}/library/image-upload`, { method: 'POST', body });
  return payload?.asset || null;
}

export function addAccountLibraryAssetApi(accountId, input) {
  return apiRequest(`/api/accounts/${accountId}/library`, { method: 'POST', body: JSON.stringify(input) });
}

export function cloneAccountLibraryAssetApi(accountId, libraryAssetId, input) {
  return apiRequest(`/api/accounts/${accountId}/library/${libraryAssetId}/clone`, { method: 'POST', body: JSON.stringify(input) });
}

export function listEventResourcesApi(eventId) {
  return apiRequest(`/api/events/${eventId}/resources`, { method: 'GET' });
}

export function createEventResourceApi(eventId, input) {
  return apiRequest(`/api/events/${eventId}/resources`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateEventResourceApi(eventId, resourceId, input) {
  return apiRequest(`/api/events/${eventId}/resources/${resourceId}`, { method: 'PATCH', body: JSON.stringify(input) });
}

export function deleteEventResourceApi(eventId, resourceId) {
  return apiRequest(`/api/events/${eventId}/resources/${resourceId}`, { method: 'DELETE' });
}

export async function uploadFileToPreparedUrl(uploadUrl, file, onProgress = null) {
  const body = file.blob || (file.uri ? await fetch(file.uri).then((response) => response.blob()) : file);
  await new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error('Upload failed'));
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error(`Upload failed (${request.status})`));
    request.send(body);
  });
}

export async function uploadAccountLibraryFileApi(accountId, file, purpose, onProgress = null) {
  if (String(file.type || '').startsWith('image/') && file.type !== 'image/gif') {
    onProgress?.(5);
    const asset = await createProcessedAccountImageAssetApi(accountId, file, purpose);
    onProgress?.(100);
    return asset;
  }
  const prepared = await prepareAccountLibraryUploadApi(accountId, {
    purpose,
    fileName: file.fileName,
    contentType: file.type,
    sizeBytes: file.fileSize,
  });
  await uploadFileToPreparedUrl(prepared.uploadUrl, file, onProgress);
  const payload = await createAccountLibraryAssetApi(accountId, {
    name: file.fileName,
    purpose,
    type: purpose,
    key: prepared.key,
    fileUrl: prepared.fileUrl,
    mimeType: file.type,
    sizeBytes: file.fileSize,
    metadata: { mirrorCompatible: true },
  });
  return payload?.asset || null;
}

export function getMagicMirrorConfigApi(eventId, eventModeId) {
  return apiRequest(`/api/events/${eventId}/modes/${eventModeId}/config`, { method: 'GET' });
}

export function saveMagicMirrorConfigApi(eventId, eventModeId, input) {
  return apiRequest(`/api/events/${eventId}/modes/${eventModeId}/config`, { method: 'PUT', body: JSON.stringify(input) });
}

export function validateMagicMirrorConfigApi(eventId, eventModeId, input) {
  return apiRequest(`/api/events/${eventId}/modes/${eventModeId}/config/validate`, { method: 'POST', body: JSON.stringify(input) });
}

export function publishMagicMirrorConfigApi(eventId, eventModeId, expectedRevision) {
  return apiRequest(`/api/events/${eventId}/modes/${eventModeId}/config/publish`, { method: 'POST', body: JSON.stringify({ expectedRevision }) });
}
