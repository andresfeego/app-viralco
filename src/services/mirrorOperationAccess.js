import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api/http';
import { offlineIdentity, sameOfflineIdentity } from './offlineCatalog';
import { getMirrorInstallationId } from './mirrorRuntimeStorage';
import { anchorBillingClock, billingNow, billingGrantAllowsMode, canContinueBillingLaunch, liveBillingContext, verifyBillingGrant } from './offlineBillingGrant';

const listeners = new Set();
let registryWrites = Promise.resolve();
const key = (id, event, mode) => `@kaptura/operation:v2:${id}:${event}:${mode}`;
export const subscribeOperationAccess = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export async function readOperationAccess(eventId, eventModeId) {
  const { subject } = offlineIdentity();
  if (!subject) return null;
  try { return JSON.parse(await AsyncStorage.getItem(key(subject, eventId, eventModeId)) || 'null'); } catch { return null; }
}
export async function assertOfflineOperation(eventId, eventModeId, targetSessionId, runStartedAt) {
  const state = await readOperationAccess(eventId, eventModeId);
  if (state?.allowed !== true) throw Object.assign(new Error('MIRROR_OPERATION_NOT_AUTHORIZED'), { code: 'MIRROR_OPERATION_NOT_AUTHORIZED' });
  const { subject } = offlineIdentity();
  const claims = verifyBillingGrant(state.grant, { userId: subject, eventId, eventModeId, deviceId: await getMirrorInstallationId() });
  const now = await billingNow();
  if (now < claims.expiresAt && !billingGrantAllowsMode(claims, now)) throw Object.assign(new Error('BILLING_OPERATION_BLOCKED'), { code: 'BILLING_OPERATION_BLOCKED' });
  if (now >= claims.expiresAt && !canContinueBillingLaunch(eventId, eventModeId, subject, targetSessionId, runStartedAt)) throw Object.assign(new Error('BILLING_OPERATION_BLOCKED'), { code: 'BILLING_OPERATION_BLOCKED' });
}
// Never use catalog cache here, and never turn an unknown result into permission.
// Every upload obtains a fresh grant, including manual retries and archived sessions.
export async function authorizeMirrorOperation(context) {
  const identity = offlineIdentity();
  if (!identity.subject || (context.userId && String(context.userId) !== identity.subject)) throw new Error('MIRROR_SESSION_USER_CHANGED');
  const { eventId, eventModeId } = context;
  registryWrites = registryWrites.catch(() => {}).then(async () => {
    const registryKey = `@kaptura/operation-index:${identity.subject}`;
    const entries = JSON.parse(await AsyncStorage.getItem(registryKey) || '{}');
    entries[`${eventId}:${eventModeId}`] = { eventId, eventModeId };
    await AsyncStorage.setItem(registryKey, JSON.stringify(entries));
  });
  await registryWrites;
  let allowed;
  let authorization;
  try {
    const deviceId = await getMirrorInstallationId();
    const session = context.clientSessionId || context.session?.clientSessionId || '';
    const result = await apiRequest(`/api/events/${eventId}/modes/${eventModeId}/operation-access?deviceId=${encodeURIComponent(deviceId)}&clientSessionId=${encodeURIComponent(session)}`, { method: 'GET' }, { requireOnline: true });
    if (!sameOfflineIdentity(identity)) throw new Error('MIRROR_SESSION_USER_CHANGED');
    if (result?.allowed !== true || String(result.userId) !== identity.subject || String(result.eventId) !== String(eventId) || String(result.eventModeId) !== String(eventModeId)) throw new Error('MIRROR_OPERATION_RESPONSE_INVALID');
    const claims = verifyBillingGrant(result.grant, { userId: identity.subject, eventId, eventModeId, deviceId });
    if (result.continuity) {
      if (!canContinueBillingLaunch(eventId, eventModeId, identity.subject, session, context.runStartedAt)) throw new Error('BILLING_OPERATION_BLOCKED');
    } else await anchorBillingClock(claims.issuedAt);
    authorization = result.grant;
    allowed = true;
  } catch (error) {
    // A denied request for older photos must not revoke a still-open launch.
    if (error.code === 'BILLING_SUBSCRIPTION_EXPIRED' && liveBillingContext(eventId, eventModeId)) throw error;
    if (sameOfflineIdentity(identity) && [401, 403, 404, 409].includes(error.status)) allowed = false;
    if (allowed === false) {
      const state = { allowed, checkedAt: new Date().toISOString() };
      await AsyncStorage.setItem(key(identity.subject, eventId, eventModeId), JSON.stringify(state));
      listeners.forEach(listener => listener({ eventId, eventModeId, ...state }));
    }
    throw error;
  }
  const state = { allowed: true, grant: authorization, checkedAt: new Date().toISOString() };
  await AsyncStorage.setItem(key(identity.subject, eventId, eventModeId), JSON.stringify(state));
  listeners.forEach(listener => listener({ eventId, eventModeId, ...state }));
  return state;
}

export async function revalidateKnownOperations() {
  const identity = offlineIdentity();
  if (!identity.subject) return;
  const entries = JSON.parse(await AsyncStorage.getItem(`@kaptura/operation-index:${identity.subject}`) || '{}');
  for (const context of Object.values(entries)) {
    if (!sameOfflineIdentity(identity)) return;
    try { await authorizeMirrorOperation({ ...context, clientSessionId: liveBillingContext(context.eventId, context.eventModeId)?.clientSessionId }); } catch (error) {
      if (![401, 403, 404, 409].includes(error.status)) throw error;
    }
  }
}

export async function knownOperations() {
  const { subject } = offlineIdentity();
  if (!subject) return [];
  return Object.values(JSON.parse(await AsyncStorage.getItem(`@kaptura/operation-index:${subject}`) || '{}'));
}
