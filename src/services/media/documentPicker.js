import { pick } from '@react-native-documents/picker';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-sfnt',
];

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic',
  heif: 'image/heif', avif: 'image/avif', gif: 'image/gif', mp4: 'video/mp4', mov: 'video/quicktime',
  webm: 'video/webm', ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
};

function normalizedMimeType(file) {
  const provided = String(file?.type || '');
  if (provided.includes('/')) return provided.toLowerCase();
  const extension = String(file?.name || '').toLowerCase().split('.').pop();
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
}

export async function pickLibraryResourceFile() {
  try {
    const [file] = await pick({ type: ALLOWED_TYPES, mode: 'import', allowMultiSelection: false });
    if (!file?.uri) return null;
    return {
      uri: file.uri,
      fileName: file.name || 'recurso',
      type: normalizedMimeType(file),
      fileSize: Number(file.size || 0),
    };
  } catch (error) {
    if (error?.code === 'OPERATION_CANCELED' || error?.code === 'DOCUMENT_PICKER_CANCELED') return null;
    throw error;
  }
}
