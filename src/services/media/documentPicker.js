import { Platform } from 'react-native';
import { isKnownType, pick } from '@react-native-documents/picker';
import { assertResourceFileType, normalizeResourceMime, resourceFileTypes } from './resourceFileTypes';

export async function pickLibraryResourceFile(purpose = '', options = {}) {
  try {
    const allowed = resourceFileTypes(purpose, options);
    if (!allowed.length) throw new Error('RESOURCE_FILE_PURPOSE_INVALID');
    // iOS expects UTTypes, not MIME strings. Resolve through the installed native picker.
    const type = Platform.OS === 'ios'
      ? [...new Set(await Promise.all(allowed.map(async value => (await isKnownType({ kind: 'mimeType', value })).UTType || 'public.data')))]
      : allowed;
    const [file] = await pick({ type, mode: 'import', allowMultiSelection: false });
    if (!file?.uri) return null;
    return assertResourceFileType({
      uri: file.uri,
      fileName: file.name || 'recurso',
      type: normalizeResourceMime(file.type, file.name),
      fileSize: Number(file.size || 0),
    }, purpose, options);
  } catch (error) {
    if (error?.code === 'OPERATION_CANCELED' || error?.code === 'DOCUMENT_PICKER_CANCELED') return null;
    throw error;
  }
}
