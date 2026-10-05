import React from 'react';
import { KeyboardAvoidingView, Modal, ScrollView, StyleSheet, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { FormLayout } from '../src/design-system/components/FormLayout';
import { FormModal } from '../src/components/FormModal';
import { EventEditModal } from '../src/components/EventEditModal';
import { AppButton } from '../src/design-system/components/AppButton';
import { ButtonRow } from '../src/design-system/components/ButtonRow';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { setLocale, t } from '../src/i18n';

let mockInsetTop = 59;
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: mockInsetTop, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null }));
afterEach(() => { setLocale('es'); mockInsetTop = 59; });

test.each([['light', 'es'], ['dark', 'es'], ['light', 'en'], ['dark', 'en']] as const)('standard form sheets preserve actions and titles in %s/%s', (mode, locale) => {
  setLocale(locale);
  const theme = getTheme(mode);
  const onSave = jest.fn(), onClose = jest.fn();
  const props = { visible: true, theme, title: t('event_117'), cancelLabel: t('common_cancel'), saveLabel: t('common_save'), onSave, onClose, testID: 'event-edit' };
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<EventEditModal {...props}><Text>Content</Text></EventEditModal>); });
  const sheet = StyleSheet.flatten(tree!.root.findByProps({ testID: 'event-edit-sheet' }).props.style);
  expect(sheet).toMatchObject({ backgroundColor: theme.background, flexShrink: 1, maxHeight: '100%', borderTopLeftRadius: tokens.radius.lg });
  expect(sheet.flex).toBe(1);
  const form = tree!.root.findByType(FormLayout);
  expect(StyleSheet.flatten(form.findAllByProps({ testID: 'event-edit-form' }).find(node => node.props.style)!.props.style).gap).toBe(tokens.spacing.xl);
  expect(tree!.root.findByType(Modal).props.transparent).toBe(true);
  expect(tree!.root.findByType(ScrollView).props.keyboardShouldPersistTaps).toBe('handled');
  const scroll = tree!.root.findByType(ScrollView);
  expect(scroll.findAllByType(AppButton)).toHaveLength(0);
  expect(StyleSheet.flatten(scroll.props.style)).toMatchObject({ flex: 1, minHeight: tokens.spacing.none });
  expect(StyleSheet.flatten(scroll.props.contentContainerStyle).paddingBottom).toBe(tokens.spacing.none);
  const footer = tree!.root.findByProps({ testID: 'event-edit-footer' });
  expect(StyleSheet.flatten(footer.props.style)).toMatchObject({ flexShrink: 0, paddingTop: tokens.spacing.xl, paddingBottom: tokens.spacing.lg });
  expect(footer.findAllByType(AppButton)).toHaveLength(2);
  expect(tree!.root.findByType(KeyboardAvoidingView).props.behavior).toBe('padding');
  const title = tree!.root.findAllByType(Text).find(node => node.props.accessibilityRole === 'header')!;
  expect(title.props.children).toBe(t('event_117'));
  expect(StyleSheet.flatten(title.props.style).fontSize).toBe(tokens.typography.heading);
  expect(title.props.numberOfLines).toBeUndefined();
  const [cancel, save] = tree!.root.findAllByType(AppButton);
  expect(cancel.props).toMatchObject({ variant: 'outlined', borderColor: theme.buttonSecondaryBorder, singleLine: true });
  expect(save.props).toMatchObject({ backgroundColor: theme.buttonBg, singleLine: true });
  act(() => { cancel.props.onPress(); save.props.onPress(); });
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(onSave).toHaveBeenCalledTimes(1);
  act(() => { tree!.update(<EventEditModal {...props} saving><Text>Content</Text></EventEditModal>); });
  expect(tree!.root.findAllByType(AppButton).every(button => button.props.disabled)).toBe(true);
  act(() => tree!.unmount());
});

