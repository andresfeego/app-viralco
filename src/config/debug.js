const envFlag = String(process?.env?.VIRALCO_DEBUG_LOGIN_PRESETS || '').trim().toLowerCase();
const isTruthy = (value) => value === '1' || value === 'true' || value === 'yes' || value === 'on';

export const ENABLE_DEBUG_LOGIN_PRESETS = __DEV__ && isTruthy(envFlag);

const readCredential = (prefix) => ({
  email: String(process?.env?.[`${prefix}_EMAIL`] || '').trim(),
  password: String(process?.env?.[`${prefix}_PASSWORD`] || '').trim(),
});

const rawCredentials = {
  SA: readCredential('VIRALCO_LOGIN_SA'),
  AUA: readCredential('VIRALCO_LOGIN_AUA'),
  AUP: readCredential('VIRALCO_LOGIN_AUP'),
};

export const QUICK_CREDENTIALS = Object.fromEntries(
  Object.entries(rawCredentials).filter(([, value]) => value.email && value.password)
);
