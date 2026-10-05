import { loadArchivedEventCompositions } from '../src/services/mirrorArchivedGallery';
import { listMirrorCompositionsApi } from '../src/services/api/events';
import { loadArchivedCompositions, loadEventLocalCompositions } from '../src/services/mirrorLocalGallery';
jest.mock('../src/services/api/events', () => ({ listMirrorCompositionsApi: jest.fn() }));
jest.mock('../src/services/mirrorLocalGallery', () => ({
  compositionKey: (run) => run.output.clientAssetId,
  loadArchivedCompositions: jest.fn(), loadEventLocalCompositions: jest.fn(),
  syncCompositionArchives: jest.fn(async () => ({})),
}));
const local = { output: { clientAssetId: 'local', uri: 'file:///local.jpg', syncStatus: 'pending' } };
beforeEach(() => {
  jest.resetAllMocks();
  loadArchivedCompositions.mockResolvedValue({ local: true, remote: true });
  loadEventLocalCompositions.mockResolvedValue([local]);
  listMirrorCompositionsApi.mockResolvedValue({ items: [], nextCursor: null });
});
it('includes pending local images and remote-only archived images across pages without duplicates', async () => {
  listMirrorCompositionsApi
    .mockResolvedValueOnce({ items: [{ clientAssetId: 'remote', url: 'https://photo' }, { clientAssetId: 'visible', url: 'https://visible' }], nextCursor: 'next' })
    .mockResolvedValueOnce({ items: [{ clientAssetId: 'remote', url: 'https://photo' }], nextCursor: null });
  const result = await loadArchivedEventCompositions('event', ['mirror']);
  expect(result.errors).toEqual([]);
  expect(result.runs).toHaveLength(2);
  expect(result.runs[0]).toEqual(local);
  expect(result.runs[1].output).toMatchObject({ clientAssetId: 'remote', uri: 'https://photo', syncStatus: 'synced' });
  expect(listMirrorCompositionsApi).toHaveBeenLastCalledWith('event', 'mirror', 'next');
});
it('server confirmation overrides stale pending state while retaining the local image', async () => {
  listMirrorCompositionsApi.mockResolvedValue({ items: [{ clientAssetId: 'local', url: 'https://photo' }], nextCursor: null });
  const result = await loadArchivedEventCompositions('event', ['mirror']);
  expect(result.runs).toHaveLength(1);
  expect(result.runs[0].output).toMatchObject({ uri: local.output.uri, syncStatus: 'synced' });
  expect(local.output.syncStatus).toBe('pending');
});
it('keeps local photos when offline and reports the failed remote query', async () => {
  listMirrorCompositionsApi.mockRejectedValue(new Error('offline'));
  const result = await loadArchivedEventCompositions('event', ['mirror']);
  expect(result.runs).toEqual([local]);
  expect(result.errors).toHaveLength(1);
});
it('does not query the server when nothing is archived', async () => {
  loadArchivedCompositions.mockResolvedValue({});
  expect((await loadArchivedEventCompositions('event', ['mirror'])).runs).toEqual([]);
  expect(listMirrorCompositionsApi).not.toHaveBeenCalled();
});
