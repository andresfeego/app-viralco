import React from 'react';
import { StyleSheet, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { AppButton } from '../src/design-system/components/AppButton';
import { ButtonRow } from '../src/design-system/components/ButtonRow';
import { IconTextButton } from '../src/components/IconTextButton';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

const pressables = (tree: renderer.ReactTestRenderer) => tree.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.style === 'function');
const contrast = (a: string, b: string) => {
  const luminance = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

describe.each(['light', 'dark'] as const)('secondary actions in %s', mode => {
  const theme = getTheme(mode);
  const secondary = { label: 'Cancelar', backgroundColor: theme.surface, pressedColor: theme.background, textColor: theme.textPrimary, variant: 'outlined' as const, borderColor: theme.textSecondary };
  const primary = { label: 'Seleccionar archivo', backgroundColor: theme.buttonBg, pressedColor: theme.buttonBgPressed, textColor: theme.buttonText };

  it('gives outlined actions a visible boundary on both card and screen backgrounds', () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AppButton {...secondary} onPress={onPress} />); });
    const button = pressables(tree!)[0];
    expect(StyleSheet.flatten(button.props.style({ pressed: false }))).toMatchObject({ borderWidth: tokens.border.thin, borderColor: theme.textSecondary, backgroundColor: theme.surface });
    expect(StyleSheet.flatten(button.props.style({ pressed: true })).backgroundColor).toBe(theme.background);
    for (const background of [theme.surface, theme.background]) {
      expect(contrast(theme.textSecondary, background)).toBeGreaterThanOrEqual(3);
      expect(contrast(theme.textPrimary, background)).toBeGreaterThanOrEqual(4.5);
    }
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
    act(() => tree!.update(<AppButton {...secondary} onPress={onPress} disabled />));
    expect(pressables(tree!)[0].props).toMatchObject({ disabled: true, accessibilityLabel: 'Cancelar', accessibilityState: { disabled: true } });
    act(() => tree!.unmount());
  });

  it('shares width by content instead of equal halves and wraps complete actions', () => {
    const cancel = jest.fn(), upload = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<ButtonRow testID="actions"><AppButton {...secondary} onPress={cancel} /><AppButton {...primary} onPress={upload} /></ButtonRow>); });
    const row = tree!.root.findAllByProps({ testID: 'actions' }).find(node => node.props.style);
    expect(StyleSheet.flatten(row!.props.style)).toMatchObject({ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs, minWidth: tokens.spacing.none });
    const buttons = pressables(tree!);
    buttons.forEach(button => {
      expect(StyleSheet.flatten(button.props.style({ pressed: false }))).toMatchObject({ flexBasis: 'auto', flexGrow: 1, flexShrink: 0, minWidth: tokens.spacing.none, maxWidth: '100%', paddingHorizontal: tokens.spacing.sm });
      expect(button.findByType(Text).props.numberOfLines).toBe(1);
      expect(button.findByType(Text).props.adjustsFontSizeToFit).toBeUndefined();
    });
    expect(StyleSheet.flatten(buttons[1].props.style({ pressed: false })).backgroundColor).toBe(theme.buttonBg);
    act(() => { buttons[0].props.onPress(); buttons[1].props.onPress(); });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(upload).toHaveBeenCalledTimes(1);
    act(() => tree!.unmount());
  });

  it('does not impose a single line on standalone buttons or change primary gradients', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<AppButton {...primary} onPress={jest.fn()} gradient={tokens.gradients.primaryToTertiary} />); });
    expect(tree!.root.findByType(Text).props.numberOfLines).toBeUndefined();
    expect(StyleSheet.flatten(pressables(tree!)[0].props.style({ pressed: false })).borderWidth).toBeUndefined();
    expect(tree!.root.findByType('LinearGradient').props.colors).toEqual(tokens.gradients.primaryToTertiary.colors);
    act(() => tree!.unmount());
  });

  it('keeps explicit icon borders and ghost actions while strengthening default outlines', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<IconTextButton theme={theme} variant="outlined" icon="xmark" onPress={jest.fn()} />); });
    expect(StyleSheet.flatten(pressables(tree!)[0].props.style({ pressed: false })).borderColor).toBe(theme.textSecondary);
    act(() => tree!.update(<IconTextButton theme={theme} variant="outlined" borderColor={theme.primary} />));
    expect(StyleSheet.flatten(pressables(tree!)[0].props.style({ pressed: false })).borderColor).toBe(theme.primary);
    act(() => tree!.update(<IconTextButton theme={theme} variant="ghost" />));
    expect(StyleSheet.flatten(pressables(tree!)[0].props.style({ pressed: false }))).toMatchObject({ borderWidth: tokens.spacing.none, borderColor: undefined });
    act(() => tree!.unmount());
  });
});
