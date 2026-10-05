import { loadMirrorArchives, loadMirrorRuntime, saveMirrorRuntime, archiveMirrorRuntime } from './mirrorRuntimeStorage';
import { loadArchivedCompositions, compositionKey } from './mirrorLocalGallery';
import { mergeRunAcknowledgements } from '../domain/mirrorRuntime';
import { isMirrorRuntimeOnline, syncMirrorRun } from './mirrorRuntimeSync';
import { recordClientTechnicalError } from './errorHandling';

export async function loadEventSyncEntries(eventId, eventModeId, includeArchived = false) {
  const [archives, active, hidden] = await Promise.all([loadMirrorArchives(), loadMirrorRuntime(eventModeId), loadArchivedCompositions()]);
  const entries = new Map();
  for (const context of [...archives, active].filter(Boolean)) {
    if (String(context.eventId) !== String(eventId) || String(context.eventModeId) !== String(eventModeId)) continue;
    for (const run of [...(context.completedRuns || []), context.activeRun].filter(Boolean)) {
      if (run.output && (includeArchived || !hidden[compositionKey(run)])) entries.set(compositionKey(run), { context, run, active: context === active });
    }
  }
  return [...entries.values()];
}
let running = false;
export async function syncEventCompositions(entries, onState) {
  if (running) return;
  running = true;
  try {
    const online = await isMirrorRuntimeOnline();
    for (const entry of entries) {
      const key = compositionKey(entry.run);
      if (entry.run.syncStatus === 'synced') continue;
      let acknowledged = entry.run;
      let percent = 0;
      try {
        if (!online) throw new Error('MIRROR_OFFLINE');
        onState(key, { stage: 'uploading', percent });
        acknowledged = await syncMirrorRun(entry.context, entry.run, (run) => { acknowledged = run; }, (state) => { percent = state.percent; onState(key, state); });
      } catch (error) {
        onState(key, { stage: 'failed', percent });
        await recordClientTechnicalError({ code: 'MIRROR_EVENT_SYNC_FAILED', detail: `${key}: ${error.message}` });
      } finally {
        // Merge only acknowledgements into the latest stored session, never replace its photos.
        const current = entry.active ? await loadMirrorRuntime(entry.context.eventModeId) : (await loadMirrorArchives()).find((item) => item.session.id === entry.context.session.id);
        if (current?.session.id === entry.context.session.id) {
          const updated = { ...current, activeRun: mergeRunAcknowledgements(current.activeRun, acknowledged), completedRuns: (current.completedRuns || []).map((run) => mergeRunAcknowledgements(run, acknowledged)) };
          if (entry.active) await saveMirrorRuntime(updated); else await archiveMirrorRuntime(updated);
        }
      }
    }
  } finally { running = false; }
}
