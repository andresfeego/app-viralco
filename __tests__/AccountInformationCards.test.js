import React from 'react';
import { StyleSheet, Text } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { AccountInformationCards } from '../src/components/AccountInformationCards';
import { AccountLogoPreview } from '../src/components/AccountLogoPreview';
import { InformationRow } from '../src/components/InformationRow';
import { IconTextButton } from '../src/components/IconTextButton';
import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';
import { setLocale, t } from '../src/i18n';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
afterEach(() => setLocale('es'));
const account = { name: 'Una cuenta con un nombre bastante largo', slug: 'cuenta', status: 'active', email: 'contacto@cuenta.test', phone: '3001234567', subscription: { totalAmount: 50000, currency: 'COP', status: 'active', modes: [{ mode: { name: 'Espejo' } }] } };

it.each([['light', 'es'], ['dark', 'es'], ['light', 'en'], ['dark', 'en']])('groups account and subscription details in %s/%s', (mode, locale) => {
  setLocale(locale);
  const theme = getTheme(mode), onEdit = jest.fn(), onBilling = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<AccountInformationCards account={account} theme={theme} logoUri="https://example.test/logo.png" onEdit={onEdit} onBilling={onBilling} canManageBilling />); });
  expect(tree.root.findByType(AccountLogoPreview).props).toMatchObject({ size: 'md', imageUri: 'https://example.test/logo.png' });
  const subscription = tree.root.findByProps({ testID: 'account-subscription-card' });
  expect(subscription.findAllByType(InformationRow).map(row => row.props.value)).toContain('50000 COP');
  const billing = subscription.findByType(IconTextButton);
  expect(billing.props).toMatchObject({ label: t('billing_title'), variant: 'outlined', icon: 'credit-card' });
  expect(tree.root.findByProps({ testID: 'account-information-card' }).findAllByProps({ testID: 'account-billing-open' })).toHaveLength(0);
  act(() => { billing.props.onPress(); tree.root.findByProps({ testID: 'account-detail-edit-open' }).props.onPress(); });
  expect(onEdit).toHaveBeenCalledTimes(1);
  expect(onBilling).toHaveBeenCalledTimes(1);
  const name = tree.root.findAllByType(Text).find(node => node.props.children === account.name);
  expect(StyleSheet.flatten(name.props.style)).toMatchObject({ fontSize: tokens.typography.heading, minWidth: 0, flexShrink: 1, color: theme.textPrimary });
  expect(name.props.numberOfLines).toBeUndefined();
  act(() => tree.unmount());
});

it.each([{ ...account, isSystem: true }, account])('keeps payments hidden for system accounts and unauthorized users', value => {
  let tree;
  act(() => { tree = renderer.create(<AccountInformationCards account={value} theme={getTheme('dark')} canManageBilling={Boolean(value.isSystem)} />); });
  expect(tree.root.findAllByProps({ testID: 'account-billing-open' })).toHaveLength(0);
  act(() => tree.unmount());
});
