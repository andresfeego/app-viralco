import { resolveApiBaseUrl } from '../src/config/resolveApiBaseUrl';
const { transformSync } = require('@babel/core');
const { readPublicEnv, inlinePublicEnv } = require('../scripts/public-env.cjs');

jest.mock('node:fs', () => ({ existsSync: jest.fn(), readFileSync: jest.fn() }));
const fs = require('node:fs');
beforeEach(() => jest.resetAllMocks());

it.each([
  ['ios', 'http://192.0.2.7:8081/index.bundle', true, 'http://192.0.2.7:4000'],
  ['ios', 'http://partners-mac.local:8081/index.bundle', true, 'http://partners-mac.local:4000'],
  ['ios', 'http://[::1]:8081/index.bundle', true, 'http://[::1]:4000'],
  ['ios', 'file:///bundle.js', false, 'http://localhost:4000'],
  ['android', undefined, true, 'http://10.0.2.2:4000'],
])('resolves a portable backend for %s %s', (platform, scriptURL, development, expected) => {
  expect(resolveApiBaseUrl({ platform, scriptURL, development })).toBe(expected);
});

it('prefers the supplied backend over the Metro host', () => {
  expect(resolveApiBaseUrl({ explicitUrl: ' https://api.example.test/ ', scriptURL: 'http://192.0.2.7:8081/index.bundle', development: true })).toBe('https://api.example.test');
});

it('loads only public keys, with shell then local then base file precedence', () => {
  fs.existsSync.mockReturnValue(true);
  fs.readFileSync.mockImplementation(file => file.endsWith('.env.local') ? 'VIRALCO_API_URL=https://local.example.test\nDB_PASSWORD=not-public' : 'VIRALCO_API_URL=https://base.example.test\nVIRALCO_DEBUG_LOGIN_PRESETS=true');
  expect(readPublicEnv('/app', {})).toEqual({ VIRALCO_API_URL: 'https://local.example.test', VIRALCO_DEBUG_LOGIN_PRESETS: 'true' });
  expect(readPublicEnv('/app', { VIRALCO_API_URL: 'https://shell.example.test/', R2_SECRET_ACCESS_KEY: 'not-public' })).toEqual({ VIRALCO_API_URL: 'https://shell.example.test', VIRALCO_DEBUG_LOGIN_PRESETS: 'true' });
});

it.each(['https://api.example.test/api', 'https://user:password@example.test', 'ftp://example.test', 'https://example.test?secret=x'])('rejects incorrect API origins %s', address => {
  expect(() => readPublicEnv('/app', { VIRALCO_API_URL: address })).toThrow();
});

it('inlines public config without embedding private environment keys', () => {
  const code = transformSync('const url = process.env.VIRALCO_API_URL; const flag = process.env.VIRALCO_DEBUG_LOGIN_PRESETS; const secret = process.env.DB_PASSWORD;', { configFile: false, babelrc: false, plugins: [[inlinePublicEnv, { values: { VIRALCO_API_URL: 'https://api.example.test', VIRALCO_DEBUG_LOGIN_PRESETS: 'false', DB_PASSWORD: 'never-embed-this' } }]] }).code;
  expect(code).toContain('https://api.example.test');
  expect(code).toContain('"false"');
  expect(code).toContain('process.env.DB_PASSWORD');
  expect(code).not.toContain('never-embed-this');
});
