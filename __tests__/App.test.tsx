/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-vector-icons/fontawesome6', () => {
  const { Text: MockText } = require('react-native');
  return function MockIcon(props: any) {
    return <MockText>{props?.name || 'icon'}</MockText>;
  };
});
jest.mock('../src/services/media/imagePicker', () => ({ pickLogoImage: jest.fn() }));
jest.mock('react-native-toast-message', () => {
  const MockToast = () => null;
  MockToast.show = jest.fn();
  MockToast.hide = jest.fn();
  return { __esModule: true, default: MockToast };
});

import App from '../App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
