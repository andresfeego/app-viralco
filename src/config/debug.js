const envFlag = String(process.env.VIRALCO_DEBUG_LOGIN_PRESETS || '').trim().toLowerCase();

// Temporary opt-in for the autonomous internal Release used on our test devices.
// Set false before distributing a production build; these are test-account shortcuts.
const ENABLE_INTERNAL_RELEASE_LOGIN_PRESETS = true;

export const ENABLE_DEBUG_LOGIN_PRESETS = !['0', 'false'].includes(envFlag)
  && (__DEV__ || ENABLE_INTERNAL_RELEASE_LOGIN_PRESETS);
