import { apiRequest } from './http';

export function listEventsApi(accountId) {
  return apiRequest(`/api/accounts/${accountId}/events`, { method: 'GET' });
}

export function listEventTypesApi() {
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

export function listAccountLibraryApi(accountId) {
  return apiRequest(`/api/accounts/${accountId}/library`, { method: 'GET' });
}

export function prepareAccountLibraryUploadApi(accountId, input) {
  return apiRequest(`/api/accounts/${accountId}/library/uploads`, { method: 'POST', body: JSON.stringify(input) });
}

export function createAccountLibraryAssetApi(accountId, input) {
  return apiRequest(`/api/accounts/${accountId}/library/assets`, { method: 'POST', body: JSON.stringify(input) });
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

export async function uploadFileToPreparedUrl(uploadUrl, file) {
  const response = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file.blob || file });
  if (!response.ok) throw new Error(`Upload failed (${response.status})`);
}
