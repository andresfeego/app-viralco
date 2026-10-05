import React from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { IconTextButton } from '../src/components/IconTextButton';
import { SectionHeader } from '../src/components/SectionHeader';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';

test.each(['light', 'dark'] as const)('uses the shared back icon and flexible title in %s mode', (mode) => {
  const theme = getTheme(mode);
  const onBack = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SectionHeader
        title="Nombre muy largo de cuenta o evento"
        subtitle="Detalle de cuenta"
        iconName="building"
        theme={theme}
        onBack={onBack}
        backLabel="Volver a cuentas"
      />,
    );
  });

  const backButton = renderer!.root.findByType(IconTextButton);
  expect(backButton.props).toEqual(expect.objectContaining({ icon: 'arrow-left', label: 'Volver a cuentas', variant: 'ghost' }));
  ReactTestRenderer.act(() => backButton.props.onPress());
  expect(onBack).toHaveBeenCalledTimes(1);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'section-header-content' }).props.style).flex).toBe(1);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'section-header-subtitle' }).props.style).color).toBe(theme.tertiary);
  expect(renderer!.root.findByType('LinearGradient').props.colors).toEqual(theme.headerGradient.colors);
});

test.each(['light', 'dark'] as const)('renders secondary above primary without changing header layout in %s', mode => {
  const theme = getTheme(mode);
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<SectionHeader title="Eventos" iconName="champagne-glasses" theme={theme} gradient={theme.gradients.secondaryToPrimaryVertical} />);
  });
  expect(renderer!.root.findByType('LinearGradient').props).toEqual(expect.objectContaining({
    colors: [...theme.gradients.secondaryToPrimaryVertical.colors],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    locations: [0, 0.2, 0.4, 0.6, 0.8, 1],
    useAngle: false,
    pointerEvents: 'none',
  }));
  const colors = theme.gradients.secondaryToPrimaryVertical.colors;
  expect(colors[0]).not.toBe(theme.secondary);
  expect(colors[colors.length - 1]).toBe(theme.primary);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'section-header-content' }).props.style).flex).toBe(1);
  ReactTestRenderer.act(() => renderer!.unmount());
});

test.each(['light', 'dark'] as const)('uses a continuous diagonal event surface, readable status bar and inset in %s', mode => {
  const theme = getTheme(mode);
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<SectionHeader title="Eventos" iconName="champagne-glasses" theme={theme} gradient={theme.gradients.eventHeader} topInset={59} />);
  });
  const gradient = renderer!.root.findByType('LinearGradient');
  expect(gradient.props).toEqual(expect.objectContaining({
    colors: [...theme.gradients.eventHeader.colors],
    start: { x: 0, y: 1 },
    end: { x: 1, y: 0 },
    locations: [0, 0.35, 0.6, 0.82, 1],
    pointerEvents: 'none',
  }));
  expect(gradient.props.colors[0]).toBe(theme.primary);
  expect(gradient.props.colors).not.toContain(theme.secondary);
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'section-header' }).props.style)).toEqual(expect.objectContaining({
    paddingTop: 59 + tokens.spacing.xs,
    minHeight: 59 + tokens.spacing.xl * 2 + tokens.typography.caption,
  }));
  expect(renderer!.root.findByType(StatusBar).props.barStyle).toBe('light-content');
  ReactTestRenderer.act(() => renderer!.unmount());
});
