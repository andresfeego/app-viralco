import { apiRequest } from './http';

export function myPermissionsApi() {
  return apiRequest('/api/permissions/me', { method: 'GET' });
}
