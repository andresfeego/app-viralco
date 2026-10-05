import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StatusBar, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GuestModal, GuestStage } from '../src/components/MirrorGuestScene';
import { SectionHeader } from '../src/components/SectionHeader';
import { IconTextButton } from '../src/components/IconTextButton';
import { ModalSafeArea, modalSurfaceTopOffset } from '../src/design-system/components/ModalSafeArea';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';

jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: jest.fn(() => ({ top: 59, bottom: 34, left: 0, right: 0 })),
}));

describe.each(['light', 'dark'])('shared gallery headers in %s', mode => {
  it.each(['Listado de capturas', 'Capturas archivadas'])('colors %s and preserves close action and safe separation', subtitle => {
    const theme = getTheme(mode);
    const onClose = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(<GuestModal headerCoversSafeArea theme={theme} title="Fiesta de aniversario" subtitle={subtitle} onClose={onClose}><Text>Capturas</Text></GuestModal>);
    });
    expect(tree.root.findByType(SectionHeader).props).toEqual(expect.objectContaining({ title: 'Fiesta de aniversario', subtitle }));
    expect(tree.root.findByType('LinearGradient').props.colors).toEqual(theme.headerGradient.colors);
    expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'section-header-title' }).props.style).color).toBe(theme.buttonText);
    expect(tree.root.findByType(StatusBar).props.barStyle).toBe('light-content');
    expect(tree.root.findAllByType(ModalSafeArea)).toHaveLength(0);
    const safe = tree.root.findByProps({ accessibilityViewIsModal: true });
    expect(StyleSheet.flatten(safe.props.style).paddingTop).toBeUndefined();
    expect(safe.props.edges).toEqual(['left', 'right', 'bottom']);
    expect(tree.root.findByType(SectionHeader).props.topInset).toBe(modalSurfaceTopOffset(59));
    const close = tree.root.findAllByType(IconTextButton).find(button => button.props.icon === 'xmark');
    expect(close.props.iconColor).toBe(theme.buttonText);
    act(() => close.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });

  it('preserves the separate safe area of other modals', () => {
    const theme = getTheme(mode);
    let tree;
    act(() => { tree = renderer.create(<GuestModal theme={theme} title="Operador" onClose={() => {}} />); });
    const safe = tree.root.findByType(ModalSafeArea).findByProps({ accessibilityViewIsModal: true });
    expect(StyleSheet.flatten(safe.props.style).paddingTop).toBe(modalSurfaceTopOffset(59));
    expect(tree.root.findByType(SectionHeader).props.topInset).toBe(tokens.spacing.none);
    expect(tree.root.findByType(StatusBar).props.barStyle).toBe(theme.statusBarStyle);
    act(() => tree.unmount());
  });

  it('keeps the protected long press available inside the colored modal header', () => {
    const theme = getTheme(mode);
    const onOperator = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(<GuestStage theme={theme} onOperator={onOperator}><GuestModal embedded theme={theme} title="Galería" onClose={() => {}} /></GuestStage>);
    });
    const access = tree.root.findByType(SectionHeader).findAllByType(IconTextButton).find(button => button.props.icon === 'circle');
    expect(access.props.delayLongPress).toBe(3000);
    expect(access.props.iconColor).toBe(theme.buttonText);
    act(() => access.props.onLongPress());
    expect(onOperator).toHaveBeenCalledTimes(1);
    act(() => tree.unmount());
  });
});

it.each([0, 59, 64])('moves the %s safe inset inside the gradient without changing content position', top => {
  useSafeAreaInsets.mockReturnValue({ top, bottom: 34, left: 0, right: 0 });
  const theme = getTheme('light');
  let tree;
  act(() => { tree = renderer.create(<GuestModal theme={theme} title="Galería" onClose={() => {}} />); });
  const previous = StyleSheet.flatten(tree.root.findByProps({ testID: 'section-header' }).props.style);
  const previousOffset = StyleSheet.flatten(tree.root.findByType(ModalSafeArea).findByProps({ accessibilityViewIsModal: true }).props.style).paddingTop;
  act(() => { tree.update(<GuestModal headerCoversSafeArea theme={theme} title="Galería" onClose={() => {}} />); });
  const current = StyleSheet.flatten(tree.root.findByProps({ testID: 'section-header' }).props.style);
  expect(current.minHeight).toBe(previous.minHeight + previousOffset);
  expect(current.paddingTop).toBe(previous.paddingTop + previousOffset);
  act(() => tree.unmount());
  useSafeAreaInsets.mockReturnValue({ top: 59, bottom: 34, left: 0, right: 0 });
});
