import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return { ...actual, TextInput: 'PaperTextInput', HelperText: 'HelperText' };
});

import { ColorPickerModal, ColorPickerTrigger, hexToHsv, hsvToHex } from '../src/components/ColorPickerModal';
import { getTheme } from '../src/design-system/theme';

test('converts between HSV and hexadecimal colors', () => {
  expect(hsvToHex(0, 1, 1)).toBe('#FF0000');
  expect(hsvToHex(120, 1, 1)).toBe('#00FF00');
  expect(hexToHsv('#0000FF')).toEqual(expect.objectContaining({ hue: 240, saturation: 1, brightness: 1 }));
});

test.each(['light', 'dark'] as const)('renders the reusable picker in %s mode', (mode) => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}><ColorPickerModal visible initialColor="#C303FD" theme={getTheme(mode)} onClose={jest.fn()} onSelect={jest.fn()} /></SafeAreaProvider>);
  });
  expect(renderer!.root.findByProps({ testID: 'color-picker-modal' })).toBeTruthy();
  expect(renderer!.root.findAllByType(ColorPickerTrigger)).toHaveLength(0);
});
