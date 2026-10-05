import AsyncStorage from '@react-native-async-storage/async-storage';
import { collectLocalCompositions, loadArchivedCompositions, setCompositionArchived, syncCompositionArchives } from '../src/services/mirrorLocalGallery';
import { getCompositionArchivesApi, setCompositionArchiveApi } from '../src/services/api/events';
jest.mock('../src/services/api/events', () => ({ getCompositionArchivesApi: jest.fn(), setCompositionArchiveApi: jest.fn() }));

const run = { clientRunId: 'run', captures: [{ uri: 'original.jpg' }], output: { clientAssetId: 'out', uri: 'photo.jpg', createdAt: '2026-09-09' } };
beforeEach(() => {
  getCompositionArchivesApi.mockReset().mockResolvedValue({ items: [] });
  setCompositionArchiveApi.mockReset().mockResolvedValue({ found: true });
  const items = new Map();
  AsyncStorage.getItem.mockImplementation(async (key) => items.get(key) || null);
  AsyncStorage.setItem.mockImplementation(async (key, value) => { items.set(key, value); });
});
it('imports old iPhone marks once, then accepts a restoration from another device', async () => {
  await AsyncStorage.setItem('@kaptura/mirror/hidden-compositions', JSON.stringify({ out: 'old-date' }));
  getCompositionArchivesApi.mockResolvedValue({ items: [{ clientAssetId: 'out', archived: false }] });
  expect((await syncCompositionArchives('event', ['mode'])).out).toBeTruthy();
  expect(setCompositionArchiveApi).toHaveBeenCalledWith('event', 'mode', { clientAssetId: 'out', archived: true });
  setCompositionArchiveApi.mockClear();
  expect(await syncCompositionArchives('event', ['mode'])).toEqual({});
  expect(setCompositionArchiveApi).not.toHaveBeenCalled();
});
it('a clean simulator receives remote archive state without re-uploading it', async () => {
  getCompositionArchivesApi.mockResolvedValue({ items: [{ clientAssetId: 'remote', archived: true }] });
  expect((await syncCompositionArchives('event', ['mode'])).remote).toBeTruthy();
  await syncCompositionArchives('event', ['mode']);
  expect(setCompositionArchiveApi).not.toHaveBeenCalled();
});
it('keeps a mutation until the photo exists on the server and retries after offline failure', async () => {
  await setCompositionArchived(run, true);
  await syncCompositionArchives('event', ['mode']);
  expect(setCompositionArchiveApi).not.toHaveBeenCalled();
  getCompositionArchivesApi.mockRejectedValueOnce(new Error('offline'));
  await expect(syncCompositionArchives('event', ['mode'])).rejects.toThrow('offline');
  getCompositionArchivesApi.mockResolvedValue({ items: [{ clientAssetId: 'out', archived: false }] });
  await syncCompositionArchives('event', ['mode']);
  expect(setCompositionArchiveApi).toHaveBeenCalledWith('event', 'mode', { clientAssetId: 'out', archived: true });
});
it('does not let an older archive response overwrite a newer restore', async () => {
  await setCompositionArchived(run, true);
  getCompositionArchivesApi.mockResolvedValue({ items: [{ clientAssetId: 'out', archived: false }] });
  setCompositionArchiveApi.mockImplementationOnce(async () => {
    await setCompositionArchived(run, false);
    return { found: true };
  });
  expect(await syncCompositionArchives('event', ['mode'])).toEqual({});
  await syncCompositionArchives('event', ['mode']);
  expect(setCompositionArchiveApi).toHaveBeenLastCalledWith('event', 'mode', { clientAssetId: 'out', archived: false });
});
it('archives and restores without changing the output, originals or old snapshots', async () => {
  const snapshot = JSON.stringify(run);
  const state = await setCompositionArchived(run, true);
  expect(state.out).toBeTruthy();
  expect((await loadArchivedCompositions()).out).toBeTruthy();
  expect(JSON.stringify(run)).toBe(snapshot);
  expect(await setCompositionArchived(run, false)).toEqual({});
});
it('serializes rapid archives so neither selection is lost', async () => {
  await Promise.all([setCompositionArchived(run, true), setCompositionArchived({ ...run, output: { clientAssetId: 'other' } }, true)]);
  expect(Object.keys(await loadArchivedCompositions()).sort()).toEqual(['other', 'out']);
});
it('isolates the event, deduplicates active/archive entries, and preserves original design', () => {
  const result = collectLocalCompositions([
    { eventId: 'a', config: { version: 1 }, completedRuns: [run] },
    { eventId: 'b', completedRuns: [{ ...run, output: { clientAssetId: 'private', uri: 'private.jpg' } }] },
    { eventId: 'a', config: { version: 2 }, activeRun: { ...run, configSnapshot: { version: 1 } } },
  ], 'a');
  expect(result).toHaveLength(1);
  expect(result[0].configSnapshot).toEqual({ version: 1 });
});