test.each([0, 24, 59, 62])('keeps the sheet below safe inset %s without painting the spacer', inset => {
  mockInsetTop = inset;
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormModal theme={getTheme('dark')} title="Edit" onClose={jest.fn()}><Text>Content</Text></FormModal>); });
  const safe = tree!.root.findAllByProps({ testID: 'form-modal-safe-area' }).find(node => node.props.edges)!;
  const style = StyleSheet.flatten(safe.props.style);
  expect(style.paddingTop).toBe(Math.max(tokens.spacing.xl * 2, inset + tokens.spacing.xs));
  expect(style.backgroundColor).toBeUndefined();
  expect(safe.props.edges).toEqual(['left', 'right', 'bottom']);
  expect(tree!.root.findAllByType(ButtonRow)).toHaveLength(0);
  act(() => tree!.unmount());
});

test('nested fragments still share button width without wrapping labels', () => {
  const theme = getTheme('light');
  const action = { onPress: jest.fn(), backgroundColor: theme.buttonBg, pressedColor: theme.buttonBgPressed, textColor: theme.buttonText };
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormLayout actions={<><AppButton {...action} label="Cancel" /><><AppButton {...action} label="Save print profile" /></></>}><Text>Fields</Text></FormLayout>); });
  tree!.root.findAllByType(AppButton).forEach(button => {
    expect(button.props.singleLine).toBe(true);
    expect(StyleSheet.flatten(button.props.style)).toMatchObject({ flexGrow: 1, flexShrink: 0, minWidth: 0, maxWidth: '100%' });
  });
  act(() => tree!.unmount());
});

test.each(['light', 'dark'] as const)('uses the approved account edit height by default in every form sheet in %s', mode => {
  const theme = getTheme(mode);
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormModal theme={theme} title="Account" onClose={jest.fn()} fillAvailableHeight topSpacing={tokens.spacing.xs}><Text>Fields</Text></FormModal>); });
  const sheetStyle = () => StyleSheet.flatten(tree!.root.findByProps({ testID: 'form-modal-sheet' }).props.style);
  const safeStyle = () => StyleSheet.flatten(tree!.root.findAllByProps({ testID: 'form-modal-safe-area' }).find(node => node.props.edges)!.props.style);
  expect(sheetStyle().flex).toBe(1);
  expect(safeStyle().paddingTop).toBe(Math.max(tokens.spacing.xl * 2, mockInsetTop + tokens.spacing.xs));
  act(() => { tree!.update(<FormModal theme={theme} title="Other sheet" onClose={jest.fn()}><Text>Fields</Text></FormModal>); });
  expect(sheetStyle().flex).toBe(1);
  expect(safeStyle().paddingTop).toBe(Math.max(tokens.spacing.xl * 2, mockInsetTop + tokens.spacing.xs));
  act(() => tree!.unmount());
});

test('keeps a long form scrollable independently of the action footer', () => {
  const theme = getTheme('light');
  const actions = <AppButton label="Save" onPress={jest.fn()} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />;
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormModal theme={theme} title="Long form" onClose={jest.fn()} actions={actions}>{Array.from({ length: 30 }, (_, index) => <Text key={index}>Field {index}</Text>)}</FormModal>); });
  const scroll = tree!.root.findByType(ScrollView);
  expect(scroll.findAllByType(Text)).toHaveLength(31);
  expect(scroll.findAllByType(AppButton)).toHaveLength(0);
  expect(tree!.root.findByProps({ testID: 'form-modal-footer' }).findAllByType(AppButton)).toHaveLength(1);
  act(() => tree!.unmount());
});

