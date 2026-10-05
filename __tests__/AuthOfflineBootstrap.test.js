import React from 'react';
import renderer, { act } from 'react-test-renderer';
import NetInfo from '@react-native-community/netinfo';
import { AuthProvider, useAuthContext } from '../src/providers/AuthProvider';
import * as secure from '../src/services/secureSession';
import * as auth from '../src/services/api/auth';
jest.mock('../src/services/secureSession', () => ({ loadSecureSession: jest.fn(), saveSecureSession: jest.fn(async () => {}), clearSecureSession: jest.fn(async () => {}) }));
jest.mock('../src/services/api/auth', () => ({ meApi: jest.fn(), logoutApi: jest.fn(async () => {}), loginApi: jest.fn() }));
jest.mock('../src/services/api/admin', () => ({ confirmSuperAdminPasswordApi: jest.fn() }));
jest.mock('../src/services/primeOfflineCatalog', () => ({ primeOfflineCatalog: jest.fn(async () => {}) }));
const profile = { id: '1', status: { slug: 'active' }, accounts: [{ account: { id: '2' }, role: { slug: 'operator' }, status: 'active' }] };
let value; let tree; let reconnect;
function Consumer() { value = useAuthContext(); return null; }
beforeEach(() => {
  jest.clearAllMocks();
  secure.loadSecureSession.mockResolvedValue({ accessToken: 'expired', refreshToken: 'saved', user: profile });
  NetInfo.fetch.mockResolvedValue({ isConnected: false });
  NetInfo.addEventListener.mockImplementation(callback => { reconnect = callback; return () => {}; });
  auth.meApi.mockResolvedValue(profile);
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); });
it('boots after a cold start offline using the saved profile, without waiting for me', async () => {
  await act(async () => { tree = renderer.create(<AuthProvider><Consumer /></AuthProvider>); });
  expect(value.initializing).toBe(false);
  expect(value.isAuthenticated).toBe(true);
  expect(value.offlineMode).toBe(true);
  expect(value.user.accounts).toEqual(profile.accounts);
  expect(auth.meApi).not.toHaveBeenCalled();
  expect(secure.clearSecureSession).not.toHaveBeenCalled();
});
it('keeps the local session if reconnection fails', async () => {
  await act(async () => { tree = renderer.create(<AuthProvider><Consumer /></AuthProvider>); });
  NetInfo.fetch.mockResolvedValue({ isConnected: true });
  auth.meApi.mockRejectedValue({ status: 0, message: 'timeout' });
  await act(async () => reconnect({ isConnected: true }));
  expect(value.isAuthenticated).toBe(true);
  expect(secure.clearSecureSession).not.toHaveBeenCalled();
});
it('clears local access on a confirmed session revocation', async () => {
  await act(async () => { tree = renderer.create(<AuthProvider><Consumer /></AuthProvider>); });
  NetInfo.fetch.mockResolvedValue({ isConnected: true });
  auth.meApi.mockRejectedValue({ status: 401, message: 'revoked' });
  await act(async () => reconnect({ isConnected: true }));
  expect(value.isAuthenticated).toBe(false);
  expect(secure.clearSecureSession).toHaveBeenCalledTimes(1);
});
it('logs out locally even if the server is unreachable', async () => {
  await act(async () => { tree = renderer.create(<AuthProvider><Consumer /></AuthProvider>); });
  auth.logoutApi.mockRejectedValue(new Error('offline'));
  await act(async () => value.logout());
  expect(value.isAuthenticated).toBe(false);
  expect(secure.clearSecureSession).toHaveBeenCalled();
});
