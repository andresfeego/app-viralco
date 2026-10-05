jest.mock('@react-native-documents/picker', () => ({ pick: jest.fn(), isKnownType: jest.fn(({ value }) => ({ UTType: `public.${value.split('/')[1]}` })) }));

import { isKnownType, pick } from '@react-native-documents/picker';
import { Platform } from 'react-native';
import { pickLibraryResourceFile } from '../src/services/media/documentPicker';

const mockedPick = pick as jest.Mock;

beforeEach(() => jest.clearAllMocks());

test('normalizes a selected resource file', async () => {
  mockedPick.mockResolvedValue([{ uri: 'file:///asset.webp', name: 'asset.webp', type: 'image/webp', size: 42 }]);
  await expect(pickLibraryResourceFile()).resolves.toEqual({
    uri: 'file:///asset.webp',
    fileName: 'asset.webp',
    type: 'image/webp',
    fileSize: 42,
  });
});

test('returns null when selection is cancelled', async () => {
  mockedPick.mockRejectedValue({ code: 'OPERATION_CANCELED' });
  await expect(pickLibraryResourceFile()).resolves.toBeNull();
});

test('infers a font MIME type when the platform omits it', async () => {
  mockedPick.mockResolvedValue([{ uri: 'file:///brand.woff2', name: 'brand.woff2', type: null, size: 64 }]);
  await expect(pickLibraryResourceFile()).resolves.toMatchObject({ type: 'font/woff2' });
});

test('uses native iOS type identifiers and rejects mismatched files even if the provider allows them', async () => {
  mockedPick.mockResolvedValue([{ uri: 'file:///clip.mp4', name: 'clip.mp4', type: 'video/mp4', size: 42 }]);
  await expect(pickLibraryResourceFile('frame')).rejects.toThrow('El archivo no corresponde');
  expect(isKnownType).toHaveBeenCalledWith({ kind: 'mimeType', value: 'image/png' });
  expect(mockedPick.mock.calls[0][0].type).toContain('public.png');
  expect(mockedPick.mock.calls[0][0].type.some((value: string) => value.includes('/'))).toBe(false);
});

test('filters Android animations to video MIME types', async () => {
  const previous = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  try {
    mockedPick.mockResolvedValue([{ uri: 'content://clip', name: 'clip.mp4', type: 'video/mp4', size: 42 }]);
    await expect(pickLibraryResourceFile('animation')).resolves.toMatchObject({ type: 'video/mp4' });
    expect(mockedPick).toHaveBeenCalledWith(expect.objectContaining({ type: ['video/mp4', 'video/quicktime', 'video/webm'] }));
    expect(isKnownType).not.toHaveBeenCalled();
  } finally { Object.defineProperty(Platform, 'OS', { value: previous, configurable: true }); }
});

test('accepts downloaded font aliases but rejects GIF stickers inside the mirror editor', async () => {
  mockedPick.mockResolvedValue([{ uri: 'file:///font.woff2', name: 'font.woff2', type: 'application/octet-stream', size: 42 }]);
  await expect(pickLibraryResourceFile('font')).resolves.toMatchObject({ type: 'font/woff2' });
  mockedPick.mockResolvedValue([{ uri: 'file:///sticker.gif', name: 'sticker.gif', type: 'image/gif', size: 42 }]);
  await expect(pickLibraryResourceFile('sticker', { staticOnly: true })).rejects.toThrow('PNG sin movimiento');
  await expect(pickLibraryResourceFile('sticker')).resolves.toMatchObject({ type: 'image/gif' });
});

test('unregistered font types stay selectable and are validated after selection', async () => {
  (isKnownType as jest.Mock).mockReturnValueOnce({ UTType: null });
  mockedPick.mockResolvedValue([{ uri: 'file:///font.ttf', name: 'font.ttf', type: null, size: 42 }]);
  await expect(pickLibraryResourceFile('font')).resolves.toMatchObject({ type: 'font/ttf' });
  expect(mockedPick.mock.calls[0][0].type).toContain('public.data');
});
