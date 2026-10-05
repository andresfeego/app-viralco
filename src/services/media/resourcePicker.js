import { PermissionsAndroid, Platform } from 'react-native';
import { t } from '../../i18n';
import { recordClientTechnicalError } from '../errorHandling';
import { pickLibraryResourceFile } from './documentPicker';
import { assertResourceFileType, normalizeResourceMime, resourceFileTypes } from './resourceFileTypes';

export function resourceSources(purpose) {
  if (purpose === 'background') return ['camera', 'gallery', 'files'];
  if (['frame', 'sticker', 'animation'].includes(purpose)) return ['gallery', 'files'];
  if (purpose === 'font') return ['files'];
  return [];
}

let picking = false;
export async function pickResourceFromDevice(purpose, source = 'files', options = {}) {
  if (picking) return null;
  picking = true;
  try {
    if (!resourceSources(purpose).includes(source)) throw new Error('RESOURCE_SOURCE_INVALID');
    if (source === 'files') return await pickLibraryResourceFile(purpose, options);
    if (source === 'camera' && Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error(t('resource_camera_permission'));
    }
    // Do not reuse the logo cropper: it crops to a square and forces JPEG, losing alpha.
    const { launchCamera, launchImageLibrary } = require('react-native-image-picker');
    const pickMedia = source === 'camera' ? launchCamera : launchImageLibrary;
    const result = await pickMedia({
      mediaType: purpose === 'animation' ? 'video' : 'photo',
      selectionLimit: 1,
      quality: 1,
      assetRepresentationMode: 'current',
      restrictMimeTypes: resourceFileTypes(purpose, options),
      includeExtra: false,
      includeBase64: false,
      saveToPhotos: false,
    });
    if (result.didCancel) return null;
    if (result.errorCode) {
      await recordClientTechnicalError({ code: 'RESOURCE_PICKER_NATIVE', detail: `${result.errorCode}: ${result.errorMessage || ''}` });
      throw new Error(t(result.errorCode === 'permission' ? 'resource_media_permission' : result.errorCode === 'camera_unavailable' ? 'mirror_camera_unavailable' : 'resource_picker_failed'));
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) return null;
    return assertResourceFileType({ ...asset, fileName: asset.fileName || 'recurso', type: normalizeResourceMime(asset.type, asset.fileName), fileSize: Number(asset.fileSize || 0) }, purpose, options);
  } catch (error) {
    if (['OPERATION_CANCELED', 'DOCUMENT_PICKER_CANCELED', 'E_PICKER_CANCELLED'].includes(error?.code)) return null;
    await recordClientTechnicalError({ code: 'RESOURCE_PICKER_FAILED', detail: error?.message });
    const readableMessages = ['resource_camera_permission', 'resource_media_permission', 'mirror_camera_unavailable', 'resource_picker_failed', 'resource_wrong_file_type', 'resource_static_png_required'].map(t);
    throw new Error(readableMessages.includes(error?.message) ? error.message : t('resource_picker_failed'));
  } finally { picking = false; }
}
