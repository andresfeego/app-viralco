import { t } from '../../i18n';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const FONT_TYPES = ['font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-sfnt'];
const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
  heif: 'image/heif', avif: 'image/avif', gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime',
  webm: 'video/webm', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
};

export function resourceFileTypes(purpose = '', { staticOnly = false } = {}) {
  if (purpose === 'background' || purpose === 'frame') return IMAGE_TYPES;
  // Match the server contract: still stickers are PNG; animated stickers are GIF.
  if (purpose === 'sticker') return staticOnly ? ['image/png'] : ['image/png', 'image/gif'];
  if (purpose === 'animation') return VIDEO_TYPES;
  if (purpose === 'font') return FONT_TYPES;
  if (!purpose) return [...IMAGE_TYPES, 'image/gif', ...VIDEO_TYPES, ...FONT_TYPES];
  return [];
}

export function normalizeResourceMime(type, name) {
  const provided = String(type || '').toLowerCase();
  const extension = String(name || '').toLowerCase().split('.').pop();
  if (provided === 'image/jpg') return 'image/jpeg';
  if (FONT_TYPES.includes(MIME_BY_EXTENSION[extension]) && /^(application\/|font\/|public\.|dyn\.)/.test(provided)) return MIME_BY_EXTENSION[extension];
  if (provided.includes('/') && provided !== 'application/octet-stream') return provided;
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

export function assertResourceFileType(file, purpose, options = {}) {
  if (!resourceFileTypes(purpose, options).includes(file.type)) {
    throw new Error(t(purpose === 'sticker' && options.staticOnly ? 'resource_static_png_required' : 'resource_wrong_file_type'));
  }
  return file;
}
