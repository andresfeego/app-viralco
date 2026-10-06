import { PermissionsAndroid, Platform } from 'react-native';
import { pick } from '@react-native-documents/picker';
import { stat } from '@dr.pogodin/react-native-fs';

const MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const IOS_TYPES = ['public.jpeg', 'public.png', 'com.adobe.pdf'];
const EXTENSIONS = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
const MAX_BYTES = 10 * 1024 * 1024;
const fail = (code, detail = code) => Object.assign(new Error(detail), { code });
let picking = false;

async function validate(file) {
  if (!file?.uri) return null;
  const provided = String(file.type || '').toLowerCase();
  const type = provided === 'image/jpg' ? 'image/jpeg'
    : MIME_TYPES.includes(provided) ? provided
      : !provided || provided === 'application/octet-stream' || IOS_TYPES.includes(provided)
        ? EXTENSIONS[String(file.name || '').toLowerCase().split('.').pop()] : provided;
  if (!MIME_TYPES.includes(type)) throw fail('RECEIPT_FILE_TYPE');
  const size = Number(file.size ?? (await stat(file.uri)).size);
  if (!Number.isFinite(size) || size <= 0) throw fail('RECEIPT_FILE_INVALID');
  if (size > MAX_BYTES) throw fail('RECEIPT_TOO_LARGE');
  return { uri: file.uri, name: file.name || `comprobante.${type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg'}`, type, size };
}

// Private billing attachment only: no resource-library upload or image cropping.
export async function pickReceiptFromDevice(source) {
  if (picking) return null;
  picking = true;
  try {
    if (source === 'files') {
      const [file] = await pick({ type: Platform.OS === 'ios' ? IOS_TYPES : MIME_TYPES, mode: 'import', allowMultiSelection: false });
      return await validate(file);
    }
    if (!['camera', 'gallery'].includes(source)) throw fail('RECEIPT_SOURCE_INVALID');
    if (source === 'camera' && Platform.OS === 'android') {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) throw fail('RECEIPT_PERMISSION');
    }
    const { launchCamera, launchImageLibrary } = require('react-native-image-picker');
    const result = await (source === 'camera' ? launchCamera : launchImageLibrary)({
      mediaType: 'photo', selectionLimit: 1, quality: 1, conversionQuality: 1,
      assetRepresentationMode: 'compatible', includeBase64: false, includeExtra: false, saveToPhotos: false,
    });
    if (result.didCancel) return null;
    if (result.errorCode) throw fail(result.errorCode === 'permission' ? 'RECEIPT_PERMISSION'
      : result.errorCode === 'camera_unavailable' ? 'RECEIPT_CAMERA_UNAVAILABLE' : 'RECEIPT_PICKER_FAILED', `${result.errorCode}: ${result.errorMessage || ''}`);
    const asset = result.assets?.[0];
    return await validate(asset && { uri: asset.uri, name: asset.fileName, type: asset.type, size: asset.fileSize });
  } catch (error) {
    if (['OPERATION_CANCELED', 'DOCUMENT_PICKER_CANCELED', 'E_PICKER_CANCELLED'].includes(error?.code)) return null;
    throw error;
  } finally { picking = false; }
}
