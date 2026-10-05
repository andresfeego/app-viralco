const originalDev = global.__DEV__;
const originalFlag = process.env.VIRALCO_DEBUG_LOGIN_PRESETS;

afterEach(() => {
  global.__DEV__ = originalDev;
  if (originalFlag === undefined) delete process.env.VIRALCO_DEBUG_LOGIN_PRESETS;
  else process.env.VIRALCO_DEBUG_LOGIN_PRESETS = originalFlag;
  jest.resetModules();
});

it.each([true, false])('enables internal login shortcuts with __DEV__=%s', dev => {
  global.__DEV__ = dev;
  delete process.env.VIRALCO_DEBUG_LOGIN_PRESETS;
  jest.resetModules();
  expect(require('../src/config/debug').ENABLE_DEBUG_LOGIN_PRESETS).toBe(true);
});

it.each(['0', 'false'])('honors an explicit disable flag: %s', flag => {
  global.__DEV__ = false;
  process.env.VIRALCO_DEBUG_LOGIN_PRESETS = flag;
  jest.resetModules();
  expect(require('../src/config/debug').ENABLE_DEBUG_LOGIN_PRESETS).toBe(false);
});
