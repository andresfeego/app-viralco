import AsyncStorage from '@react-native-async-storage/async-storage';
import { cachePrinterManual } from './printerGuide';
import { recordClientTechnicalError } from './errorHandling';
import {
  CachesDirectoryPath,
  copyFile,
  DocumentDirectoryPath,
  downloadFile,
  exists,
  getFSInfo,
  hash,
  mkdir,
  moveFile,
  stat,
  stopDownload,
  unlink,
} from '@dr.pogodin/react-native-fs';
import { createClientUuid, runtimeResourceHash, runtimeResourceUrl } from '../domain/mirrorRuntime';

const INSTALLATION_KEY = '@kaptura/mirror/installation-id';
const RUNTIME_PREFIX = '@kaptura/mirror/runtime/';
const PACKAGE_ROOT = `${DocumentDirectoryPath}/kaptura-mirror-packages`;
const LEGACY_PACKAGE_ROOT = `${CachesDirectoryPath}/kaptura-mirror-packages`;
const CAPTURE_ROOT = `${DocumentDirectoryPath}/kaptura-mirror-captures`;
const ARCHIVES_KEY = '@kaptura/mirror/archived-sessions';

const MEDIA_ROOTS = { captures: CAPTURE_ROOT, packages: PACKAGE_ROOT };
const MEDIA_MARKERS = { captures: '/kaptura-mirror-captures/', packages: '/kaptura-mirror-packages/' };

// iOS may relocate the sandbox on installation. Only persist paths relative to
// our owned roots; never try to read an obsolete container or an arbitrary path.
function portableFile(file, root) {
  if (!file) return file;
  const { path, uri, localAvailable, storageRoot, relativePath, ...metadata } = file;
  const legacy = String(path || uri || '');
  const marker = MEDIA_MARKERS[root];
  const relative = storageRoot === root ? relativePath : legacy.includes(marker) ? legacy.slice(legacy.lastIndexOf(marker) + marker.length) : null;
  const safe = typeof relative === 'string' && relative.split('/').every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..');
  return { ...metadata, storageRoot: root, relativePath: safe ? relative : null };
}

function mapRuntimeFiles(runtime, transform) {
  const mapRun = (run) => run ? { ...run, captures: (run.captures || []).map((file) => transform(file, 'captures')), output: transform(run.output, 'captures') } : run;
  return { ...runtime, localManifest: (runtime.localManifest || []).map((file) => transform(file, 'packages')), activeRun: mapRun(runtime.activeRun), completedRuns: (runtime.completedRuns || []).map(mapRun) };
}

export function serializeMirrorRuntime(runtime) {
  return mapRuntimeFiles(runtime, portableFile);
}

export async function hydrateMirrorRuntime(runtime, onProgress = () => {}) {
  if (!runtime) return runtime;
  const checks = [];
  let verified = 0;
  const total = runtime.localManifest?.length || 0;
  if (total) onProgress({ item: 1, total, percent: 0, phase: 'verifying' });
  const hydrated = mapRuntimeFiles(runtime, (file, root) => {
    if (!file) return file;
    const portable = portableFile(file, root);
    const path = portable.relativePath ? `${MEDIA_ROOTS[root]}/${portable.relativePath}` : null;
    const result = { ...portable, path, uri: path ? `file://${path}` : null, localAvailable: false };
    checks.push((async () => {
      try {
        if (root === 'packages' && path && !(await exists(path))) {
          const previous = `${LEGACY_PACKAGE_ROOT}/${portable.relativePath}`;
          if (await verifiedExistingFile(previous, file.sizeBytes, file.sha256)) {
            await mkdir(path.slice(0, path.lastIndexOf('/')));
            await copyFile(previous, path);
          }
        }
        result.localAvailable = Boolean(path && await verifiedExistingFile(path, file.sizeBytes, file.sha256));
      }
      catch { result.localAvailable = false; }
      if (root === 'packages') onProgress({ item: ++verified, total, percent: 100, phase: 'verified' });
    })());
    return result;
  });
  await Promise.all(checks);
  return hydrated;
}