test.each(['light', 'dark'] as const)('fades overflowing content into the fixed footer background in %s', mode => {
  const theme = getTheme(mode);
  const actions = <AppButton label="Save" onPress={jest.fn()} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />;
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormModal theme={theme} title="Edit" onClose={jest.fn()} actions={actions}><Text>Fields</Text></FormModal>); });
  const scroll = tree!.root.findByType(ScrollView);
  const fades = () => tree!.root.findAllByProps({ testID: 'form-modal-fade-bottom' }).filter(node => typeof node.type === 'string');
  expect(fades()).toHaveLength(0);
  act(() => {
    scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    scroll.props.onContentSizeChange(375, 700);
  });
  expect(fades()).toHaveLength(1);
  const fade = fades()[0];
  expect(fade.props).toMatchObject({
    colors: [`${theme.background}00`, theme.background],
    start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
    pointerEvents: 'none', accessible: false, accessibilityElementsHidden: true,
    importantForAccessibility: 'no-hide-descendants',
  });
  expect(StyleSheet.flatten(fade.props.style)).toMatchObject({
    position: 'absolute', bottom: tokens.spacing.none, left: tokens.spacing.none,
    right: tokens.spacing.none, height: tokens.spacing.lg,
  });
  expect(scroll.findAllByProps({ testID: 'form-modal-fade-bottom' })).toHaveLength(0);
  expect(StyleSheet.flatten(tree!.root.findByProps({ testID: 'form-modal-scroll-viewport' }).props.style)).toMatchObject({ flex: 1, minHeight: 0, overflow: 'hidden' });
  expect(tree!.root.findByProps({ testID: 'form-modal-footer' }).findAllByType(AppButton)).toHaveLength(1);

  const move = (offset: number) => act(() => scroll.props.onScroll({ nativeEvent: {
    contentOffset: { y: offset }, layoutMeasurement: { height: 400 }, contentSize: { height: 700 },
  } }));
  move(299.5); // Ignore subpixel rounding at the bottom.
  expect(fades()).toHaveLength(0);
  move(330); // Bottom bounce must not bring the fade back.
  expect(fades()).toHaveLength(0);
  move(250);
  expect(fades()).toHaveLength(1);
  move(-30); // Top bounce still has content below.
  expect(fades()).toHaveLength(1);
  act(() => tree!.unmount());
});

test('updates the bottom fade when content or available keyboard/orientation space changes', () => {
  const theme = getTheme('light');
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormModal theme={theme} title="Edit" onClose={jest.fn()} actions={<Text>Actions</Text>}><Text>Fields</Text></FormModal>); });
  const scroll = tree!.root.findByType(ScrollView);
  const hasFade = () => tree!.root.findAllByProps({ testID: 'form-modal-fade-bottom' }).length > 0;
  act(() => {
    scroll.props.onContentSizeChange(375, 400);
    scroll.props.onLayout({ nativeEvent: { layout: { height: 500 } } });
  });
  expect(hasFade()).toBe(false);
  act(() => scroll.props.onLayout({ nativeEvent: { layout: { height: 250 } } }));
  expect(hasFade()).toBe(true);
  act(() => scroll.props.onLayout({ nativeEvent: { layout: { height: 500 } } }));
  expect(hasFade()).toBe(false);
  act(() => scroll.props.onContentSizeChange(375, 900));
  expect(hasFade()).toBe(true);
  act(() => scroll.props.onContentSizeChange(375, 100));
  expect(hasFade()).toBe(false);
  act(() => tree!.unmount());
});

test('does not fade overflowing forms without fixed footer actions', () => {
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<FormModal theme={getTheme('light')} title="Edit" onClose={jest.fn()}><Text>Fields</Text></FormModal>); });
  const scroll = tree!.root.findByType(ScrollView);
  act(() => {
    scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    scroll.props.onContentSizeChange(375, 900);
  });
  expect(tree!.root.findAllByProps({ testID: 'form-modal-fade-bottom' })).toHaveLength(0);
  act(() => tree!.unmount());
});

test('refreshes fade colors on theme changes and clears measurements when closing', () => {
  const renderForm = (mode: 'light' | 'dark', visible = true) => <FormModal visible={visible} theme={getTheme(mode)} title="Edit" onClose={jest.fn()} actions={<Text>Actions</Text>}><Text>Fields</Text></FormModal>;
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(renderForm('light')); });
  const measure = () => act(() => {
    const scroll = tree!.root.findByType(ScrollView);
    scroll.props.onLayout({ nativeEvent: { layout: { height: 400 } } });
    scroll.props.onContentSizeChange(375, 900);
  });
  measure();
  act(() => tree!.update(renderForm('dark')));
  const fade = tree!.root.findAllByProps({ testID: 'form-modal-fade-bottom' })[0];
  expect(fade.props.colors).toEqual([`${getTheme('dark').background}00`, getTheme('dark').background]);
  act(() => tree!.update(renderForm('dark', false)));
  act(() => tree!.update(renderForm('dark')));
  expect(tree!.root.findAllByProps({ testID: 'form-modal-fade-bottom' })).toHaveLength(0);
  measure();
  expect(tree!.root.findAllByProps({ testID: 'form-modal-fade-bottom' }).length).toBeGreaterThan(0);
  act(() => tree!.unmount());
});
