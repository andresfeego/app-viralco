const mockGetSourceCode = jest.fn();
const mockNativeModules = {};

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: mockNativeModules,
  TurboModuleRegistry: { get: mockGetSourceCode },
}));

const originalApiUrl = process.env.VIRALCO_API_URL;

beforeEach(() => {
  jest.resetModules();
  mockGetSourceCode.mockReset();
  delete mockNativeModules.SourceCode;
  delete process.env.VIRALCO_API_URL;
});

afterAll(() => {
  if (originalApiUrl === undefined) delete process.env.VIRALCO_API_URL;
  else process.env.VIRALCO_API_URL = originalApiUrl;
});

describe.each(['api.js', 'api.ts'])('%s native API configuration', moduleName => {
  const loadApi = () => require(`../src/config/${moduleName}`).API_BASE_URL;

  it('uses the physical device Metro host exposed by SourceCode.getConstants', () => {
    mockGetSourceCode.mockReturnValue({
      getConstants: () => ({ scriptURL: 'http://192.0.2.7:8081/index.bundle?platform=ios&dev=true' }),
    });
    expect(loadApi()).toBe('http://192.0.2.7:4000');
    expect(mockGetSourceCode).toHaveBeenCalledWith('SourceCode');
  });

  it('supports the legacy SourceCode property when no TurboModule is available', () => {
    mockGetSourceCode.mockReturnValue(null);
    mockNativeModules.SourceCode = { scriptURL: 'http://partners-mac.local:8081/index.bundle' };
    expect(loadApi()).toBe('http://partners-mac.local:4000');
  });

  it('keeps an explicitly configured backend ahead of the Metro host', () => {
    process.env.VIRALCO_API_URL = 'https://api.example.test';
    mockGetSourceCode.mockReturnValue({
      getConstants: () => ({ scriptURL: 'http://192.0.2.7:8081/index.bundle' }),
    });
    expect(loadApi()).toBe('https://api.example.test');
  });
});
