import { apiRequest } from './http';
export const billingRequest = (path, method = 'GET', body) => apiRequest(`/api/billing${path}`, {
  method, ...(body === undefined ? {} : { body: body instanceof FormData ? body : JSON.stringify(body) }),
}, { requireOnline: true, timeoutMs: 30000 });
