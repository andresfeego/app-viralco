import { apiRequest } from './http';

export function registerApi(input) {
  return apiRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  }, { auth: false });
}

export function loginApi(input) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  }, { auth: false });
}

export function logoutApi(refreshToken) {
  return apiRequest('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function forgotPasswordApi(input) {
  return apiRequest('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(input),
  }, { auth: false });
}

export function resetPasswordApi(input) {
  return apiRequest('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  }, { auth: false });
}

export function meApi() {
  return apiRequest('/api/auth/me', { method: 'GET' });
}

export function updateMyThemeApi(themeMode) {
  return apiRequest('/api/auth/me/theme', {
    method: 'PATCH',
    body: JSON.stringify({ themeMode }),
  });
}
