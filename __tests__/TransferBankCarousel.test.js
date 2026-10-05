import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { TransferBankCarousel } from '../src/components/TransferBankCarousel';
import { ManagementCard } from '../src/components/ManagementCard';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { setLocale } from '../src/i18n';
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-paper', () => ({ Checkbox: { Item: 'CheckboxItem' } }));
const banks = [{ id: '1', bank: 'Bank with a long name', holder: 'Holder', identification: '001', accountNumber: '000123', accountType: 'Savings', active: true }, { id: '2', bank: 'Second bank', active: false }];
afterEach(() => setLocale('es'));

describe.each(['light', 'dark'])('transfer card reel in %s', mode => {
  const theme = getTheme(mode);
  it.each([320, 375, 768, 1024])('sizes cards within %s px and matches the filters edge fades', width => {
    let tree;
    act(() => { tree = renderer.create(<TransferBankCarousel theme={theme} banks={banks} backgroundColor={theme.surface} />); });
    const scroll = () => tree.root.findByType(ScrollView);
    const move = x => act(() => scroll().props.onScroll({ nativeEvent: { contentOffset: { x }, layoutMeasurement: { width }, contentSize: { width: width * 2 } } }));
    act(() => scroll().props.onLayout({ nativeEvent: { layout: { width } } }));
    expect(scroll().props.horizontal).toBe(true);
    const card = tree.root.findByProps({ testID: 'transfer-banks-card-1' });
    expect(StyleSheet.flatten(card.props.style).width).toBeLessThanOrEqual(width);
    expect(StyleSheet.flatten(card.props.style).flexShrink).toBe(0);
    move(width / 2);
    const fades = tree.root.findAllByType('LinearGradient');
    expect(fades.map(fade => fade.props.colors)).toEqual([[theme.surface, `${theme.surface}00`], [`${theme.surface}00`, theme.surface]]);
    fades.forEach(fade => {
      expect(fade.props.pointerEvents).toBe('none');
      expect(StyleSheet.flatten(fade.props.style).width).toBe(tokens.spacing.lg);
    });
    act(() => scroll().props.onContentSizeChange(width - 1));
    expect(tree.root.findAllByType('LinearGradient')).toHaveLength(0);
    act(() => tree.unmount());
  });
  it('exposes independent active checks and edits without changing local state optimistically', () => {
    setLocale(mode === 'light' ? 'es' : 'en');
    const onToggle = jest.fn(), onEdit = jest.fn();
    let tree;
    act(() => { tree = renderer.create(<TransferBankCarousel theme={theme} banks={banks} onToggle={onToggle} onEdit={onEdit} />); });
    const checks = tree.root.findAllByType('CheckboxItem');
    expect(checks.map(check => check.props.status)).toEqual(['checked', 'unchecked']);
    act(() => checks[1].props.onPress());
    expect(onToggle).toHaveBeenCalledWith(banks[1], true);
    expect(checks[1].props.status).toBe('unchecked');
    act(() => tree.root.findByProps({ testID: 'transfer-banks-edit-1' }).props.onPress());
    expect(onEdit).toHaveBeenCalledWith(banks[0]);
    act(() => tree.unmount());
  });
  it('separates destination selection from administrative activation and supports historical read-only cards', () => {
    const onSelect = jest.fn();
    let tree;
    act(() => { tree = renderer.create(<TransferBankCarousel theme={theme} banks={[banks[0]]} selectedId="1" onSelect={onSelect} />); });
    expect(tree.root.findAllByType('CheckboxItem')).toHaveLength(0);
    expect(tree.root.findByProps({ testID: 'transfer-banks-select-1' }).props.selected).toBe(true);
    act(() => tree.root.findByProps({ testID: 'transfer-banks-select-1' }).props.onPress());
    expect(onSelect).toHaveBeenCalledWith('1');
    act(() => tree.update(<TransferBankCarousel theme={theme} banks={[banks[0]]} />));
    expect(tree.root.findByType(ManagementCard).props.actions).toBeNull();
    act(() => tree.unmount());
  });
});
