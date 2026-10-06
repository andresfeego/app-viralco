import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import { Menu } from 'react-native-paper';
import { BillingReceiptContent } from '../src/components/BillingReceiptContent';
import { PaperFormInput } from '../src/components/PaperFormInput';
import { IconTextButton } from '../src/components/IconTextButton';
import { MediaPreview } from '../src/design-system/components/MediaPreview';
import { SurfaceCard } from '../src/design-system/components/SurfaceCard';
import { tokens } from '../src/design-system/tokens';
import { getTheme } from '../src/design-system/theme';
import { setLocale, t } from '../src/i18n';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-paper', () => {
  const ReactModule = require('react');
  const MockMenu = props => ReactModule.createElement(require('react-native').View, null, props.anchor, props.visible ? props.children : null);
  MockMenu.Item = 'MenuItem';
  return { Menu: MockMenu };
});
jest.mock('../src/components/PaperFormInput', () => ({ PaperFormInput: 'Input' }));
jest.mock('../src/design-system/components/MediaPreview', () => ({ MediaPreview: 'MediaPreview' }));

const order = { id: '9', status: 'awaiting_payment', durationDays: 30, amountCop: 50000, createdAt: '2026-10-06T14:00:00Z', expectedStart: '2026-10-06T14:00:00Z', snapshot: { items: [{ name: 'Espejo' }] } };
const report = { amountCop: '50000', transferDate: '2026-10-06' };
afterEach(() => setLocale('es'));

test.each([['light', 'es'], ['dark', 'es'], ['light', 'en'], ['dark', 'en']])('groups receipt, form and attachment using tokens in %s/%s', (mode, locale) => {
  setLocale(locale);
  const theme = getTheme(mode);
  const onChangeReport = jest.fn();
  const onPickFile = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<BillingReceiptContent theme={theme} order={order} report={report} onChangeReport={onChangeReport} onPickFile={onPickFile} />); });
  expect(tree.root.findAllByType(SurfaceCard)).toHaveLength(3);
  expect(tree.root.findAllByType(SurfaceCard).every(card => card.props.surfaceColor === theme.surface && card.props.borderColor === theme.border)).toBe(true);
  expect(StyleSheet.flatten(tree.root.findByProps({ testID: 'billing-receipt-content' }).props.style).gap).toBe(tokens.spacing.lg);
  const inputs = tree.root.findAllByType(PaperFormInput);
  expect(inputs.map(input => input.props.label)).toEqual(['amount', 'transferDate'].map(key => t(`billing_${key}`)));
  act(() => inputs[0].props.onChangeText('60000'));
  expect(onChangeReport.mock.calls[0][0](report)).toEqual({ ...report, amountCop: '60000' });
  const pick = tree.root.findByType(IconTextButton);
  expect(pick.props).toMatchObject({ label: t('billing_selectFile'), icon: 'paperclip', variant: 'outlined', borderColor: theme.buttonSecondaryBorder });
  act(() => pick.props.onPress());
  expect(onPickFile).not.toHaveBeenCalled();
  const menu = tree.root.findByType(Menu);
  expect(menu.props.visible).toBe(true);
  expect(StyleSheet.flatten(menu.props.contentStyle).backgroundColor).toBe(theme.surface);
  expect(tree.root.findAllByType('MenuItem').map(item => item.props.title)).toEqual(['resource_source_files', 'resource_source_camera', 'resource_source_photos'].map(t));
  expect(tree.root.findAllByType('MenuItem').every(item => item.props.titleStyle.color === theme.textPrimary && item.props.theme.colors.onSurfaceVariant === theme.textSecondary)).toBe(true);
  for (const source of ['files', 'camera', 'gallery']) {
    act(() => pick.props.onPress());
    act(() => tree.root.findByProps({ testID: `billing-receipt-source-${source}` }).props.onPress());
    expect(onPickFile).toHaveBeenLastCalledWith(source);
    expect(menu.props.visible).toBe(false);
  }
  expect(tree.root.findAllByType(Text).map(node => node.props.children)).toContain(t('billing_receiptFormats'));
  act(() => tree.unmount());
});

test.each(['application/pdf', 'image/png', 'image/jpeg'])('shows a selected %s without truncating its name and allows replacement', type => {
  const file = { uri: 'file:///proof', type, name: 'comprobante-de-transferencia-con-un-nombre-muy-largo-1234567890' };
  let tree;
  act(() => { tree = renderer.create(<BillingReceiptContent theme={getTheme('dark')} order={order} report={report} file={file} />); });
  expect(tree.root.findByType(IconTextButton).props.label).toBe(t('billing_replaceFile'));
  const fileName = tree.root.findAllByType(Text).find(node => node.props.children === file.name);
  expect(fileName.props.numberOfLines).toBeUndefined();
  expect(StyleSheet.flatten(fileName.props.style).minWidth).toBe(tokens.spacing.none);
  expect(tree.root.findAllByType(MediaPreview)).toHaveLength(type.startsWith('image/') ? 1 : 0);
  act(() => tree.unmount());
});

test('locks all editable controls while an action is running', () => {
  let tree;
  act(() => { tree = renderer.create(<BillingReceiptContent theme={getTheme('light')} order={order} report={report} busy />); });
  expect(tree.root.findAllByType(PaperFormInput).every(input => input.props.editable === false)).toBe(true);
  expect(tree.root.findByType(IconTextButton).props.disabled).toBe(true);
  act(() => tree.root.findByType(IconTextButton).props.onPress());
  expect(tree.root.findByType(Menu).props.visible).toBe(false);
  act(() => tree.unmount());
});

test.each(['pending_review', 'approved'])('preserves history and hides upload controls for %s', status => {
  let tree;
  act(() => { tree = renderer.create(<BillingReceiptContent theme={getTheme('light')} order={{ ...order, status, provisionalUntil: '2026-10-09T14:00:00Z' }} report={report}><Text>Prior report</Text></BillingReceiptContent>); });
  expect(tree.root.findAllByType(PaperFormInput)).toHaveLength(0);
  expect(tree.root.findAllByType(IconTextButton)).toHaveLength(0);
  const text = tree.root.findAllByType(Text).map(node => node.props.children);
  expect(text).toContain('Prior report');
  expect(text.includes(t('billing_reviewDeadline'))).toBe(status === 'pending_review');
  act(() => tree.unmount());
});
