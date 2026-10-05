import { syncEventCompositions } from '../src/services/mirrorEventSync';
import { syncMirrorRun, isMirrorRuntimeOnline } from '../src/services/mirrorRuntimeSync';
import { loadMirrorRuntime, saveMirrorRuntime } from '../src/services/mirrorRuntimeStorage';
jest.mock('../src/services/mirrorRuntimeSync', () => ({ syncMirrorRun: jest.fn(), isMirrorRuntimeOnline: jest.fn(async () => true) }));
jest.mock('../src/services/mirrorRuntimeStorage', () => ({ loadMirrorRuntime: jest.fn(), saveMirrorRuntime: jest.fn(), loadMirrorArchives: jest.fn(async () => []), archiveMirrorRuntime: jest.fn() }));
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn() }));
const run = (id) => ({ clientRunId: id, captures: [], output: { clientAssetId: id, syncStatus: 'local' } });
beforeEach(() => jest.clearAllMocks());
it('continues after a failed photo and saves successful acknowledgements', async () => {
  const runs = [run('one'), run('two')];
  const context = { eventModeId: '2', session: { id: 'session' }, completedRuns: runs };
  loadMirrorRuntime.mockResolvedValue(context);
  syncMirrorRun.mockRejectedValueOnce(new Error('Upload failed (403)')).mockImplementationOnce(async (_context, value, update, progress) => {
    progress({ stage: 'uploading', percent: 45 });
    const next = { ...value, syncStatus: 'synced', output: { ...value.output, syncStatus: 'synced' } };
    update(next); progress({ stage: 'synced', percent: 100 }); return next;
  });
  const notify = jest.fn();
  await syncEventCompositions(runs.map((value) => ({ context, run: value, active: true })), notify);
  expect(notify).toHaveBeenCalledWith('one', { stage: 'failed', percent: 0 });
  expect(notify).toHaveBeenCalledWith('two', { stage: 'synced', percent: 100 });
  expect(saveMirrorRuntime).toHaveBeenLastCalledWith(expect.objectContaining({ completedRuns: [runs[0], expect.objectContaining({ syncStatus: 'synced' })] }));
});
it('does not upload offline and leaves local photos intact', async () => {
  isMirrorRuntimeOnline.mockResolvedValueOnce(false);
  const value = run('offline'); const context = { eventModeId: '2', session: { id: 'session' }, completedRuns: [value] };
  loadMirrorRuntime.mockResolvedValue(context);
  const notify = jest.fn();
  await syncEventCompositions([{ context, run: value, active: true }], notify);
  expect(syncMirrorRun).not.toHaveBeenCalled();
  expect(notify).toHaveBeenCalledWith('offline', { stage: 'failed', percent: 0 });
});
