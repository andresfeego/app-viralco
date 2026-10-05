import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

const options = [{ value: '', label: 'Todos' }, { value: 'frame', label: 'Marcos' }];
const chips = (tree: renderer.ReactTestRenderer) => tree.root.findAll(node => node.props.accessibilityRole === 'button' && typeof node.props.style === 'function');

describe.each(['light', 'dark'] as const)('selectable chips in %s', mode => {
  const theme = getTheme(mode);

  it('uses a neutral background, primary border and trailing check only on the selected outlined chip', () => {
    const onChange = jest.fn();
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<SelectableChipGroup theme={theme} options={options} value="frame" variant="outlined" onChange={onChange} />); });
    const [all, selected] = chips(tree!);
    const style = (node: renderer.ReactTestInstance, pressed = false) => StyleSheet.flatten(node.props.style({ pressed }));
    expect(style(all)).toMatchObject({ backgroundColor: theme.surface, borderColor: theme.border });
    expect(style(selected)).toMatchObject({ backgroundColor: theme.surface, borderColor: theme.primary, flexDirection: 'row', gap: tokens.spacing.xs });
    expect(style(selected, true).backgroundColor).toBe(theme.background);
    expect(StyleSheet.flatten(selected.findByType(Text).props.style).color).toBe(theme.textPrimary);
    expect(all.findAllByType('Icon')).toHaveLength(0);
    const check = selected.findByType('Icon');
    expect(check.props).toMatchObject({ name: 'check', color: theme.primary, accessible: false });
    expect(selected.findAll(node => node.type === Text || node.type === 'Icon').map(node => node.type)).toEqual([Text, 'Icon']);
    expect(selected.props.accessibilityState.selected).toBe(true);
    expect(selected.props.accessibilityLabel).toBe('Marcos');
    act(() => all.props.onPress());
    expect(onChange).toHaveBeenCalledWith('');
    act(() => { tree!.update(<SelectableChipGroup theme={theme} options={options} value="" variant="outlined" onChange={onChange} />); });
    expect(chips(tree!)[0].findAllByType('Icon')).toHaveLength(1);
    expect(chips(tree!)[1].findAllByType('Icon')).toHaveLength(0);
    act(() => tree!.unmount());
  });

  it('leaves existing filled selectors unchanged', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<SelectableChipGroup theme={theme} options={options} value="frame" />); });
    const selected = chips(tree!)[1];
    expect(StyleSheet.flatten(selected.props.style({ pressed: false })).backgroundColor).toBe(theme.primary);
    expect(StyleSheet.flatten(selected.props.style({ pressed: false }))).toMatchObject({ minHeight: tokens.spacing.xl, paddingVertical: tokens.spacing.xs });
    expect(StyleSheet.flatten(selected.findByType(Text).props.style).color).toBe(theme.buttonText);
    expect(tree!.root.findAllByType('Icon')).toHaveLength(0);
    act(() => tree!.unmount());
  });

  it('reduces outlined filter height through padding without shrinking text or icons', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<SelectableChipGroup theme={theme} options={options} value="frame" variant="outlined" />); });
    chips(tree!).forEach(chip => {
      const style = StyleSheet.flatten(chip.props.style({ pressed: false }));
      expect(style.minHeight).toBeCloseTo(tokens.spacing.xl * 0.95);
      expect((tokens.spacing.xs - style.paddingVertical) * 2).toBeCloseTo(tokens.spacing.xl * 0.05);
      expect(style.paddingHorizontal).toBe(tokens.spacing.md);
      expect(StyleSheet.flatten(chip.findByType(Text).props.style).fontSize).toBe(tokens.typography.caption);
    });
    expect(tree!.root.findByType('Icon').props.size).toBe(tokens.typography.caption);
    act(() => tree!.unmount());
  });

  it('preserves disabled and error states', () => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<SelectableChipGroup theme={theme} options={options} value="frame" variant="outlined" disabled errorText="Revisa la selección" />); });
    const selected = chips(tree!)[1];
    expect(selected.props.disabled).toBe(true);
    expect(selected.props.accessibilityState).toMatchObject({ selected: true, disabled: true });
    expect(StyleSheet.flatten(selected.props.style({ pressed: false }))).toMatchObject({ borderColor: theme.alert, backgroundColor: theme.surface });
    act(() => tree!.unmount());
  });

  it.each([320, 375, 768, 1024, 1440])('keeps a single horizontal row and fades only overflowing edges at %s px', width => {
    let tree: renderer.ReactTestRenderer;
    act(() => { tree = renderer.create(<SelectableChipGroup theme={theme} options={options} value="frame" variant="outlined" />); });
    const scroll = () => tree!.root.findByType(ScrollView);
    const fades = () => tree!.root.findAllByType('LinearGradient');
    const move = (offset: number) => act(() => scroll().props.onScroll({ nativeEvent: { contentOffset: { x: offset }, layoutMeasurement: { width }, contentSize: { width: width * 2 } } }));
    expect(scroll().props).toMatchObject({ horizontal: true, keyboardShouldPersistTaps: 'handled', bounces: false });
    expect(StyleSheet.flatten(scroll().props.contentContainerStyle)).toMatchObject({ flexDirection: 'row', flexWrap: 'nowrap', gap: tokens.spacing.xs });
    chips(tree!).forEach(chip => {
      expect(StyleSheet.flatten(chip.props.style({ pressed: false })).flexShrink).toBe(0);
      expect(chip.findByType(Text).props.numberOfLines).toBe(1);
    });
    expect(fades()).toHaveLength(0);
    act(() => scroll().props.onContentSizeChange(width * 2, 40));
    expect(fades()).toHaveLength(0); // No fade before the viewport is measured.
    act(() => scroll().props.onLayout({ nativeEvent: { layout: { width } } }));
    expect(fades()).toHaveLength(1);
    expect(fades()[0].props.colors).toEqual([`${theme.background}00`, theme.background]);
    move(width / 2);
    expect(fades()).toHaveLength(2);
    expect(fades()[0].props.colors).toEqual([theme.background, `${theme.background}00`]);
    fades().forEach(fade => {
      expect(fade.props).toMatchObject({ pointerEvents: 'none', accessible: false, accessibilityElementsHidden: true });
      expect(StyleSheet.flatten(fade.props.style).width).toBe(tokens.spacing.lg);
    });
    move(width);
    expect(fades()).toHaveLength(1);
    expect(fades()[0].props.colors[0]).toBe(theme.background);
    move(-10); // Native bounce/rounding cannot create a phantom left edge.
    expect(fades()).toHaveLength(1);
    expect(fades()[0].props.colors[1]).toBe(theme.background);
    act(() => scroll().props.onLayout({ nativeEvent: { layout: { width: width * 3 } } }));
    expect(fades()).toHaveLength(0); // Rotation / larger viewport.
    act(() => scroll().props.onLayout({ nativeEvent: { layout: { width } } }));
    move(width / 2);
    act(() => scroll().props.onContentSizeChange(width - 1, 40));
    expect(fades()).toHaveLength(0); // Fewer options now fit without scrolling.
    act(() => tree!.unmount());
  });

  it('matches surface backgrounds and updates the gradients when the theme changes', () => {
    let tree: renderer.ReactTestRenderer;
    const props = { theme, backgroundColor: theme.surface, options, variant: 'outlined' };
    act(() => { tree = renderer.create(<SelectableChipGroup {...props} />); });
    act(() => tree!.root.findByType(ScrollView).props.onScroll({ nativeEvent: { contentOffset: { x: 20 }, layoutMeasurement: { width: 200 }, contentSize: { width: 500 } } }));
    expect(tree!.root.findAllByType('LinearGradient').map(node => node.props.colors)).toEqual([
      [theme.surface, `${theme.surface}00`], [`${theme.surface}00`, theme.surface],
    ]);
    const nextTheme = getTheme(mode === 'light' ? 'dark' : 'light');
    act(() => tree!.update(<SelectableChipGroup {...props} theme={nextTheme} backgroundColor={nextTheme.surface} />));
    expect(tree!.root.findAllByType('LinearGradient')[0].props.colors).toEqual([nextTheme.surface, `${nextTheme.surface}00`]);
    act(() => tree!.unmount());
  });
});
