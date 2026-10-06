/* global jest */
jest.mock('@react-native-clipboard/clipboard', () => ({ __esModule: true, default: { setString: jest.fn(), getString: jest.fn(async () => '') } }));
jest.mock('@react-native-documents/picker', () => ({ pick: jest.fn(async () => []) }));
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'device' },
  setGenericPassword: jest.fn(async () => true), getGenericPassword: jest.fn(async () => false), resetGenericPassword: jest.fn(async () => true),
}));
jest.mock('./src/services/mirrorOperationAccess', () => ({
  authorizeMirrorOperation: jest.fn(async () => ({ allowed: true })),
  assertOfflineOperation: jest.fn(async () => {}),
  readOperationAccess: jest.fn(async () => ({ allowed: true })),
  subscribeOperationAccess: jest.fn(() => () => {}), revalidateKnownOperations: jest.fn(async () => {}),
  knownOperations: jest.fn(async () => []),
}));
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Camera: (props) => React.createElement(View, { ...props, testID: props.testID || 'camera-preview' }),
    VisionCamera: { createDeviceFactory: jest.fn() },
    useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn(() => Promise.resolve(true)) }),
    usePhotoOutput: () => ({ capturePhotoToFile: jest.fn(() => Promise.resolve({ filePath: '/tmp/photo.jpg' })) }),
  };
});
jest.mock('@dr.pogodin/react-native-fs', () => ({
  CachesDirectoryPath: '/tmp/cache',
  DocumentDirectoryPath: '/tmp/documents',
  downloadFile: jest.fn(() => ({ promise: Promise.resolve({ statusCode: 200 }) })),
  exists: jest.fn(() => Promise.resolve(true)),
  getFSInfo: jest.fn(() => Promise.resolve({ freeSpace: 1024 * 1024 * 1024, totalSpace: 1024 * 1024 * 1024 })),
  hash: jest.fn(() => Promise.resolve('a'.repeat(64))),
  mkdir: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  stopDownload: jest.fn(),
  stat: jest.fn(() => Promise.resolve({ size: 100 })),
  unlink: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));
jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(() => Promise.resolve('/tmp/output.jpg')) }));
jest.mock('react-native-share', () => ({ __esModule: true, default: { open: jest.fn(() => Promise.resolve()) } }));
jest.mock('@react-native-camera-roll/camera-roll', () => ({ CameraRoll: { saveAsset: jest.fn(() => Promise.resolve()) } }));
jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
