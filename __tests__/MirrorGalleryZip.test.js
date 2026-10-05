import { Buffer } from 'buffer';
import { unzipSync } from 'fflate';
import * as fs from '@dr.pogodin/react-native-fs';
import { createMirrorGalleryZip } from '../src/services/mirrorGalleryZip';

jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/cache', mkdir: jest.fn(), read: jest.fn(), stat: jest.fn(), writeFile: jest.fn(), appendFile: jest.fn(), unlink: jest.fn(), getFSInfo: jest.fn(),
}));
it('streams a valid ZIP containing the exact bytes of every composition', async () => {
  const files = { '/one.jpg': Buffer.alloc(600000, 17), '/two.jpg': Buffer.from('another image') };
  const parts = [];
  fs.getFSInfo.mockResolvedValue({ freeSpace: 10000000 });
  fs.stat.mockImplementation(async (path) => ({ size: files[path].length }));
  fs.read.mockImplementation(async (path, length, offset) => files[path].subarray(offset, offset + length).toString('base64'));
  fs.appendFile.mockImplementation(async (_path, data) => { parts.push(Buffer.from(data, 'base64')); });
  const uri = await createMirrorGalleryZip(Object.keys(files).map((path) => ({ output: { path } })));
  expect(uri).toMatch(/^file:\/\/\/cache\/kaptura-gallery-exports\/.+\.zip$/);
  const unpacked = unzipSync(Buffer.concat(parts));
  expect(Buffer.from(unpacked['foto-0001.jpg'])).toEqual(files['/one.jpg']);
  expect(Buffer.from(unpacked['foto-0002.jpg'])).toEqual(files['/two.jpg']);
  expect(fs.read.mock.calls.every((call) => call[1] <= 256 * 1024)).toBe(true);
});
it('rejects missing files and insufficient space before starting an export', async () => {
  fs.stat.mockResolvedValue({ size: 1000 });
  fs.getFSInfo.mockResolvedValue({ freeSpace: 10 });
  await expect(createMirrorGalleryZip([{ output: { path: '/file.jpg' } }])).rejects.toThrow('MIRROR_ZIP_STORAGE_FULL');
});
