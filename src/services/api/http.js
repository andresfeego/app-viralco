import { API_BASE_URL } from '../../config/api';
import { recordClientTechnicalError, userErrorMessage } from '../errorHandling';

let getAccessToken = () => null;
let getRefreshToken = () => null;
let onTokensUpdated = async () => {};
let onSessionInvalid = async () => {};
let refreshInFlight = null;

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
  try {
    return await response.json();
  } catch (error) {
    throw buildApiError({ status: response.status, payload: { code: 'INVALID_JSON_RESPONSE' }, detail: error?.message, method: 'UNKNOWN', path: '' });
  }
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
      response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    throw buildApiError({ detail: error?.message, method: options.method || 'GET', path });
  }

  if (response.status === 401 && auth && retry) {
    try {
      await tryRefresh();
      return apiRequest(path, options, { ...meta, retry: false });
    } catch (error) {
      await onSessionInvalid();
      throw error;
    }
  }

  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw buildApiError({ payload, status: response.status, detail: payload?.error || `Request failed (${response.status})`, method: options.method || 'GET', path });
  }

  return payload;
}
