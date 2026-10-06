import { apiRequest } from './api/http';
import { offlineIdentity, sameOfflineIdentity, writeCatalog } from './offlineCatalog';
import { revalidateKnownOperations } from './mirrorOperationAccess';
import { cacheMirrorPackage, serializeMirrorRuntime } from './mirrorRuntimeStorage';

async function withLocalLogo(event) {
  const resource = event?.branding?.logoResource;
  if (!resource?.asset) return event;
  try {
    const manifest = await cacheMirrorPackage({ session: { id: 'catalog-logos' }, version: { id: event.id }, manifest: [{ ...resource, eventResourceId: resource.id || event.branding.logoResourceId }] });
    const file = serializeMirrorRuntime({ localManifest: manifest }).localManifest[0];
    return { ...event, branding: { ...event.branding, logoResource: { ...resource, offlineLogoPath: file.relativePath } } };
  } catch { return event; }
}

export async function prepareCatalogForEvent(scope) {
  const identity = offlineIdentity();
  await Promise.all(['/api/events/accounts', '/api/permissions/me', '/api/events/types', '/api/events/modes'].map(path => apiRequest(path)));
  const listPath = `/api/accounts/${scope.accountId}/events`;
  const list = await apiRequest(listPath);
  const detail = await apiRequest(`/api/events/${scope.eventId}`);
  const localEvent = await withLocalLogo(detail.event || detail);
  if (!sameOfflineIdentity(identity)) throw new Error('MIRROR_SESSION_USER_CHANGED');
  await writeCatalog(identity.subject, `/api/events/${scope.eventId}`, detail.event ? { ...detail, event: localEvent } : localEvent);
  await writeCatalog(identity.subject, listPath, { ...list, events: (list.events || []).map(event => String(event.id) === String(scope.eventId) ? { ...event, branding: localEvent.branding } : event) });
}

const running = new Map();
export function primeOfflineCatalog() {
  const identity = offlineIdentity();
  const key = `${identity.subject}:${identity.generation}`;
  if (running.has(key)) return running.get(key);
  const request = (async () => {
    await revalidateKnownOperations();
    await Promise.all(['/api/permissions/me', '/api/events/types', '/api/events/modes'].map(path => apiRequest(path)));
    const payload = await apiRequest('/api/events/accounts');
    for (const account of payload.accounts || []) {
      if (!sameOfflineIdentity(identity)) return;
      const events = await apiRequest(`/api/accounts/${account.id}/events`);
      const prepared = [];
      for (const event of events.events || []) {
        if (!sameOfflineIdentity(identity)) return;
        const detail = await apiRequest(`/api/events/${event.id}`);
        const localEvent = await withLocalLogo(detail.event || detail);
        if (!sameOfflineIdentity(identity)) return;
        await writeCatalog(identity.subject, `/api/events/${event.id}`, detail.event ? { ...detail, event: localEvent } : localEvent);
        prepared.push({ ...event, branding: localEvent.branding });
      }
      if (sameOfflineIdentity(identity)) await writeCatalog(identity.subject, `/api/accounts/${account.id}/events`, { ...events, events: prepared });
    }
  })().finally(() => { running.delete(key); });
  running.set(key, request);
  return request;
}
