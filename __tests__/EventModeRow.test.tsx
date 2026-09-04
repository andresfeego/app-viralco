import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { EventModeRow } from '../src/components/EventModeRow';
import { IconTextButton } from '../src/components/IconTextButton';
import { tokens } from '../src/design-system/tokens';
import { getTheme } from '../src/design-system/theme';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

test.each(['light', 'dark'] as const)('renders mode actions and hierarchy in %s mode', (mode) => {
  const theme = getTheme(mode);
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventModeRow
        theme={theme}
        name="Espejo"
        configureLabel="Configurar Espejo"
        launchLabel="Lanzar Espejo"
        canConfigure
        canLaunch
        configureTestID="configure"
        launchTestID="launch"
      />,
    );
  });

  const label = renderer!.root.find((node) => node.children.includes('Espejo'));
  expect(StyleSheet.flatten(label.props.style)).toEqual(expect.objectContaining({
    fontSize: tokens.typography.body,
    fontWeight: '700',
  }));

  const [configure, launch] = renderer!.root.findAllByType(IconTextButton);
  expect(configure.props).toEqual(expect.objectContaining({ icon: 'gear', iconOnlyShape: 'rounded-square', borderColor: theme.primary, iconColor: theme.primary, disabled: false }));
  expect(launch.props).toEqual(expect.objectContaining({ icon: 'play', iconOnlyShape: 'rounded-square', borderColor: tokens.colors.success[400], iconColor: tokens.colors.success[400], disabled: false }));
});

test('renders launch disabled in gray when the mode cannot start', () => {
  const theme = getTheme('light');
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventModeRow theme={theme} name="Espejo" configureLabel="Configurar" launchLabel="Lanzar" />,
    );
  });
  const launch = renderer!.root.findAllByType(IconTextButton)[1];
  expect(launch.props).toEqual(expect.objectContaining({
    disabled: true,
    borderColor: tokens.colors.gray[4],
    iconColor: tokens.colors.gray[4],
  }));
});

test('keeps symmetric vertical padding and removes the final divider', () => {
  const theme = getTheme('dark');
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventModeRow
        theme={theme}
        name="Video 360"
        configureLabel="Configurar"
        launchLabel="Lanzar"
        showDivider={false}
      />,
    );
  });

  const row = renderer!.root.findByProps({ testID: 'event-mode-row' });
  const style = StyleSheet.flatten(row.props.style);
  expect(style.paddingVertical).toBe(tokens.spacing.md);
  expect(style.borderBottomWidth).toBe(tokens.spacing.none);
});

test('can render the upper divider for the first row', () => {
  const theme = getTheme('light');
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <EventModeRow
        theme={theme}
        name="Espejo"
        configureLabel="Configurar"
        launchLabel="Lanzar"
        showTopDivider
      />,
    );
  });

  const row = renderer!.root.findByProps({ testID: 'event-mode-row' });
  const style = StyleSheet.flatten(row.props.style);
  expect(style.borderTopColor).toBe(tokens.colors.gray[3]);
  expect(style.borderTopWidth).toBe(tokens.border.thin);
});