export async function archiveMirrorRuntime(runtime) {
  const archives = await loadMirrorArchives();
  const completedRuns = [...(runtime.completedRuns || [])];
  if (runtime.activeRun && !completedRuns.some((run) => run.clientRunId === runtime.activeRun.clientRunId)) completedRuns.push(runtime.activeRun);
  await AsyncStorage.setItem(ARCHIVES_KEY, JSON.stringify([...archives.filter((item) => item.session.id !== runtime.session.id), { ...runtime, completedRuns, activeRun: null }].map(serializeMirrorRuntime)));
}

export async function loadMirrorArchives() {
  const raw = await AsyncStorage.getItem(ARCHIVES_KEY);
  try { return raw ? await Promise.all(JSON.parse(raw).map(value => hydrateMirrorRuntime(value))) : []; } catch { return []; }
}

export async function cleanGuestOriginals(_runtime, run) {
  // Archiving is reversible. Keep local originals even when uploading them is
  // disabled; that published option controls remote delivery, not local deletion.
  return run;
}

function safePart(value) {
  return String(value || 'unknown').replace(/[^A-Za-z0-9_.-]/g, '-');
}

function extensionFor(mimeType, fallback = 'bin') {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('jpeg')) return 'jpg';
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('webp')) return 'webp';
  if (normalized.includes('gif')) return 'gif';
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('quicktime')) return 'mov';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('font') || normalized.includes('ttf')) return 'ttf';
  return fallback;
}

function runtimeStorageKey(eventModeId) {
  return `${RUNTIME_PREFIX}${safePart(eventModeId)}`;
}

export async function getMirrorInstallationId() {
  const current = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (current) return current;
  const created = `kaptura-${createClientUuid()}`;
  await AsyncStorage.setItem(INSTALLATION_KEY, created);
  return created;
}

export async function loadMirrorRuntime(eventModeId) {
  const raw = await AsyncStorage.getItem(runtimeStorageKey(eventModeId));
  if (!raw) return null;
  try { return await hydrateMirrorRuntime(JSON.parse(raw)); } catch { return null; }
}

export async function saveMirrorRuntime(runtime) {
  await AsyncStorage.setItem(runtimeStorageKey(runtime.eventModeId), JSON.stringify(serializeMirrorRuntime({ ...runtime, updatedAt: new Date().toISOString() })));
}

export async function clearMirrorRuntime(eventModeId) {
  await AsyncStorage.removeItem(runtimeStorageKey(eventModeId));
}

export async function getMirrorStorageInfo() {
  const info = await getFSInfo();
  return { freeSpace: Number(info.freeSpace || 0), totalSpace: Number(info.totalSpace || 0) };
}

async function verifiedExistingFile(path, expectedSize, expectedHash) {
  if (!(await exists(path))) return false;
  const file = await stat(path);
  if (Number(file.size) <= 0 || (typeof file.isFile === 'function' && !file.isFile())) return false;
  if (expectedSize && Number(file.size) !== Number(expectedSize)) return false;
  if (expectedHash && /^[a-f0-9]{64}$/.test(expectedHash)) {
    return (await hash(path, 'sha256')).toLowerCase() === expectedHash;
  }
  return true;
}

