import ImagePicker from 'react-native-image-crop-picker';
import { tokens } from '../../design-system/tokens';
import { t } from '../../i18n';

const ALLOWED_LOGO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/avif']);
const LOGO_CROP_SIZE = 1024;

function normalizeImageType(value) {
  const type = String(value || '').toLowerCase();
  if (type === 'image/jpg') return 'image/jpeg';
  return type;
}

function normalizeFileName(fileName, contentType) {
  const fallbackExt = contentType === 'image/png' ? 'png'
    : contentType === 'image/webp' ? 'webp'
      : contentType === 'image/heic' ? 'heic'
        : contentType === 'image/heif' ? 'heif'
          : contentType === 'image/avif' ? 'avif'
            : 'jpg';
  const rawName = String(fileName || `logo.${fallbackExt}`);
  if (/\.[a-z0-9]+$/i.test(rawName)) return rawName.replace(/\.[a-z0-9]+$/i, `.${fallbackExt}`);
  return `${rawName}.${fallbackExt}`;
}

function normalizeLocalUri(value) {
  const uri = String(value || '');
  if (!uri) return '';
  if (/^[a-z]+:\/\//i.test(uri)) return uri;
  return `file://${uri}`;
}

async function pickImage({ source = 'gallery', square = true, title = t('account_061') } = {}) {
  let image;
  const options = {
    mediaType: 'photo',
    cropping: square,
    width: square ? LOGO_CROP_SIZE : undefined,
    height: square ? LOGO_CROP_SIZE : undefined,
    forceJpg: true,
    writeTempFile: true,
    includeExif: false,
    waitAnimationEnd: false,
    cropperToolbarTitle: title,
    cropperChooseText: t('account_062'),
    cropperCancelText: t('account_028'),
    cropperCircleOverlay: false,
    cropperRotateButtonsHidden: false,
    freeStyleCropEnabled: !square,
    showCropFrame: true,
    showCropGuidelines: true,
    avoidEmptySpaceAroundImage: true,
    compressImageMaxWidth: square ? LOGO_CROP_SIZE : LOGO_CROP_SIZE * 2,
    compressImageMaxHeight: square ? LOGO_CROP_SIZE : LOGO_CROP_SIZE * 2,
    compressImageQuality: 0.9,
    cropperChooseColor: tokens.colors.primary,
    cropperCancelColor: tokens.colors.primary,
    cropperToolbarColor: tokens.colors.primary,
    cropperToolbarWidgetColor: tokens.colors.actionPrimaryText,
  };
  try {
    image = source === 'camera' ? await ImagePicker.openCamera(options) : await ImagePicker.openPicker(options);
  } catch (err) {
    if (err?.code === 'E_PICKER_CANCELLED') return null;
    throw err;
  }

  if (!image?.path) return null;
  const contentType = normalizeImageType(image.mime || 'image/jpeg');
  if (!ALLOWED_LOGO_TYPES.has(contentType)) {
    throw new Error('El logo debe ser una imagen JPG, PNG, WebP, HEIC o AVIF');
  }
  if (square && image.width && image.height && image.width !== image.height) {
    throw new Error(t('account_063'));
  }
  return {
    uri: normalizeLocalUri(image.path),
    fileName: normalizeFileName(image.filename || 'logo', contentType),
    type: contentType,
    fileSize: image.size || 1,
    width: image.width,
    height: image.height,
  };
}

export async function pickLogoImage() {
  return pickImage({ source: 'gallery', square: true, title: t('account_061') });
}

export async function pickEventResourceImage({ source = 'gallery', purpose = 'background' } = {}) {
  return pickImage({ source, square: purpose === 'logo', title: purpose === 'logo' ? t('event_112') : t('event_113') });
}
