import { knownOperations } from './mirrorOperationAccess';
import { offlineIdentity, sameOfflineIdentity } from './offlineCatalog';
import { loadEventSyncEntries, syncEventCompositions } from './mirrorEventSync';
import { recordClientTechnicalError } from './errorHandling';

let running = false;
export async function syncOfflineOutbox() {
  if (running) return;
  running = true;
  const identity = offlineIdentity();
  try {
    for (const context of await knownOperations()) {
      if (!sameOfflineIdentity(identity)) return;
      try {
        const entries = await loadEventSyncEntries(context.eventId, context.eventModeId, true);
        if (!sameOfflineIdentity(identity)) return;
        // syncMirrorRun performs fresh server authorization, never trusts this index.
        await syncEventCompositions(entries.filter(entry => !entry.context.userId || entry.context.userId === identity.subject), () => {});
      } catch (error) {
        recordClientTechnicalError({ code: 'OFFLINE_OUTBOX_PENDING', detail: error.message }).catch(() => {});
      }
    }
  } finally { running = false; }
}