export async function cacheMirrorPackage({ session, version, manifest }, onProgress = () => {}) {
  const directory = `${PACKAGE_ROOT}/${safePart(session?.id || session?.clientSessionId)}/${safePart(version?.id || session?.configVersionId)}`;
  await mkdir(directory);
  const localManifest = [];
  for (let index = 0; index < (manifest || []).length; index += 1) {
    onProgress({ item: index + 1, total: manifest.length, percent: 0, phase: 'verifying' });
    const item = manifest[index];
    const url = runtimeResourceUrl(item);
    if (!url) throw new Error('MIRROR_RESOURCE_URL_MISSING');
    const extension = extensionFor(item?.asset?.mimeType);
    const target = `${directory}/${safePart(item.eventResourceId)}-${safePart(item?.asset?.id)}.${extension}`;
    const expectedHash = runtimeResourceHash(item);
    const expectedSize = Number(item?.asset?.sizeBytes || 0);
    if (!(await verifiedExistingFile(target, expectedSize, expectedHash))) {
      const partial = `${target}.part`;
      if (await exists(partial)) await unlink(partial);
      const task = downloadFile({
        fromUrl: url,
        toFile: partial,
        progressInterval: 250,
        connectionTimeout: 10000,
        readTimeout: 30000,
        progress: ({ bytesWritten, contentLength }) => onProgress({
          item: index + 1,
          total: manifest.length,
          percent: contentLength ? Math.round((bytesWritten / contentLength) * 100) : 0,
        }),
      });
      let timer;
      let result;
      try {
        result = await Promise.race([task.promise, new Promise((_, reject) => {
          timer = setTimeout(() => { stopDownload(task.jobId); reject(new Error('MIRROR_RESOURCE_DOWNLOAD_TIMEOUT')); }, 120000);
        })]);
      } finally { clearTimeout(timer); }
      if (result.statusCode < 200 || result.statusCode >= 300) throw new Error(`MIRROR_RESOURCE_DOWNLOAD_${result.statusCode}`);
      if (!(await verifiedExistingFile(partial, expectedSize, expectedHash))) {
        await unlink(partial);
        throw new Error('MIRROR_RESOURCE_INTEGRITY_FAILED');
      }
      if (await exists(target)) await unlink(target);
      await moveFile(partial, target);
    }
    if (item?.asset?.metadata?.printGuide?.manual) {
      try { await cachePrinterManual(item.asset.metadata.printGuide.manual); }
      catch (error) { recordClientTechnicalError({ code: 'PRINT_MANUAL_DOWNLOAD_FAILED', detail: String(error?.message) }).catch(() => {}); }
    }
    localManifest.push({
      eventResourceId: String(item.eventResourceId),
      purpose: item.purpose,
      placement: item.placement,
      assetId: String(item?.asset?.id || ''),
      mimeType: item?.asset?.mimeType || '',
      metadata: item?.asset?.metadata || null,
      path: target,
      uri: `file://${target}`,
      sha256: expectedHash,
      sizeBytes: expectedSize,
      localAvailable: true,
    });
    onProgress({ item: index + 1, total: manifest.length, percent: 100, phase: 'verified' });
  }
  return localManifest;
}

export async function persistMirrorCapture({ sessionId, runId, clientCaptureId, sourcePath, mimeType = 'image/jpeg' }) {
  const directory = `${CAPTURE_ROOT}/${safePart(sessionId)}/${safePart(runId)}`;
  await mkdir(directory);
  const target = `${directory}/${safePart(clientCaptureId)}.${extensionFor(mimeType, 'jpg')}`;
  const normalizedSource = String(sourcePath || '').replace(/^file:\/\//, '');
  if (normalizedSource !== target) {
    if (await exists(target)) await unlink(target);
    await moveFile(normalizedSource, target);
  }
  const file = await stat(target);
  return {
    path: target,
    uri: `file://${target}`,
    mimeType,
    sizeBytes: Number(file.size),
    sha256: await hash(target, 'sha256'),
  };
}

export async function persistMirrorOutput({ sessionId, runId, clientAssetId, sourcePath, mimeType = 'image/jpeg' }) {
  const directory = `${CAPTURE_ROOT}/${safePart(sessionId)}/${safePart(runId)}`;
  await mkdir(directory);
  const target = `${directory}/output-${safePart(clientAssetId)}.${extensionFor(mimeType, 'jpg')}`;
  const normalizedSource = String(sourcePath || '').replace(/^file:\/\//, '');
  if (normalizedSource !== target) {
    if (await exists(target)) await unlink(target);
    await moveFile(normalizedSource, target);
  }
  const file = await stat(target);
  return { path: target, uri: `file://${target}`, mimeType, sizeBytes: Number(file.size), sha256: await hash(target, 'sha256') };
}

export async function describeMirrorFile(path, mimeType = 'image/jpeg') {
  const normalized = String(path || '').replace(/^file:\/\//, '');
  const file = await stat(normalized);
  return { path: normalized, uri: `file://${normalized}`, mimeType, sizeBytes: Number(file.size), sha256: await hash(normalized, 'sha256') };
}
