import { fetchWithTimeout, apiRequest, configureHttpAuth } from '../src/services/api/http';
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn(async () => {}), userErrorMessage: () => 'Error' }));
const originalFetch = global.fetch;
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); global.fetch = originalFetch; });
it('finishes a stalled request even when the native fetch ignores abort', async () => {
  global.fetch = jest.fn(() => new Promise(() => {}));
  const result = fetchWithTimeout('https://example.test', {}, 100);
  const assertion = expect(result).rejects.toThrow('Request timeout');
  await jest.advanceTimersByTimeAsync(100);
  await assertion;
  expect(global.fetch.mock.calls[0][1].signal.aborted).toBe(true);
});
it('does not log out the operator when the network disappears while refreshing a token', async () => {
  const invalid = jest.fn();
  configureHttpAuth({ getAccessToken: () => 'old', getRefreshToken: () => 'refresh', onTokensUpdated: jest.fn(), onSessionInvalid: invalid });
  global.fetch = jest.fn().mockResolvedValueOnce({ status: 401 }).mockRejectedValueOnce(new Error('network unavailable'));
  await expect(apiRequest('/test')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  expect(invalid).not.toHaveBeenCalled();
});
