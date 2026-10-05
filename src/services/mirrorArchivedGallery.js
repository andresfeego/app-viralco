import { listMirrorCompositionsApi } from './api/events';
import { compositionKey, loadArchivedCompositions, loadEventLocalCompositions, syncCompositionArchives } from './mirrorLocalGallery';

// Reconcile server state and pending local archive/restore actions before loading images.
export async function loadArchivedEventCompositions(eventId, eventModeIds = []) {
  const errors = [];
  try { await syncCompositionArchives(eventId, eventModeIds); } catch (error) { errors.push(error); }
  const [local, hidden] = await Promise.all([
    loadEventLocalCompositions(eventId, eventModeIds), loadArchivedCompositions(),
  ]);
  const runs = new Map(local.filter((run) => hidden[compositionKey(run)]).map((run) => [compositionKey(run), run]));
  if (!Object.keys(hidden).length) return { runs: [], errors };
  for (const modeId of new Set(eventModeIds)) {
    let cursor = null;
    const visited = new Set();
    try {
      do {
        const page = await listMirrorCompositionsApi(eventId, modeId, cursor);
        for (const asset of page.items) {
          const key = String(asset.clientAssetId || '');
          if (!key || !hidden[key]) continue;
          const existing = runs.get(key);
          runs.set(key, {
            ...existing,
            asset,
            output: {
              ...existing?.output,
              clientAssetId: asset.clientAssetId,
              uri: existing?.output?.uri || asset.url,
              capturedAt: existing?.output?.capturedAt || asset.metadata?.capturedAt || asset.metadata?.localCreatedAt,
              createdAt: existing?.output?.createdAt || asset.createdAt,
              localAvailable: existing?.output?.localAvailable,
              syncStatus: 'synced',
            },
          });
        }
        cursor = page.nextCursor;
        if (cursor && visited.has(cursor)) throw new Error('MIRROR_GALLERY_REPEATED_CURSOR');
        visited.add(cursor);
      } while (cursor);
    } catch (error) { errors.push(error); }
  }
  return { runs: [...runs.values()], errors };
}
