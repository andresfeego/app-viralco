import ImageCropPicker from 'react-native-image-crop-picker';
import { pickLogoImage } from '../src/services/media/imagePicker';

jest.mock('react-native-image-crop-picker', () => ({ __esModule: true, default: { openPicker: jest.fn() } }));

const mockedOpenPicker = ImageCropPicker.openPicker as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

test('pickLogoImage opens a square cropper and normalizes local uri', async () => {
  mockedOpenPicker.mockResolvedValue({
    path: '/tmp/cropped-logo.jpg',
    filename: 'IMG_001.HEIC',
    mime: 'image/jpeg',
    size: 1234,
    width: 1024,
    height: 1024,
  });

  const image = await pickLogoImage();

  expect(mockedOpenPicker).toHaveBeenCalledWith(expect.objectContaining({
    mediaType: 'photo',
    cropping: true,
    width: 1024,
    height: 1024,
    forceJpg: true,
    writeTempFile: true,
    waitAnimationEnd: false,
    freeStyleCropEnabled: false,
  }));
  expect(image).toEqual(expect.objectContaining({
    uri: 'file:///tmp/cropped-logo.jpg',
    fileName: 'IMG_001.jpg',
    type: 'image/jpeg',
    fileSize: 1234,
    width: 1024,
    height: 1024,
  }));
});

test('pickLogoImage returns null when user cancels cropper flow', async () => {
  mockedOpenPicker.mockRejectedValueOnce({ code: 'E_PICKER_CANCELLED' });
  await expect(pickLogoImage()).resolves.toBeNull();
});
