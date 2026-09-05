import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { BackgroundColorPicker } from '../src/components/BackgroundColorPicker';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { t } from '../src/i18n';

test.each(['light', 'dark'] as const)('shows the five token colors and custom option in %s mode', (mode) => {
  const onSelect = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<BackgroundColorPicker theme={getTheme(mode)} selectedColors={['#2D3047']} onSelect={onSelect} />); });
  tokens.colors.backgroundPalette.forEach((color) => {
    const swatch = renderer!.root.findByProps({ accessibilityLabel: `${t('mirror_background_color')} ${color}` });
    ReactTestRenderer.act(() => swatch.props.onPress());
  });
  expect(onSelect.mock.calls.map((call) => call[0])).toEqual(tokens.colors.backgroundPalette);
  expect(renderer!.root.findByProps({ accessibilityLabel: t('mirror_background_custom') })).toBeTruthy();
});
