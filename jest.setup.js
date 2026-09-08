/* global jest */
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('@react-native-community/slider', () => 'Slider');
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Camera: (props) => React.createElement(View, { ...props, testID: props.testID || 'camera-preview' }),
    VisionCamera: { createDeviceFactory: jest.fn() },
    useCameraPermission: () => ({ hasPermission: true, requestPermission: jest.fn(() => Promise.resolve(true)) }),
  };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
