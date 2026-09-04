import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';
import { EventHeroHeader } from '../src/components/EventHeroHeader';
import { tokens } from '../src/design-system/tokens';
import { getTheme } from '../src/design-system/theme';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

test.each(['light', 'dark'] as const)('anchors event image actions to their frame in %s mode', (mode) => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventHeroHeader
        theme={getTheme(mode)}
        title="Evento"
        subtitle="Boda"
        backgroundAction={<View testID="background-control" />}
        logoAction={<View testID="logo-control" />}
      />,
    );
  });

  const backgroundStyle = StyleSheet.flatten(
    renderer!.root.findByProps({ testID: 'event-hero-background-action' }).props.style,
  );
  const logoStyle = StyleSheet.flatten(
    renderer!.root.findByProps({ testID: 'event-hero-logo-action' }).props.style,
  );

  expect(backgroundStyle).toEqual(expect.objectContaining({
    position: 'absolute',
    right: tokens.spacing.xs,
    top: tokens.spacing.xs,
  }));
  expect(logoStyle).toEqual(expect.objectContaining({
    position: 'absolute',
    right: tokens.spacing.xs,
    bottom: tokens.spacing.xs,
  }));
});
