import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { tokens } from '../src/design-system/tokens';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { IconTextButton } from '../src/components/IconTextButton';
import { getTheme } from '../src/design-system/theme';

test('icon text button supports text-first order and custom direction', () => {
  const onPress = jest.fn();
  const theme = getTheme('dark');
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <IconTextButton
        theme={theme}
        label="Cambiar"
        icon="shuffle"
        direction="column"
        order="text-first"
        onPress={onPress}
        testID="icon-text-button"
      />
    );
  });

  const button = renderer!.root.findByProps({ testID: 'icon-text-button' });
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });

  expect(onPress).toHaveBeenCalledTimes(1);
});

test('icon-only mode is circular and accepts explicit theme colors', () => {
  const theme = getTheme('light');
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <IconTextButton theme={theme} icon="star" variant="ghost" backgroundColor={theme.surface} pressedBackgroundColor={theme.background} iconColor={theme.primary} testID="circle" />,
    );
  });
  const button = renderer!.root.findAllByProps({ testID: 'circle' }).at(-1)!;
  const resolvedStyle = typeof button.props.style === 'function' ? button.props.style({ pressed: false }) : button.props.style;
  const style = StyleSheet.flatten(resolvedStyle);
  expect(style.width).toBe(style.height);
  expect(style.width).toBe(tokens.spacing.xl + tokens.spacing.xs);
  expect(style.borderRadius).toBe(tokens.radius.pill);
  expect(style.backgroundColor).toBe(theme.surface);
});

test('compact icon-only mode aligns the glyph while preserving a larger hit area', () => {
  const theme = getTheme('dark');
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <IconTextButton theme={theme} icon="pencil" variant="ghost" compactIconOnly testID="compact" />,
    );
  });
  const button = renderer!.root.findAllByProps({ testID: 'compact' }).at(-1)!;
  const resolvedStyle = typeof button.props.style === 'function' ? button.props.style({ pressed: false }) : button.props.style;
  const style = StyleSheet.flatten(resolvedStyle);

  expect(style.width).toBe(tokens.typography.caption);
  expect(style.height).toBe(tokens.typography.caption);
  expect(button.props.hitSlop).toBe(tokens.spacing.md);
});
