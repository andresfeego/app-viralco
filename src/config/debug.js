const envFlag = String(process?.env?.VIRALCO_DEBUG_LOGIN_PRESETS || '').trim();

export const ENABLE_DEBUG_LOGIN_PRESETS = __DEV__ && (envFlag === '1' || envFlag.toLowerCase() === 'true' || true);
