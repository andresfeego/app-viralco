import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../i18n';

const CLIENT_ERROR_LOG_KEY = 'kaptura_technical_errors_v1';
const MAX_CLIENT_ERRORS = 50;
const MAX_DETAIL_LENGTH = 2000;
const TECHNICAL_PATTERNS = [
  /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/,
  /failed query/i,
  /\b(select|insert into|update|delete from)\b[\s\S]*\b(from|where|values|set)\b/i,
  /\bparams\s*:/i,
  /\b(sqlstate|drizzle|mysql|mariadb)\b/i,
  /\b(econnrefused|enotfound|etimedout|network request failed)\b/i,
  /\b(typeerror|referenceerror|syntaxerror)\b/i,
  /\bat\s+[A-Za-z0-9_$.[\]<>]+\s*\([^)]*:\d+:\d+\)/,
  /request failed\s*\(\d+\)/i,
  /drawViewHierarchyInRect|renderInContext|UIGraphicsImageRenderer|reactTag|findNodeHandle|TurboModuleRegistry/i,
  /the view cannot be captured|failed to capture view snapshot|NativeModules\./i,
  /required entitlement|errSecMissingEntitlement|keychain|OSStatus/i,
];

function redact(value) {
  return String(value || '')
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .replace(/(password|newPassword|refreshToken|accessToken|authorization|token)(["'\s:=]+)([^\s,"'}]+)/gi, '$1$2[redacted]')
    .slice(0, MAX_DETAIL_LENGTH);
}

export function isTechnicalErrorMessage(message) {
  const value = String(message || '');
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(value));
}

export function userErrorMessage(error, fallback = t('error_000')) {
  const memberMessage = {
    EVENT_MEMBER_REGISTER_FIRST: 'event_member_register_first',
    EVENT_MEMBER_EMAIL_INVALID: 'event_member_invalid_email',
    EVENT_MEMBER_EXISTS: 'event_member_exists',
    EVENT_MEMBER_INACTIVE: 'event_member_inactive',
    EVENT_MEMBER_ALREADY_HAS_ACCESS: 'event_member_has_access',
  }[error?.code];
  if (memberMessage) return t(memberMessage);
  if (String(error?.code || error?.message || '').startsWith('BILLING_')) return t('billing_accessHelp');
  const message = typeof error === 'string' ? error : error?.message;
  if (!message || isTechnicalErrorMessage(message) || error?.code === 'INTERNAL_ERROR') return fallback;
  return String(message);
}

export async function recordClientTechnicalError(input = {}) {
  try {
    const raw = await AsyncStorage.getItem(CLIENT_ERROR_LOG_KEY);
    const current = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(current) ? current : [];
    const entry = {
      timestamp: new Date().toISOString(),
      clientErrorId: String(input.clientErrorId || ''),
      requestId: String(input.requestId || ''),
      code: String(input.code || 'CLIENT_ERROR'),
      status: Number(input.status || 0) || null,
      method: String(input.method || ''),
      path: String(input.path || ''),
      detail: redact(input.detail),
    };
    await AsyncStorage.setItem(CLIENT_ERROR_LOG_KEY, JSON.stringify([entry, ...items].slice(0, MAX_CLIENT_ERRORS)));
  } catch {
    // Error logging must never interfere with the user's action.
  }
}

export async function listClientTechnicalErrors() {
  try {
    const raw = await AsyncStorage.getItem(CLIENT_ERROR_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
