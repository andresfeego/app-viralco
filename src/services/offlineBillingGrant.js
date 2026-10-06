import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Public verification key only; signing material never ships in the application.
export const OFFLINE_BILLING_PUBLIC_KEY = '2NqD/Kqefe+DpJHqbDZkNDTUp9OHKo3q88wehqX7qVc=';
const CLOCK_KEY = '@kaptura/billing-clock:v2';
let anchor = null;
let clockWrites = Promise.resolve();
let live = null;
const failure = () => Object.assign(new Error('BILLING_OPERATION_BLOCKED'), { code: 'BILLING_OPERATION_BLOCKED' });
export function verifyBillingGrant(grant, expected = {}, trustedPublicKey = OFFLINE_BILLING_PUBLIC_KEY) {
  try {
    const bytes = Buffer.from(grant.payload, 'base64');
    if (!nacl.sign.detached.verify(bytes, Buffer.from(grant.signature, 'base64'), Buffer.from(trustedPublicKey, 'base64'))) throw failure();
    const claims = JSON.parse(bytes.toString('utf8'));
    if (claims.v !== 3 || claims.purpose !== 'kaptura-offline-operation' || !Number.isFinite(claims.issuedAt) || !Number.isFinite(claims.expiresAt) || claims.expiresAt <= claims.issuedAt || !claims.services?.includes('espejo')) throw failure();
    for (const [key, value] of Object.entries(expected)) if (String(claims[key]) !== String(value)) throw failure();
    return claims;
  } catch { throw failure(); }
}
export async function anchorBillingClock(serverTime) {
  const wall = Date.now();
  anchor = { server: serverTime, wall, monotonic: global.performance.now() };
  await AsyncStorage.setItem(CLOCK_KEY, JSON.stringify({ server: serverTime, wall }));
}
export async function billingNow() {
  const wall = Date.now();
  const saved = JSON.parse(await AsyncStorage.getItem(CLOCK_KEY) || 'null');
  if (!saved || wall < saved.wall - 2000 || (anchor && wall < anchor.wall - 2000)) throw failure();
  const now = Math.max(saved.server + Math.max(0, wall - saved.wall), anchor ? anchor.server + Math.max(0, global.performance.now() - anchor.monotonic) : 0);
  clockWrites = clockWrites.catch(() => {}).then(() => AsyncStorage.setItem(CLOCK_KEY, JSON.stringify({ server: now, wall })));
  await clockWrites;
  return now;
}
export function liveBillingContext(eventId, eventModeId) {
  return live && String(live.eventId) === String(eventId) && String(live.eventModeId) === String(eventModeId) ? live : null;
}
export async function beginBillingLaunch(context, grant) {
  const claims = verifyBillingGrant(grant, { userId: context.userId, accountId: context.accountId, deviceId: context.installationId, eventId: context.eventId, eventModeId: context.eventModeId });
  const startedAt = await billingNow();
  if (startedAt >= claims.expiresAt || !billingGrantAllowsMode(claims, startedAt)) throw failure();
  live = { eventId: String(context.eventId), eventModeId: String(context.eventModeId), userId: String(context.userId), clientSessionId: context.clientSessionId, sessionId: String(context.session.id), grant, startedAt, processId: `${global.performance.now()}-${context.clientSessionId}` };
}
export function endBillingLaunch() { live = null; }
export function billingGrantAllowsMode(claims, now) {
  if (!claims.periods) return claims.services.includes('espejo');
  return claims.periods.some(period => period.startsAt <= now && now < period.endsAt && period.services.includes('espejo'));
}
export function billingLiveHeaders(path) {
  if (!live || !path.startsWith(`/api/events/${live.eventId}/modes/${live.eventModeId}/`)) return {};
  return { 'x-kaptura-live-proof': Buffer.from(JSON.stringify(live)).toString('base64') };
}
export function canContinueBillingLaunch(eventId, eventModeId, userId, targetSessionId, runStartedAt) {
  const current = liveBillingContext(eventId, eventModeId);
  if (current) {
    const claims = verifyBillingGrant(current.grant);
    if (claims.periods?.find(period => period.startsAt <= current.startedAt && current.startedAt < period.endsAt && period.services.includes('espejo'))?.provisional) return false;
    if (claims.periods?.some(period => period.startsAt > current.startedAt && !period.services.includes('espejo'))) return false;
  }
  return Boolean(current && current.userId === String(userId) && targetSessionId && [current.clientSessionId, current.sessionId].includes(String(targetSessionId)) && (!runStartedAt || new Date(runStartedAt).getTime() >= current.startedAt));
}
