import { apiRequest } from './http';

export function confirmSuperAdminPasswordApi(password) {
  return apiRequest('/api/admin/confirm-password', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function listAdminUsersApi() {
  return apiRequest('/api/admin/users', { method: 'GET' });
}

export function listBitacoraApi({ page = 1, pageSize = 30, startDate = '', endDate = '' } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (startDate) {
    params.set('startDate', startDate);
  }
  if (endDate) {
    params.set('endDate', endDate);
  }
  return apiRequest(`/api/admin/bitacora?${params.toString()}`, { method: 'GET' });
}

export function createAdminUserApi(input) {
  return apiRequest('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function activateUserApi(userId) {
  return apiRequest(
    `/api/admin/users/${userId}/activate`,
    { method: 'PATCH' }
  );
}

export function deactivateUserApi(userId) {
  return apiRequest(
    `/api/admin/users/${userId}/deactivate`,
    { method: 'PATCH' }
  );
}

export function updateUserStatusApi(userId, statusSlug) {
  return apiRequest(`/api/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ statusSlug }),
  });
}

export function createAccountApi(input) {
  return apiRequest('/api/admin/accounts', { method: 'POST', body: JSON.stringify(input) });
}

export function updateAccountStatusApi(accountId, status) {
  return apiRequest(`/api/admin/accounts/${accountId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
