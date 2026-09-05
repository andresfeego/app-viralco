jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

import { apiRequest, ApiError } from '../src/services/api/http';

function response(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: jest.fn(() => Promise.resolve(payload)),
  };
}

afterEach(() => jest.restoreAllMocks());

test('does not expose a legacy raw SQL backend response', async () => {
  global.fetch = jest.fn(() => Promise.resolve(response(500, { error: 'Failed query: select `id` from `users`', requestId: 'request-1' }))) as jest.Mock;
  await expect(apiRequest('/api/auth/login', { method: 'POST' }, { auth: false })).rejects.toEqual(expect.objectContaining({
    name: 'ApiError',
    message: 'No pudimos completar la solicitud. Intenta nuevamente.',
    requestId: 'request-1',
  }));
});

test('preserves safe backend validation while retaining correlation metadata', async () => {
  global.fetch = jest.fn(() => Promise.resolve(response(401, { error: 'Credenciales invalidas', code: 'REQUEST_REJECTED', requestId: 'request-2' }))) as jest.Mock;
  try {
    await apiRequest('/api/auth/login', { method: 'POST' }, { auth: false });
    throw new Error('Expected request to fail');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toEqual(expect.objectContaining({ message: 'Credenciales invalidas', status: 401, requestId: 'request-2' }));
  }
});

test('normalizes transport failures', async () => {
  global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed'))) as jest.Mock;
  await expect(apiRequest('/api/accounts', { method: 'GET' }, { auth: false })).rejects.toEqual(expect.objectContaining({
    name: 'ApiError',
    message: 'No pudimos completar la solicitud. Intenta nuevamente.',
    code: 'NETWORK_ERROR',
  }));
});
