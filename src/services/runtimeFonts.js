import NativeKapturaFontLoader from '../../specs/NativeKapturaFontLoader';
import { recordClientTechnicalError } from './errorHandling';

const loadedFonts = new Map();

function fontSource(resource) {
  const asset = resource?.asset || {};
  return {
    id: String(asset.id || resource?.libraryAssetId || resource?.id || ''),
    fingerprint: String(asset.metadata?.sha256 || asset.updatedAt || ''),
    storageKey: String(asset.storageKey || ''),
    // Library objects are public media. Prefer the stable R2 URL so a font can
    // still be loaded after a short-lived signed catalog URL has expired.
    url: asset.fileUrl || asset.fileSignedUrl || '',
  };
}

export function loadRuntimeFont(resource) {
  const source = fontSource(resource);
  const loader = NativeKapturaFontLoader;
  if (!source.id || !source.url) return Promise.resolve(null);
  if (!loader?.loadFont) {
    recordClientTechnicalError({
      code: 'RUNTIME_FONT_LOADER_UNAVAILABLE',
      path: source.storageKey,
      detail: 'NativeKapturaFontLoader TurboModule is unavailable',
    }).catch(() => {});
    return Promise.resolve(null);
  }
  const cacheKey = `${source.id}:${source.fingerprint}`;
  if (!loadedFonts.has(cacheKey)) {
    const promise = loader.loadFont(cacheKey, source.url)
      .then((fontFamily) => String(fontFamily || '') || null)
      .catch(async (error) => {
        loadedFonts.delete(cacheKey);
        await recordClientTechnicalError({
          code: 'RUNTIME_FONT_LOAD_FAILED',
          path: source.storageKey,
          detail: error?.message || String(error),
        });
        return null;
      });
    loadedFonts.set(cacheKey, promise);
  }
  return loadedFonts.get(cacheKey);
}

export function clearRuntimeFontCacheForTests() {
  loadedFonts.clear();
}
