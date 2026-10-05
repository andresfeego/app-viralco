import AsyncStorage from '@react-native-async-storage/async-storage';
import { exists, stat, hash, unlink, copyFile } from '@dr.pogodin/react-native-fs';
import { loadMirrorRuntime, saveMirrorRuntime, hydrateMirrorRuntime, loadMirrorArchives, archiveMirrorRuntime, cleanGuestOriginals } from '../src/services/mirrorRuntimeStorage';
import { recoverGuestStage, nextMissingPhoto, evaluateMirrorPreflight } from '../src/domain/mirrorRuntime';

const photo = (container, number) => ({
  clientCaptureId: `photo-${number}`, photoNumber: number, selected: true,
  path: `/var/mobile/Containers/Data/Application/${container}/Documents/kaptura-mirror-captures/32/run/photo-${number}.jpg`,
  sizeBytes: 100, sha256: 'a'.repeat(64), syncStatus: 'local',
});
const fixture = () => ({
  eventModeId: '245', session: { id: '32' }, config: { layout: { shotCount: 2, order: [1, 2] }, capture: { preserveOriginals: false } },
  localManifest: [{ path: '/old/Library/Caches/kaptura-mirror-packages/32/frame.png', eventResourceId: 'frame' }],
  manifest: [{}], completedRuns: [],
  activeRun: { clientRunId: 'run', retentionPolicyVersion: 1, captures: [photo('OLD-A', 1), photo('OLD-B', 2)], output: null },
});
beforeEach(() => {
  jest.clearAllMocks();
  exists.mockResolvedValue(true);
  stat.mockResolvedValue({ size: 100 });
  hash.mockResolvedValue('a'.repeat(64));
  AsyncStorage.getItem.mockResolvedValue(null);
});

it('migrates an existing resource from evictable cache to persistent storage without deleting the source', async () => {
  const copied = new Set();
  exists.mockImplementation(async path => !path.includes('/documents/kaptura-mirror-packages/') || copied.has(path));
  copyFile.mockImplementation(async (_source, target) => { copied.add(target); });
  const runtime = await hydrateMirrorRuntime(fixture());
  expect(copyFile).toHaveBeenCalledWith('/tmp/cache/kaptura-mirror-packages/32/frame.png', '/tmp/documents/kaptura-mirror-packages/32/frame.png');
  expect(runtime.localManifest[0].localAvailable).toBe(true);
  expect(unlink).not.toHaveBeenCalled();
});

it('recovers both real captures from different obsolete iOS containers before deciding to compose', async () => {
  AsyncStorage.getItem.mockResolvedValue(JSON.stringify(fixture()));
  const runtime = await loadMirrorRuntime('245');
  expect(runtime.activeRun.captures.map((item) => item.path)).toEqual([
    '/tmp/documents/kaptura-mirror-captures/32/run/photo-1.jpg',
    '/tmp/documents/kaptura-mirror-captures/32/run/photo-2.jpg',
  ]);
  expect(runtime.activeRun.captures.every((item) => item.localAvailable)).toBe(true);
  expect(runtime.localManifest[0].uri).toBe('file:///tmp/documents/kaptura-mirror-packages/32/frame.png');
  expect(recoverGuestStage(runtime)).toBe('processing');
  expect(exists.mock.calls.every(([path]) => !path.includes('OLD-'))).toBe(true);
  expect(unlink).not.toHaveBeenCalled();
});

it('persists portable descriptors and reopens them without any sandbox UUID', async () => {
  await saveMirrorRuntime(await hydrateMirrorRuntime(fixture()));
  const stored = AsyncStorage.setItem.mock.calls.at(-1)[1];
  expect(stored).not.toContain('/tmp/');
  expect(stored).not.toContain('OLD-');
  const serialized = JSON.parse(stored);
  expect(serialized.activeRun.captures[0]).toMatchObject({ storageRoot: 'captures', relativePath: '32/run/photo-1.jpg', photoNumber: 1 });
  const reopened = await hydrateMirrorRuntime(serialized);
  expect(recoverGuestStage(reopened)).toBe('processing');
});

it('waits for only a missing photo, preserving every other photo and all metadata', async () => {
  exists.mockImplementation(async (path) => !path.endsWith('photo-2.jpg'));
  const runtime = await hydrateMirrorRuntime(fixture());
  expect(recoverGuestStage(runtime)).toBe('waiting');
  expect(nextMissingPhoto(runtime.config, runtime.activeRun)).toBe(2);
  expect(runtime.activeRun.captures).toHaveLength(2);
  expect(runtime.activeRun.captures[0].localAvailable).toBe(true);
  expect(runtime.activeRun.captures[1].localAvailable).toBe(false);
  expect(unlink).not.toHaveBeenCalled();
});

it('treats corrupt or unreadable captures as unavailable rather than composing metadata', async () => {
  hash.mockResolvedValue('b'.repeat(64));
  const runtime = await hydrateMirrorRuntime(fixture());
  expect(recoverGuestStage(runtime)).toBe('waiting');
  expect(nextMissingPhoto(runtime.config, runtime.activeRun)).toBe(1);
  stat.mockRejectedValue(new Error('unreadable'));
  expect(await hydrateMirrorRuntime(fixture())).toHaveProperty('activeRun.captures.0.localAvailable', false);
});

it('recomposes a missing output only when all captures still exist', async () => {
  const input = fixture();
  input.activeRun.output = { path: '/old/Documents/kaptura-mirror-captures/32/run/output.jpg' };
  exists.mockImplementation(async (path) => !path.endsWith('output.jpg'));
  const runtime = await hydrateMirrorRuntime(input);
  expect(recoverGuestStage(runtime)).toBe('processing');
  expect(await cleanGuestOriginals(runtime, { ...runtime.activeRun, syncStatus: 'synced' })).toHaveProperty('captures', runtime.activeRun.captures);
  expect(unlink).not.toHaveBeenCalled();
});

it('rebases archived results too and blocks missing cached assets in offline preflight', async () => {
  const input = fixture();
  input.activeRun.output = { path: '/old/Documents/kaptura-mirror-captures/32/run/output.jpg' };
  await archiveMirrorRuntime(input);
  AsyncStorage.getItem.mockResolvedValue(AsyncStorage.setItem.mock.calls.at(-1)[1]);
  const [archive] = await loadMirrorArchives();
  expect(archive.completedRuns[0].output).toMatchObject({ path: '/tmp/documents/kaptura-mirror-captures/32/run/output.jpg', localAvailable: true });
  exists.mockImplementation(async (path) => !path.endsWith('frame.png'));
  const runtime = await hydrateMirrorRuntime(fixture());
  const preflight = evaluateMirrorPreflight({ runtime, freeSpace: 1e9, cameraPermission: true, cameraReady: true });
  expect(preflight.checks.find((item) => item.key === 'resources').ok).toBe(false);
});

it.each(['../outside.jpg', '/outside.jpg', '32/../../outside.jpg', 'file:///private/secret'])('rejects unsafe relative path %s without reading it', async (relativePath) => {
  const input = fixture();
  input.activeRun.captures = [{ storageRoot: 'captures', relativePath, photoNumber: 1 }];
  const runtime = await hydrateMirrorRuntime(input);
  expect(runtime.activeRun.captures[0]).toMatchObject({ localAvailable: false, path: null, uri: null });
  expect(exists.mock.calls.every(([path]) => !path.includes('outside') && !path.includes('secret'))).toBe(true);
});
