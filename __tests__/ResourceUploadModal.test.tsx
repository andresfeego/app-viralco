import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { Menu, Portal } from 'react-native-paper';
import { ResourceUploadModal } from '../src/components/ResourceUploadModal';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { AppButton } from '../src/design-system/components/AppButton';
import { ButtonRow } from '../src/design-system/components/ButtonRow';
import { ResourceSourceButton } from '../src/components/ResourceSourceButton';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { setLocale, t } from '../src/i18n';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
// Native menu measurement/animations need a native view tree; keep interaction tests deterministic.
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  const ReactModule = require('react');
  const { View } = require('react-native');
  const MockMenu = (props: any) => ReactModule.createElement(View, null, props.anchor, props.visible ? props.children : null);
  MockMenu.Item = (props: any) => ReactModule.createElement(View, props);
  return { ...actual, Menu: MockMenu };
});
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 59, right: 0, bottom: 34, left: 0 }),
}));

afterEach(() => setLocale('es'));

test.each([['light', 'es'], ['dark', 'es'], ['light', 'en'], ['dark', 'en']] as const)('preserves resource actions, purpose selection, upload and disabled state in %s/%s', (mode, locale) => {
  setLocale(locale);
  const onPurposeChange = jest.fn();
  const onUpload = jest.fn();
  const props = { visible: true, theme: getTheme(mode), purpose: 'frame', onPurposeChange, onUpload, onClose: jest.fn() };
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<ResourceUploadModal {...props} />); });
  const expectContentSpacing = () => {
    const footer = tree!.root.findByProps({ testID: 'resource-upload-footer' });
    expect(StyleSheet.flatten(footer.props.style).paddingTop).toBe(tokens.spacing.xl);
    expect(tokens.spacing.xl).toBe(32);
    expect(StyleSheet.flatten(tree!.root.findByProps({ testID: 'resource-upload-sheet' }).props.style).flex).toBe(1);
    const content = tree!.root.findByProps({ testID: 'resource-upload-content' });
    expect(StyleSheet.flatten(content.props.style).gap).toBe(tokens.spacing.xs);
    expect(content.findAllByType(ButtonRow)).toHaveLength(0);
    expect(footer.findAllByType(ButtonRow)).toHaveLength(1);
    expect(tree!.root.findByType(ScrollView).findAllByType(AppButton)).toHaveLength(0);
  };
  expectContentSpacing();
  expect(tree!.root.findAllByType(ButtonRow)).toHaveLength(1);
  const [cancel, select] = tree!.root.findAllByType(AppButton);
  expect(cancel.props).toMatchObject({ variant: 'outlined', borderColor: props.theme.textSecondary, singleLine: true, label: t('account_028') });
  expect(select.props).toMatchObject({ singleLine: true, label: t('resource_059') });
  expect(tree!.root.findByType(SelectableChipGroup).props).toMatchObject({ variant: 'outlined', value: 'frame', disabled: false, backgroundColor: props.theme.surface });
  act(() => tree!.root.findByProps({ testID: 'resource-upload-purpose-sticker' }).props.onPress());
  expect(onPurposeChange).toHaveBeenCalledWith('sticker');
  act(() => tree!.update(<ResourceUploadModal {...props} purpose="sticker" />));
  expect(tree!.root.findByType(SelectableChipGroup).props.value).toBe('sticker');
  act(() => tree!.root.findAllByType(AppButton)[1].props.onPress());
  expect(onUpload).not.toHaveBeenCalled();
  const menu = tree!.root.findByType(Menu);
  expect(menu.props.visible).toBe(true);
  act(() => menu.props.children.find((item: any) => item.props.testID === 'resource-source-files').props.onPress());
  expect(onUpload).toHaveBeenCalledWith('sticker', 'files');
  act(() => tree!.update(<ResourceUploadModal {...props} disabled />));
  expect(tree!.root.findByType(SelectableChipGroup).props.disabled).toBe(true);
  act(() => tree!.update(<ResourceUploadModal {...props} fixedPurpose />));
  expect(tree!.root.findAllByType(SelectableChipGroup)).toHaveLength(0);
  expectContentSpacing();
  act(() => tree!.update(<ResourceUploadModal {...props} progress={50} disabled />));
  expectContentSpacing();
  act(() => tree!.update(<ResourceUploadModal {...props} purpose="print_profile" />));
  expect(tree!.root.findAllByType(AppButton)[1].props.label).toBe(t('print_007'));
  expectContentSpacing();
  act(() => tree!.unmount());
});

