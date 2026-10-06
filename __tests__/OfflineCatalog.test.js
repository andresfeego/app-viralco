import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiRequest, configureHttpAuth } from '../src/services/api/http';
import { setOfflineUser, writeCatalog } from '../src/services/offlineCatalog';
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn(async () => {}), userErrorMessage: () => 'Error' }));
const original = global.fetch;
beforeEach(() => {
  const data = new Map();
  AsyncStorage.getItem.mockImplementation(async key => data.get(key) || null);
  AsyncStorage.setItem.mockImplementation(async (key, value) => { data.set(key, value); });
  AsyncStorage.removeItem.mockImplementation(async key => { data.delete(key); });
  setOfflineUser('1'); global.fetch = jest.fn();
  NetInfo.fetch.mockResolvedValue({ isConnected: false });
  configureHttpAuth({ getAccessToken: () => 'expired-but-offline', getRefreshToken: () => 'refresh', onTokensUpdated: jest.fn(), onSessionInvalid: jest.fn() });
});
afterEach(() => { setOfflineUser(null); global.fetch = original; });
it('loads accounts, events, detail and permissions without a single network request', async () => {
  for (const path of ['/api/accounts', '/api/events/accounts', '/api/accounts/2/events', '/api/events/3', '/api/permissions/me']) {
    await writeCatalog('1', path, { saved: path });
    expect(await apiRequest(path)).toEqual({ saved: path });
  }
  expect(global.fetch).not.toHaveBeenCalled();
});
it('does not reuse account-wide catalogs from before event-scoped membership', async () => {
  await AsyncStorage.setItem('@kaptura/catalog:v1:1:/api/accounts', JSON.stringify({ data: { accounts: ['retired'] } }));
  await expect(apiRequest('/api/accounts')).rejects.toThrow();
});
it('does not show another user catalog', async () => {
  await writeCatalog('1', '/api/accounts', { accounts: ['private'] });
  setOfflineUser('2');
  await expect(apiRequest('/api/accounts')).rejects.toThrow();
});
it('never falls back to saved authorization for operation-access', async () => {
  const path = '/api/events/2/modes/3/operation-access';
  await writeCatalog('1', path, { allowed: true });
  global.fetch.mockRejectedValue(new Error('offline'));
  await expect(apiRequest(path, {}, { requireOnline: true })).rejects.toThrow();
});
it('drops a cached response after a server access denial', async () => {
  await writeCatalog('1', '/api/events/3', { id: '3' });
  NetInfo.fetch.mockResolvedValue({ isConnected: true });
  global.fetch.mockResolvedValue({ ok: false, status: 403, headers: { get: () => 'application/json' }, json: async () => ({ error: 'Denied' }) });
  await expect(apiRequest('/api/events/3')).rejects.toMatchObject({ status: 403 });
  NetInfo.fetch.mockResolvedValue({ isConnected: false });
  await expect(apiRequest('/api/events/3')).rejects.toThrow();
});
