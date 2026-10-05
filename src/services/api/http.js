import { API_BASE_URL } from '../../config/api';
import { billingLiveHeaders } from '../offlineBillingGrant';
import { recordClientTechnicalError, userErrorMessage } from '../errorHandling';
import { cacheablePath, networkAvailable, offlineIdentity, sameOfflineIdentity, readCatalog, writeCatalog, removeCatalog } from '../offlineCatalog';

let getAccessToken = () => null;
let getRefreshToken = () => null;
let onTokensUpdated = async () => {};
let onSessionInvalid = async () => {};
let refreshInFlight = null;

export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener?.('abort', abort);
  let timer;
  try {
    if (options.signal?.aborted) controller.abort();
    return await Promise.race([
      fetch(url, { ...options, signal: controller.signal }),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('Request timeout')); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); options.signal?.removeEventListener?.('abort', abort); }
}

function createClientErrorId() {
  return `client-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status || 0;
    this.payload = options.payload || null;
    this.code = options.code || 'API_ERROR';
    this.requestId = options.requestId || '';
    this.clientErrorId = options.clientErrorId || createClientErrorId();
  }
}

function buildApiError({ payload, status = 0, detail, method, path }) {
  const code = String(payload?.code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'));
  const requestId = String(payload?.requestId || '');
  const clientErrorId = createClientErrorId();
  const message = userErrorMessage({ message: payload?.error, code });
  recordClientTechnicalError({ clientErrorId, requestId, code, status, method, path, detail: detail || payload?.error || message }).catch(() => {});
  return new ApiError(message, { status, payload, code, requestId, clientErrorId });
}

async function parseJsonResponse(response) {
  if (!(response.headers.get('content-type') || '').includes('application/json')) return null;
  let timer;
  try {
    return await Promise.race([response.json(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Response body timeout')), 10000); })]);
  } catch (error) {
    throw buildApiError({ status: response.status, payload: { code: 'INVALID_JSON_RESPONSE' }, detail: error?.message, method: 'UNKNOWN', path: '' });
  } finally { clearTimeout(timer); }
}

export function configureHttpAuth(config) {
  getAccessToken = config.getAccessToken;
  getRefreshToken = config.getRefreshToken;
  onTokensUpdated = config.onTokensUpdated;
  onSessionInvalid = config.onSessionInvalid;
}

async function tryRefresh() {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw buildApiError({ detail: 'No refresh token available', method: 'POST', path: '/api/auth/refresh' });
  }

  refreshInFlight = (async () => {
    let response;
    try {
      response = await fetchWithTimeout(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (error) {
      throw buildApiError({ detail: error?.message, method: 'POST', path: '/api/auth/refresh' });
    }

    if (!response.ok) {
      const payload = await parseJsonResponse(response);
      throw buildApiError({ payload, status: response.status, detail: payload?.error, method: 'POST', path: '/api/auth/refresh' });
    }

    const payload = await parseJsonResponse(response);
    if (getRefreshToken() !== refreshToken) throw buildApiError({ detail: 'Session changed during refresh', method: 'POST', path: '/api/auth/refresh' });
    await onTokensUpdated(payload.accessToken, payload.refreshToken);
    return payload;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function apiRequest(path, options = {}, meta = {}) {
  const identity = offlineIdentity();
  const cachedRead = !meta.requireOnline && identity.subject && (options.method || 'GET') === 'GET' && cacheablePath(path);
  if (cachedRead && !(await networkAvailable())) {
    const cached = await readCatalog(identity.subject, path);
    if (cached && sameOfflineIdentity(identity)) return cached.data;
    throw buildApiError({ detail: 'Offline catalog unavailable', method: 'GET', path });
  }
  const { auth = true, retry = true, superAdminConfirmationToken = null } = meta;
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  if (auth) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw buildApiError({ detail: 'No access token', method: options.method || 'GET', path });
    }
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (superAdminConfirmationToken) {
    headers['x-super-admin-confirmation'] = `Bearer ${superAdminConfirmationToken}`;
  }

  Object.assign(headers, billingLiveHeaders(path));

  let response;
  try {
    response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    }, meta.timeoutMs || 10000);
  } catch (error) {
    if (cachedRead && sameOfflineIdentity(identity)) {
      const cached = await readCatalog(identity.subject, path);
      if (cached) return cached.data;
    }
    throw buildApiError({ detail: error?.message, method: options.method || 'GET', path });
  }

  if (response.status === 401 && auth && retry) {
    try {
      await tryRefresh();
      return apiRequest(path, options, { ...meta, retry: false });
    } catch (error) {
      if ([401, 403].includes(error.status) && sameOfflineIdentity(identity)) await onSessionInvalid();
      if (!error.status && cachedRead && sameOfflineIdentity(identity)) {
        const cached = await readCatalog(identity.subject, path);
        if (cached) return cached.data;
      }
      throw error;
    }
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    if (cachedRead && [401, 403, 404].includes(response.status)) await removeCatalog(identity.subject, path);
    if (cachedRead && response.status >= 500 && sameOfflineIdentity(identity)) {
      const cached = await readCatalog(identity.subject, path);
      if (cached) return cached.data;
    }
    throw buildApiError({ payload, status: response.status, detail: payload?.error || `Request failed (${response.status})`, method: options.method || 'GET', path });
  }

  if (cachedRead && sameOfflineIdentity(identity)) await writeCatalog(identity.subject, path, payload);
  return payload;
}
