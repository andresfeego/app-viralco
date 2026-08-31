import { pick } from '@react-native-documents/picker';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/gif',
  'video/mp4', 'video/quicktime', 'video/webm',
  'font/ttf', 'font/otf', 'font/woff', 'font/woff2', 'application/font-sfnt',
];

export async function pickLibraryResourceFile() {
  try {
    const [file] = await pick({ type: ALLOWED_TYPES, mode: 'import', allowMultiSelection: false });
    if (!file?.uri) return null;
    return {
      uri: file.uri,
      fileName: file.name || 'recurso',
      type: file.type || file.nativeType || 'application/octet-stream',
      fileSize: Number(file.size || 0),
    };
  } catch (error) {
    if (error?.code === 'OPERATION_CANCELED' || error?.code === 'DOCUMENT_PICKER_CANCELED') return null;
    throw error;
  }
}
