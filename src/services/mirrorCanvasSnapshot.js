import { Image, Platform } from 'react-native';
import { captureRef } from 'react-native-view-shot';

function imageDimensions(path) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('MIRROR_OUTPUT_DIMENSIONS_TIMEOUT')), 10000);
    Image.getSize(path.startsWith('file://') ? path : `file://${path}`, (width, height) => {
      clearTimeout(timer);
      resolve({ width, height });
    }, (error) => { clearTimeout(timer); reject(error); });
  });
}

export async function snapshotMirrorCanvas(ref, { width, height, quality }) {
  try {
    const path = await captureRef(ref, {
      format: 'jpg', result: 'tmpfile', quality, width, height,
      // This subtree contains only static images, solid colors and text. Neither
      // the camera nor processing video is a descendant of the captured view.
      ...(Platform.OS === 'ios' ? { useRenderInContext: true, kapturaExactPixels: true } : {}),
    });
    const actual = await imageDimensions(path);
    if (actual.width !== width || actual.height !== height) {
      const error = new Error('MIRROR_OUTPUT_DIMENSIONS_INVALID');
      error.details = { expected: { width, height }, actual };
      throw error;
    }
    return path;
  } catch (cause) {
    const error = new Error('MIRROR_OUTPUT_SNAPSHOT_FAILED');
    error.details = { nativeMessage: cause?.message || String(cause), ...cause?.details };
    throw error;
  }
}
