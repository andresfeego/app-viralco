import { apiRequest } from './http';

export const listAccountsApi = () => apiRequest('/api/accounts', { method: 'GET' });
export const getAccountApi = (accountId) => apiRequest(`/api/accounts/${accountId}`, { method: 'GET' });
export const updateAccountApi = (accountId, input) => apiRequest(`/api/accounts/${accountId}`, { method: 'PATCH', body: JSON.stringify(input) });
export const deleteAccountApi = (accountId, confirmationName) => apiRequest(`/api/accounts/${accountId}`, { method: 'DELETE', body: JSON.stringify({ confirmationName }) });
export const prepareAccountLibraryUploadApi = (accountId, input) => apiRequest(`/api/accounts/${accountId}/library/uploads`, { method: 'POST', body: JSON.stringify(input) });
export const createAccountLibraryAssetApi = (accountId, input) => apiRequest(`/api/accounts/${accountId}/library/assets`, { method: 'POST', body: JSON.stringify(input) });
export const getAccountMembersApi = (accountId) => apiRequest(`/api/accounts/${accountId}/members`, { method: 'GET' });
export const addAccountMemberApi = (accountId, input) => apiRequest(`/api/accounts/${accountId}/members`, { method: 'POST', body: JSON.stringify(input) });
export const updateAccountMemberApi = (accountId, membershipId, input) => apiRequest(`/api/accounts/${accountId}/members/${membershipId}`, { method: 'PATCH', body: JSON.stringify(input) });
export const removeAccountMemberApi = (accountId, membershipId) => apiRequest(`/api/accounts/${accountId}/members/${membershipId}`, { method: 'DELETE' });

export const createAccountApi = (input) => apiRequest('/api/accounts', { method: 'POST', body: JSON.stringify(input) });

function normalizeUploadUri(value) {
  const uri = String(value || '');
  if (!uri) return '';
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  return `file://${uri}`;
}

export async function createAccountLogoAssetApi(accountId, image) {
  const contentType = image.type || image.contentType || 'image/heic';
  const fileName = image.fileName || image.name || 'logo';
  const body = new FormData();
  body.append('purpose', 'logo');
  body.append('name', fileName);
  body.append('file', { uri: normalizeUploadUri(image.uri), type: contentType, name: fileName });
  const payload = await apiRequest(`/api/accounts/${accountId}/library/image-upload`, { method: 'POST', body });
  return payload?.asset || null;
}
