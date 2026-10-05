import nacl from 'tweetnacl';
import { Buffer } from 'buffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { anchorBillingClock, beginBillingLaunch, billingNow, billingGrantAllowsMode, canContinueBillingLaunch, endBillingLaunch, verifyBillingGrant } from '../src/services/offlineBillingGrant';
const key = nacl.sign.keyPair.fromSeed(new Uint8Array(32).fill(17));
const publicKey = Buffer.from(key.publicKey).toString('base64');
const claims = { purpose: 'kaptura-offline-operation', v: 2, userId: '1', accountId: '2', eventId: '3', eventModeId: '4', deviceId: 'phone', services: ['espejo'], issuedAt: 10000, expiresAt: 20000 };
function envelope(value = claims) { const bytes = Buffer.from(JSON.stringify(value)); return { payload: bytes.toString('base64'), signature: Buffer.from(nacl.sign.detached(bytes, key.secretKey)).toString('base64') }; }
beforeEach(() => {
  jest.restoreAllMocks(); endBillingLaunch();
  const map = new Map();
  AsyncStorage.getItem.mockImplementation(async name => map.get(name) || null);
  AsyncStorage.setItem.mockImplementation(async (name, value) => { map.set(name, value); });
});
it('applies scheduled services at the exact renewal boundary', () => {
  const scheduled = { ...claims, periods: [{ startsAt: 1000, endsAt: 2000, services: ['espejo'] }, { startsAt: 2000, endsAt: 3000, services: ['cabina'] }] };
  expect(billingGrantAllowsMode(scheduled, 1999)).toBe(true);
  expect(billingGrantAllowsMode(scheduled, 2000)).toBe(false);
});
it('verifies authentic Ed25519 signatures and binds user/account/device/event', () => {
  expect(verifyBillingGrant(envelope(), { deviceId: 'phone' }, publicKey)).toMatchObject(claims);
  for (const field of ['userId', 'accountId', 'deviceId', 'eventId', 'eventModeId']) expect(() => verifyBillingGrant(envelope(), { [field]: 'other' }, publicKey)).toThrow();
});
it('rejects modified content, signatures, old boolean permissions and wrong keys', () => {
  const altered = { ...envelope(), payload: Buffer.from(JSON.stringify({ ...claims, expiresAt: 999999 })).toString('base64') };
  for (const grant of [altered, { ...envelope(), signature: Buffer.alloc(64).toString('base64') }, { allowed: true }]) expect(() => verifyBillingGrant(grant, {}, publicKey)).toThrow();
  expect(() => verifyBillingGrant(envelope())).toThrow();
});
it('requires an initial time anchor and rejects a clock rollback', async () => {
  await expect(billingNow()).rejects.toThrow();
  const wall = jest.spyOn(Date, 'now').mockReturnValue(100000);
  await anchorBillingClock(10000);
  wall.mockReturnValue(105000);
  expect(await billingNow()).toBeGreaterThanOrEqual(15000);
  wall.mockReturnValue(90000);
  await expect(billingNow()).rejects.toThrow();
});
it('continuity is process-local and strictly session/user scoped', async () => {
  // Signature verification is tested above; this isolates live-state lifetime.
  jest.spyOn(nacl.sign.detached, 'verify').mockReturnValue(true);
  await anchorBillingClock(11000);
  const context = { userId: '1', accountId: '2', eventId: '3', eventModeId: '4', installationId: 'phone', clientSessionId: 'live', session: { id: 'server' } };
  await beginBillingLaunch(context, envelope());
  expect(canContinueBillingLaunch('3', '4', '1', 'live')).toBe(true);
  expect(canContinueBillingLaunch('3', '4', '1', 'old')).toBe(false);
  expect(canContinueBillingLaunch('3', '4', 'other', 'live')).toBe(false);
  endBillingLaunch();
  expect(canContinueBillingLaunch('3', '4', '1', 'live')).toBe(false);
});
it('cannot start a new launch at or after expiry', async () => {
  jest.spyOn(nacl.sign.detached, 'verify').mockReturnValue(true);
  await anchorBillingClock(20000);
  await expect(beginBillingLaunch({ userId: '1', accountId: '2', eventId: '3', eventModeId: '4', installationId: 'phone', clientSessionId: 'new', session: { id: 'server' } }, envelope())).rejects.toThrow();
});