test.each([
  ['background', ['camera', 'gallery', 'files']],
  ['frame', ['gallery', 'files']],
  ['sticker', ['gallery', 'files']],
  ['animation', ['gallery', 'files']],
] as const)('offers only the relevant sources for %s', (purpose, sources) => {
  const onUpload = jest.fn();
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<ResourceUploadModal visible theme={getTheme('dark')} purpose={purpose} onUpload={onUpload} onClose={jest.fn()} onPurposeChange={jest.fn()} />); });
  const menu = tree!.root.findByType(Menu);
  expect(menu.props.children.map((item: any) => item.props.testID)).toEqual(sources.map(source => `resource-source-${source}`));
  expect(tree!.root.findAllByType(Portal.Host)).toHaveLength(1);
  expect(StyleSheet.flatten(tree!.root.findByType(ResourceSourceButton).props.style)).toMatchObject({ flexGrow: 1, flexShrink: 0, minWidth: 0, maxWidth: '100%' });
  for (const source of sources) {
    act(() => menu.props.children.find((item: any) => item.props.testID === `resource-source-${source}`).props.onPress());
    expect(onUpload).toHaveBeenLastCalledWith(purpose, source);
  }
  if (purpose === 'animation') expect(menu.props.children[0].props.title).toBe(t('resource_source_video'));
  act(() => tree!.unmount());
});

test('fonts open Files directly; printer profiles preserve their existing detection flow', () => {
  const onUpload = jest.fn();
  const props = { visible: true, theme: getTheme('light'), purpose: 'font', onUpload, onClose: jest.fn(), onPurposeChange: jest.fn() };
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<ResourceUploadModal {...props} />); });
  act(() => tree!.root.findAllByType(AppButton)[1].props.onPress());
  expect(onUpload).toHaveBeenLastCalledWith('font', 'files');
  expect(tree!.root.findByType(Menu).props.visible).toBe(false);
  act(() => tree!.update(<ResourceUploadModal {...props} purpose="print_profile" />));
  act(() => tree!.root.findAllByType(AppButton)[1].props.onPress());
  expect(onUpload).toHaveBeenLastCalledWith('print_profile', undefined);
  act(() => tree!.unmount());
});

test('closes the source menu on dismiss, purpose change and modal close without uploading', () => {
  const onUpload = jest.fn();
  const props = { visible: true, theme: getTheme('light'), purpose: 'background', onUpload, onClose: jest.fn(), onPurposeChange: jest.fn() };
  let tree: renderer.ReactTestRenderer;
  act(() => { tree = renderer.create(<ResourceUploadModal {...props} />); });
  const open = () => act(() => tree!.root.findAllByType(AppButton)[1].props.onPress());
  open();
  act(() => tree!.root.findByType(Menu).props.onDismiss());
  expect(tree!.root.findByType(Menu).props.visible).toBe(false);
  open();
  act(() => tree!.update(<ResourceUploadModal {...props} purpose="animation" />));
  expect(tree!.root.findByType(Menu).props.visible).toBe(false);
  open();
  act(() => tree!.update(<ResourceUploadModal {...props} visible={false} />));
  act(() => tree!.update(<ResourceUploadModal {...props} />));
  expect(tree!.root.findByType(Menu).props.visible).toBe(false);
  expect(onUpload).not.toHaveBeenCalled();
  act(() => tree!.unmount());
});
