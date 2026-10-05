import { Platform } from 'react-native';
import { exists, hash, downloadFile, moveFile } from '@dr.pogodin/react-native-fs';
import { guideForProfile, cachePrinterManual } from '../src/services/printerGuide';
const metadata = { printProfile: { manufacturer: 'Canon', model: 'SELPHY CP1500' } };
it('provides the CP1500 Wi-Fi guide and prefers published manual steps', () => {
  expect(guideForProfile(metadata).stepsByPlatform.ios.join(' ')).toContain('CP1500');
  expect(guideForProfile({}).steps).toEqual([]);
  const guide = { steps: ['Custom step'], revision: 'v1' };
  expect(guideForProfile({ ...metadata, printGuide: guide })).toBe(guide);
});
it('includes Mopria for Android without pretending Bluetooth is supported', () => {
  const original = Platform.OS;
  Platform.OS = 'android';
  expect(guideForProfile(metadata).stepsByPlatform.android.join(' ')).toContain('Mopria');
  Platform.OS = original;
});
it('opens cached manual without network and refuses untrusted file identities', async () => {
  const sha256 = 'a'.repeat(64);
  exists.mockResolvedValue(true); hash.mockResolvedValue(sha256);
  downloadFile.mockClear();
  expect(await cachePrinterManual({ sha256, url: 'https://media.example/manual.pdf' })).toContain(`${sha256}.pdf`);
  expect(downloadFile).not.toHaveBeenCalled();
  expect(await cachePrinterManual({ sha256: '../escape', url: 'https://media.example/manual.pdf' })).toBeNull();
});
it('verifies downloaded PDFs before making them available offline', async () => {
  const sha256 = 'b'.repeat(64);
  exists.mockResolvedValue(false); hash.mockResolvedValue(sha256);
  downloadFile.mockReturnValue({ jobId: 1, promise: Promise.resolve({ statusCode: 200 }) });
  moveFile.mockClear();
  await cachePrinterManual({ sha256, url: 'https://media.example/manual.pdf' });
  expect(moveFile).toHaveBeenCalled();
  hash.mockResolvedValue('wrong');
  await expect(cachePrinterManual({ sha256: 'c'.repeat(64), url: 'https://media.example/manual.pdf' })).rejects.toThrow('MANUAL_INVALID');
});
