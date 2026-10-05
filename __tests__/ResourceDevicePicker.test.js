import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pickResourceFromDevice, resourceSources } from '../src/services/media/resourcePicker';
import { pickLibraryResourceFile } from '../src/services/media/documentPicker';
import { recordClientTechnicalError } from '../src/services/errorHandling';

jest.mock('react-native-image-picker', () => ({ launchCamera: jest.fn(), launchImageLibrary: jest.fn() }));
jest.mock('../src/services/media/documentPicker', () => ({ pickLibraryResourceFile: jest.fn() }));
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn(async () => {}) }));

beforeEach(() => jest.clearAllMocks());

test.each(['frame', 'sticker', 'background'])('imports %s PNG without JPEG conversion or resizing', async purpose => {
  const png = { uri: 'file:///alpha.png', fileName: 'alpha.png', type: 'image/png', fileSize: 400, width: 900, height: 1700 };
  launchImageLibrary.mockResolvedValue({ assets: [png] });
  await expect(pickResourceFromDevice(purpose, 'gallery')).resolves.toEqual(png);
  expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', quality: 1, assetRepresentationMode: 'current', selectionLimit: 1 }));
  const options = launchImageLibrary.mock.calls[0][0];
  for (const key of ['maxWidth', 'maxHeight', 'cropping', 'forceJpg']) expect(options).not.toHaveProperty(key);
});

test('animations only offer existing videos, never recording', async () => {
  expect(resourceSources('animation')).toEqual(['gallery', 'files']);
  launchImageLibrary.mockResolvedValue({ assets: [{ uri: 'file:///clip.mov', fileName: 'clip.mov', type: 'video/quicktime', fileSize: 40 }] });
  await expect(pickResourceFromDevice('animation', 'gallery')).resolves.toMatchObject({ type: 'video/quicktime' });
  expect(launchImageLibrary).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'video' }));
  await expect(pickResourceFromDevice('animation', 'camera')).rejects.toThrow('No se pudo');
  expect(launchCamera).not.toHaveBeenCalled();
});

test('only backgrounds open the camera, and fonts are routed to Files', async () => {
  launchCamera.mockResolvedValue({ assets: [{ uri: 'file:///photo.jpg', fileName: 'photo.jpg', type: 'image/jpg', fileSize: 40 }] });
  await expect(pickResourceFromDevice('background', 'camera')).resolves.toMatchObject({ type: 'image/jpeg' });
  expect(launchCamera).toHaveBeenCalledWith(expect.objectContaining({ mediaType: 'photo', saveToPhotos: false }));
  pickLibraryResourceFile.mockResolvedValue({ uri: 'file:///font.ttf' });
  await pickResourceFromDevice('font', 'files');
  expect(pickLibraryResourceFile).toHaveBeenCalledWith('font', {});
});

test('cancellation produces no error and another selection remains possible', async () => {
  launchImageLibrary.mockResolvedValueOnce({ didCancel: true }).mockResolvedValueOnce({ assets: [] });
  await expect(pickResourceFromDevice('frame', 'gallery')).resolves.toBeNull();
  await expect(pickResourceFromDevice('frame', 'gallery')).resolves.toBeNull();
  pickLibraryResourceFile.mockRejectedValueOnce({ code: 'OPERATION_CANCELED' });
  await expect(pickResourceFromDevice('frame', 'files')).resolves.toBeNull();
  expect(recordClientTechnicalError).not.toHaveBeenCalled();
});

test('blocks double presses while a native picker is open', async () => {
  let finish;
  launchImageLibrary.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const first = pickResourceFromDevice('frame', 'gallery');
  await expect(pickResourceFromDevice('frame', 'gallery')).resolves.toBeNull();
  expect(launchImageLibrary).toHaveBeenCalledTimes(1);
  finish({ didCancel: true });
  await first;
});

test('keeps native error details in logs and shows understandable errors', async () => {
  launchImageLibrary.mockResolvedValue({ errorCode: 'others', errorMessage: 'PHPhotosErrorDomain -123 native details' });
  await expect(pickResourceFromDevice('frame', 'gallery')).rejects.toThrow('No se pudo abrir o leer el archivo');
  expect(recordClientTechnicalError).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining('PHPhotosErrorDomain') }));
  launchImageLibrary.mockResolvedValue({ errorCode: 'permission' });
  await expect(pickResourceFromDevice('frame', 'gallery')).rejects.toThrow('Permite el acceso');
});

test('still stickers reject GIF and JPEG while general resource uploads retain GIF support', async () => {
  launchImageLibrary.mockResolvedValue({ assets: [{ uri: 'file:///a.gif', fileName: 'a.gif', type: 'image/gif', fileSize: 40 }] });
  await expect(pickResourceFromDevice('sticker', 'gallery', { staticOnly: true })).rejects.toThrow('PNG sin movimiento');
  await expect(pickResourceFromDevice('sticker', 'gallery')).resolves.toMatchObject({ type: 'image/gif' });
  launchImageLibrary.mockResolvedValue({ assets: [{ uri: 'file:///a.jpg', fileName: 'a.jpg', type: 'image/jpeg', fileSize: 40 }] });
  await expect(pickResourceFromDevice('sticker', 'gallery', { staticOnly: true })).rejects.toThrow('PNG sin movimiento');
});

test('Android asks for declared camera permission before opening capture', async () => {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  const request = jest.spyOn(PermissionsAndroid, 'request').mockResolvedValueOnce(PermissionsAndroid.RESULTS.DENIED).mockResolvedValueOnce(PermissionsAndroid.RESULTS.GRANTED);
  try {
    await expect(pickResourceFromDevice('background', 'camera')).rejects.toThrow('Permite el acceso a la cámara');
    expect(launchCamera).not.toHaveBeenCalled();
    launchCamera.mockResolvedValue({ didCancel: true });
    await expect(pickResourceFromDevice('background', 'camera')).resolves.toBeNull();
    expect(request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.CAMERA);
    expect(launchCamera).toHaveBeenCalledTimes(1);
  } finally { request.mockRestore(); Object.defineProperty(Platform, 'OS', { value: previous, configurable: true }); }
});
