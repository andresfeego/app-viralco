import { PermissionsAndroid, Platform } from 'react-native';
import { pick } from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from '@dr.pogodin/react-native-fs';
import { pickReceiptFromDevice } from '../src/services/media/receiptPicker';

jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test.each(['ios', 'android'])('imports a single private PDF with correct native filters on %s', async platform => {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: platform, configurable: true });
  const file = { uri: 'file:///proof.pdf', name: 'proof.pdf', type: 'application/pdf', size: 100 };
  pick.mockResolvedValueOnce([file]);
  try {
    await expect(pickReceiptFromDevice('files')).resolves.toEqual(file);
    expect(pick).toHaveBeenCalledWith({ type: platform === 'ios' ? ['public.jpeg', 'public.png', 'com.adobe.pdf'] : ['image/jpeg', 'image/png', 'application/pdf'], mode: 'import', allowMultiSelection: false });
  } finally { Object.defineProperty(Platform, 'OS', { value: previous, configurable: true }); }
});

test.each(['camera', 'gallery'])('normalizes %s photos without cropping, resizing or saving to the album', async source => {
  const nativePicker = source === 'camera' ? launchCamera : launchImageLibrary;
  nativePicker.mockResolvedValueOnce({ assets: [{ uri: 'file:///proof.jpg', fileName: 'proof.jpg', type: 'image/jpg', fileSize: 100 }] });
  await expect(pickReceiptFromDevice(source)).resolves.toEqual({ uri: 'file:///proof.jpg', name: 'proof.jpg', type: 'image/jpeg', size: 100 });
  expect(nativePicker).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', selectionLimit: 1, assetRepresentationMode: 'compatible', quality: 1, conversionQuality: 1, saveToPhotos: false }));
  const options = nativePicker.mock.calls[0][0];
  expect(options).not.toHaveProperty('maxWidth');
  expect(options).not.toHaveProperty('maxHeight');
});

test('cancels quietly and unlocks the picker for the next attempt', async () => {
  pick.mockRejectedValueOnce({ code: 'OPERATION_CANCELED' }).mockResolvedValueOnce([]);
  launchImageLibrary.mockResolvedValueOnce({ didCancel: true }).mockResolvedValueOnce({ assets: [] });
  for (const source of ['files', 'files', 'gallery', 'gallery']) await expect(pickReceiptFromDevice(source)).resolves.toBeNull();
});

test('blocks concurrent native pickers', async () => {
  let finish;
  launchImageLibrary.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const first = pickReceiptFromDevice('gallery');
  await expect(pickReceiptFromDevice('files')).resolves.toBeNull();
  expect(pick).not.toHaveBeenCalled();
  finish({ didCancel: true });
  await first;
});

test.each(['image/gif', 'image/heic', 'video/mp4', 'application/zip'])('rejects unsupported %s even if the name says JPEG', async type => {
  pick.mockResolvedValueOnce([{ uri: 'file:///proof', name: 'proof.jpg', type, size: 100 }]);
  await expect(pickReceiptFromDevice('files')).rejects.toMatchObject({ code: 'RECEIPT_FILE_TYPE' });
});

test('checks size for documents and photos, including providers without size metadata', async () => {
  pick.mockResolvedValueOnce([{ uri: 'file:///proof.pdf', name: 'proof.pdf', type: 'application/pdf', size: 10 * 1024 * 1024 + 1 }]);
  await expect(pickReceiptFromDevice('files')).rejects.toMatchObject({ code: 'RECEIPT_TOO_LARGE' });
  launchImageLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///photo.png', type: 'image/png' }] });
  RNFS.stat.mockResolvedValueOnce({ size: 10 * 1024 * 1024 });
  await expect(pickReceiptFromDevice('gallery')).resolves.toMatchObject({ name: 'comprobante.png', size: 10 * 1024 * 1024 });
  pick.mockResolvedValueOnce([{ uri: 'file:///empty.pdf', name: 'empty.pdf', type: 'application/pdf', size: 0 }]);
  await expect(pickReceiptFromDevice('files')).rejects.toMatchObject({ code: 'RECEIPT_FILE_INVALID' });
});

test.each([['permission', 'RECEIPT_PERMISSION'], ['camera_unavailable', 'RECEIPT_CAMERA_UNAVAILABLE'], ['others', 'RECEIPT_PICKER_FAILED']])('maps native %s errors to safe UI codes', async (errorCode, code) => {
  launchCamera.mockResolvedValueOnce({ errorCode, errorMessage: 'Native details for logging' });
  await expect(pickReceiptFromDevice('camera')).rejects.toMatchObject({ code, message: expect.stringContaining('Native details') });
});

test('requires the declared Android camera permission', async () => {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED).mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);
  try {
    await expect(pickReceiptFromDevice('camera')).rejects.toMatchObject({ code: 'RECEIPT_PERMISSION' });
    expect(launchCamera).not.toHaveBeenCalled();
    launchCamera.mockResolvedValueOnce({ didCancel: true });
    await expect(pickReceiptFromDevice('camera')).resolves.toBeNull();
    expect(request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.CAMERA);
  } finally { request.mockRestore(); Object.defineProperty(Platform, 'OS', { value: previous, configurable: true }); }
});
