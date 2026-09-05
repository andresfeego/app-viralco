import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';
import { EventHeroHeader } from '../src/components/EventHeroHeader';
import { tokens } from '../src/design-system/tokens';
import { getTheme } from '../src/design-system/theme';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

test.each(['light', 'dark'] as const)('presents a compact event identity header in %s mode', (mode) => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventHeroHeader
        theme={getTheme(mode)}
        title="Evento"
        subtitle="Boda"
        logoAction={<View testID="logo-control" />}
      />,
    );
  });

  const logoStyle = StyleSheet.flatten(
    renderer!.root.findByProps({ testID: 'event-hero-logo-action' }).props.style,
  );
  const frameStyle = StyleSheet.flatten(
    renderer!.root.findByProps({ testID: 'event-hero-frame' }).props.style,
  );

  expect(renderer!.root.findAllByProps({ testID: 'event-hero-background-action' })).toHaveLength(0);
  expect(logoStyle).toEqual(expect.objectContaining({
    position: 'absolute',
    right: tokens.spacing.sm,
    bottom: tokens.spacing.sm,
  }));
  expect(frameStyle.width).toBe('100%');
  expect(frameStyle.gap).toBe(tokens.spacing.sm);
  expect(frameStyle.padding).toBe(tokens.spacing.md);
  expect(frameStyle.borderRadius).toBeUndefined();
  expect(frameStyle.marginTop).toBeUndefined();
});
