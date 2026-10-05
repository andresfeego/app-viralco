import { Image, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { snapshotMirrorCanvas } from '../src/services/mirrorCanvasSnapshot';

const options = { width: 2000, height: 2960, quality: 0.92 };
const originalPlatform = Platform.OS;
beforeEach(() => {
  captureRef.mockReset().mockResolvedValue('/tmp/output.jpg');
  jest.spyOn(Image, 'getSize').mockImplementation((_uri, done) => done(options.width, options.height));
});
afterEach(() => { jest.restoreAllMocks(); Platform.OS = originalPlatform; });

it.each(['ios', 'android'])('exports exact published dimensions on %s', async (platform) => {
  Platform.OS = platform;
  const ref = { current: {} };
  await expect(snapshotMirrorCanvas(ref, options)).resolves.toBe('/tmp/output.jpg');
  expect(captureRef).toHaveBeenCalledWith(ref, {
    ...options, format: 'jpg', result: 'tmpfile',
    ...(platform === 'ios' ? { useRenderInContext: true, kapturaExactPixels: true } : {}),
  });
  expect(Image.getSize).toHaveBeenCalledWith('file:///tmp/output.jpg', expect.any(Function), expect.any(Function));
});

it('rejects oversized Retina output instead of silently delivering incorrect dimensions', async () => {
  Image.getSize.mockImplementation((_uri, done) => done(6000, 8880));
  await expect(snapshotMirrorCanvas({}, options)).rejects.toMatchObject({
    message: 'MIRROR_OUTPUT_SNAPSHOT_FAILED',
    details: { nativeMessage: 'MIRROR_OUTPUT_DIMENSIONS_INVALID', expected: { width: 2000, height: 2960 }, actual: { width: 6000, height: 8880 } },
  });
});

it('wraps a native snapshot error while retaining the original detail for logging', async () => {
  const message = 'The view cannot be captured. drawViewHierarchyInRect was not successful.';
  captureRef.mockRejectedValueOnce(new Error(message));
  await expect(snapshotMirrorCanvas({}, options)).rejects.toMatchObject({ message: 'MIRROR_OUTPUT_SNAPSHOT_FAILED', details: { nativeMessage: message } });
  expect(Image.getSize).not.toHaveBeenCalled();
});

it('does not accept an unreadable result', async () => {
  Image.getSize.mockImplementation((_uri, _done, failed) => failed(new Error('Unreadable image')));
  await expect(snapshotMirrorCanvas({}, options)).rejects.toMatchObject({ message: 'MIRROR_OUTPUT_SNAPSHOT_FAILED' });
});
