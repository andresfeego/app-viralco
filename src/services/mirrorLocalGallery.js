import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadMirrorArchives, loadMirrorRuntime } from './mirrorRuntimeStorage';

const KEY = '@kaptura/mirror/hidden-compositions';
const QUEUE_KEY = '@kaptura/mirror/archive-mutations-v1';
let writes = Promise.resolve();
async function loadArchiveQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (raw) return JSON.parse(raw);
  // Import the old device-only archive exactly once, including existing iPhone marks.
  const hidden = await loadArchivedCompositions();
  const queue = Object.fromEntries(Object.keys(hidden).map((key) => [key, { archived: true, revision: `legacy:${key}` }]));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue;
}
export async function loadArchivedCompositions() {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}
export const compositionKey = (run) => String(run?.output?.clientAssetId || run?.clientRunId || '');
export async function setCompositionArchived(run, archived, context) {
  const key = compositionKey(run);
  if (!key) return Promise.reject(new Error('MIRROR_COMPOSITION_ID_REQUIRED'));
  writes = writes.catch(() => {}).then(async () => {
    const queue = await loadArchiveQueue();
    queue[key] = { archived, revision: `${Date.now()}:${Math.random()}` };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    const state = await loadArchivedCompositions();
    if (archived) state[key] = new Date().toISOString(); else delete state[key];
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
    return state;
  });
  const state = await writes;
  if (context) {
    try { return await syncCompositionArchives(context.eventId, context.eventModeIds || [context.eventModeId]); }
    catch (error) {
      const { recordClientTechnicalError } = require('./errorHandling');
      recordClientTechnicalError({ code: 'MIRROR_ARCHIVE_SYNC_PENDING', detail: error.message });
    }
  }
  return state;
}

let archiveSync = Promise.resolve();
export function syncCompositionArchives(eventId, eventModeIds = []) {
  archiveSync = archiveSync.catch(() => {}).then(async () => {
    const { getCompositionArchivesApi, setCompositionArchiveApi } = require('./api/events');
    // Serialize snapshots with local mutations; network requests never hold the write lock.
    let pending;
    writes = writes.catch(() => {}).then(async () => { pending = await loadArchiveQueue(); });
    await writes;
    for (const modeId of new Set(eventModeIds)) {
      const { authorizeMirrorOperation } = require('./mirrorOperationAccess');
      await authorizeMirrorOperation({ eventId, eventModeId: modeId });
      const { items } = await getCompositionArchivesApi(eventId, modeId);
      for (const item of items) {
        const key = String(item.clientAssetId);
        const mutation = pending[key];
        let archived = item.archived;
        if (mutation) {
          const result = await setCompositionArchiveApi(eventId, modeId, { clientAssetId: key, archived: mutation.archived });
          if (!result.found) continue;
          archived = mutation.archived;
        }
        writes = writes.catch(() => {}).then(async () => {
          const queue = await loadArchiveQueue();
          // A newer local tap must survive an older response.
          if (queue[key] && queue[key].revision !== mutation?.revision) return;
          const hidden = await loadArchivedCompositions();
          if (archived) hidden[key] = hidden[key] || new Date().toISOString(); else delete hidden[key];
          await AsyncStorage.setItem(KEY, JSON.stringify(hidden));
          delete queue[key];
          await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        });
        await writes;
      }
    }
    return loadArchivedCompositions();
  });
  return archiveSync;
}
export function collectLocalCompositions(contexts, eventId) {
  const unique = new Map();
  for (const context of contexts.filter(Boolean)) {
    if (String(context.eventId) !== String(eventId)) continue;
    for (const run of [...(context.completedRuns || []), context.activeRun].filter(Boolean)) {
      if (!run.output || run.output.localAvailable === false || !run.output.uri) continue;
      unique.set(compositionKey(run), { ...run, configSnapshot: run.configSnapshot || context.config, printManifest: context.localManifest, eventModeId: context.eventModeId, sessionId: context.session?.id ? String(context.session.id) : undefined, clientSessionId: context.clientSessionId });
    }
  }
  return [...unique.values()].sort((a, b) => String(b.output.createdAt || '').localeCompare(String(a.output.createdAt || '')));
}
export async function loadEventLocalCompositions(eventId, eventModeIds = []) {
  const archives = await loadMirrorArchives();
  const active = await Promise.all(eventModeIds.map(loadMirrorRuntime));
  return collectLocalCompositions([...archives, ...active], eventId);
}
