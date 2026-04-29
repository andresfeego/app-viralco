import { API_BASE_URL } from '../../config/api';

let getAccessToken = () => null;
let getRefreshToken = () => null;
let onTokensUpdated = async () => {};
let onSessionInvalid = async () => {};
let refreshInFlight = null;

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
    throw new Error('No refresh token available');
  }

  refreshInFlight = (async () => {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      throw new Error(`Refresh failed (${response.status})`);
    }

    const payload = await response.json();
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
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (auth) {
    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('No access token');
    }
    headers.Authorization = `Bearer ${accessToken}`;
  }

  if (superAdminConfirmationToken) {
    headers['x-super-admin-confirmation'] = `Bearer ${superAdminConfirmationToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && auth && retry) {
    try {
      await tryRefresh();
      return apiRequest(path, options, { ...meta, retry: false });
    } catch (error) {
      await onSessionInvalid();
      throw error;
    }
  }

  const isJson = (response.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.error || `Request failed (${response.status})`;
    const err = new Error(message);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}
