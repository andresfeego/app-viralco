jest.mock('@react-native-documents/picker', () => ({ pick: jest.fn() }));

import { pick } from '@react-native-documents/picker';
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
