import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CachesDirectoryPath,
  DocumentDirectoryPath,
  downloadFile,
  exists,
  getFSInfo,
  hash,
  mkdir,
  moveFile,
  stat,
  unlink,
} from '@dr.pogodin/react-native-fs';
import { createClientUuid, runtimeResourceHash, runtimeResourceUrl } from '../domain/mirrorRuntime';

const INSTALLATION_KEY = '@kaptura/mirror/installation-id';
const RUNTIME_PREFIX = '@kaptura/mirror/runtime/';
const PACKAGE_ROOT = `${CachesDirectoryPath}/kaptura-mirror-packages`;
const CAPTURE_ROOT = `${DocumentDirectoryPath}/kaptura-mirror-captures`;

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
  try { return JSON.parse(raw); } catch { return null; }
}

export async function saveMirrorRuntime(runtime) {
  await AsyncStorage.setItem(runtimeStorageKey(runtime.eventModeId), JSON.stringify({ ...runtime, updatedAt: new Date().toISOString() }));
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
  if (expectedSize && Number(file.size) !== Number(expectedSize)) return false;
  if (expectedHash && /^[a-f0-9]{64}$/.test(expectedHash)) {
    return (await hash(path, 'sha256')).toLowerCase() === expectedHash;
  }
  return true;
}

export async function cacheMirrorPackage({ session, manifest }, onProgress = () => {}) {
  const directory = `${PACKAGE_ROOT}/${safePart(session?.id || session?.clientSessionId)}`;
  await mkdir(directory);
  const localManifest = [];
  for (let index = 0; index < (manifest || []).length; index += 1) {
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
        progress: ({ bytesWritten, contentLength }) => onProgress({
          item: index + 1,
          total: manifest.length,
          percent: contentLength ? Math.round((bytesWritten / contentLength) * 100) : 0,
        }),
      });
      const result = await task.promise;
      if (result.statusCode < 200 || result.statusCode >= 300) throw new Error(`MIRROR_RESOURCE_DOWNLOAD_${result.statusCode}`);
      if (!(await verifiedExistingFile(partial, expectedSize, expectedHash))) {
        await unlink(partial);
        throw new Error('MIRROR_RESOURCE_INTEGRITY_FAILED');
      }
      if (await exists(target)) await unlink(target);
      await moveFile(partial, target);
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
    });
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
