import { apiRequest } from './http';

export const listAccountsApi = () => apiRequest('/api/accounts', { method: 'GET' });
export const getAccountMembersApi = (accountId) => apiRequest(`/api/accounts/${accountId}/members`, { method: 'GET' });
export const addAccountMemberApi = (accountId, input) => apiRequest(`/api/accounts/${accountId}/members`, { method: 'POST', body: JSON.stringify(input) });
export const updateAccountMemberApi = (accountId, membershipId, input) => apiRequest(`/api/accounts/${accountId}/members/${membershipId}`, { method: 'PATCH', body: JSON.stringify(input) });
export const removeAccountMemberApi = (accountId, membershipId) => apiRequest(`/api/accounts/${accountId}/members/${membershipId}`, { method: 'DELETE' });
