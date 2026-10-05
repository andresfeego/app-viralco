import React from 'react';
import { Modal, StyleSheet, TextInput, ScrollView } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@react-native-picker/picker', () => {
  const { View } = require('react-native');
  const Picker = (props: any) => <View {...props}>{props.children}</View>;
  Picker.Item = (props: any) => <View {...props} />;
  return { Picker };
});

jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null, useToast: () => ({ showToast: jest.fn(), hideToast: jest.fn() }) }));
jest.mock('../src/services/media/imagePicker', () => ({ pickLogoImage: jest.fn() }));
jest.mock('../src/services/api/admin', () => ({ createAccountApi: jest.fn() }));
jest.mock('../src/services/api/billing', () => ({ billingRequest: jest.fn() }));
jest.mock('../src/services/api/accounts', () => ({
  addAccountMemberApi: jest.fn(),
  createAccountApi: jest.fn(),
  createAccountLogoAssetApi: jest.fn(),
  deleteAccountApi: jest.fn(),
  getAccountApi: jest.fn(),
  getAccountMembersApi: jest.fn(),
  listAccountsApi: jest.fn(),
  removeAccountMemberApi: jest.fn(),
  updateAccountApi: jest.fn(),
  updateAccountMemberApi: jest.fn(),
}));

import { useAuth } from '../src/hooks/useAuth';
import { AccountDetailScreen } from '../src/screens/AccountDetailScreen';
import { AccountsScreen } from '../src/screens/AccountsScreen';
import { IconTextButton } from '../src/components/IconTextButton';
import { AccountInformationCards } from '../src/components/AccountInformationCards';
import { RegisterScreen } from '../src/screens/RegisterScreen';
import {
  addAccountMemberApi,
  createAccountApi,
  createAccountLogoAssetApi,
  deleteAccountApi,
  getAccountApi,
  getAccountMembersApi,
  listAccountsApi,
  updateAccountApi,
  updateAccountMemberApi,
} from '../src/services/api/accounts';
import { pickLogoImage } from '../src/services/media/imagePicker';
import { billingRequest } from '../src/services/api/billing';

const mockedUseAuth = useAuth as jest.Mock;
const mockedListAccounts = listAccountsApi as jest.Mock;
const mockedGetAccount = getAccountApi as jest.Mock;
const mockedGetMembers = getAccountMembersApi as jest.Mock;
const mockedAddMember = addAccountMemberApi as jest.Mock;
const mockedCreateAccount = createAccountApi as jest.Mock;
const mockedCreateLogoAsset = createAccountLogoAssetApi as jest.Mock;
const mockedDeleteAccount = deleteAccountApi as jest.Mock;
const mockedUpdateAccount = updateAccountApi as jest.Mock;
const mockedUpdateMember = updateAccountMemberApi as jest.Mock;
const mockedPickLogoImage = pickLogoImage as jest.Mock;
const mockedListEventModes = billingRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedDeleteAccount.mockResolvedValue({ deleted: true, archived: false, accountId: '10' });
  mockedListEventModes.mockResolvedValue({
    catalog: [
      { modeId: '1', slug: 'espejo', name: 'Espejo', description: 'Experiencia tipo espejo', available: true, implemented: true, prices: { 30: 50000, 365: 500000 } },
      { modeId: '2', slug: 'cabina', name: 'Cabina', available: false, implemented: true, prices: { 30: 60000, 365: 600000 } },
      { modeId: '3', slug: 'video-360', name: 'Video 360', available: false, implemented: true, prices: { 30: null, 365: null } },
    ],
  });
});

test.each(['light', 'dark'])('account details refresh data and members without hiding the current account in %s', async themeMode => {
  mockedUseAuth.mockReturnValue({ user: { themeMode, globalRoles: [], accounts: [{ account: { id: '10' }, role: { slug: 'owner' }, status: 'active' }] }, reloadMe: jest.fn() });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', status: 'active' } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />); });
  const scroll = () => renderer!.root.findAllByType(ScrollView).find(node => node.props.testID === 'account-detail-scroll')!;
  expect(scroll().props.alwaysBounceVertical).toBe(true);
  expect(renderer!.root.findByType(AccountInformationCards).props.canManageBilling).toBe(true);
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'Nombre actualizado', status: 'active' } });
  await ReactTestRenderer.act(async () => scroll().props.refreshControl.props.onRefresh());
  expect(mockedGetAccount).toHaveBeenCalledTimes(2);
  expect(mockedGetMembers).toHaveBeenCalledTimes(2);
  expect(renderer!.root.findByType(AccountInformationCards).props.account.name).toBe('Nombre actualizado');
  expect(scroll().props.refreshControl.props.refreshing).toBe(false);
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'account-detail-edit-open' }).props.onPress());
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'account-edit-name-input' }).props.onChangeText('Borrador sin guardar'));
  await ReactTestRenderer.act(async () => scroll().props.refreshControl.props.onRefresh());
  expect(mockedGetAccount).toHaveBeenCalledTimes(2);
  expect(renderer!.root.findByProps({ testID: 'account-edit-name-input' }).props.value).toBe('Borrador sin guardar');
  await ReactTestRenderer.act(async () => renderer!.unmount());
});

test.each(['light', 'dark'])('account creation uses only available commercial modes and COP prices in %s', async themeMode => {
  mockedUseAuth.mockReturnValue({ user: { themeMode, globalRoles: [] }, reloadMe: jest.fn() });
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<AccountsScreen openCreateOnMount />); });
  const createButtons = renderer!.root.findAllByType(IconTextButton).filter(button => ['account-create-open', 'account-empty-create-open'].includes(button.props.testID));
  expect(createButtons).toHaveLength(2);
  createButtons.forEach(button => expect(button.props).toMatchObject({ icon: 'plus', label: 'Crear nueva cuenta' }));
  expect(StyleSheet.flatten(createButtons[0].props.style).alignSelf).toBe('flex-end');
  expect(mockedListEventModes).toHaveBeenCalledWith('/catalog');
  expect(renderer!.root.findAllByProps({ testID: 'account-mode-espejo' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({ testID: 'account-mode-cabina' })).toHaveLength(0);
  expect(JSON.stringify(renderer!.toJSON())).toContain('50.000');
  expect(JSON.stringify(renderer!.toJSON())).not.toContain('500.000');
  await ReactTestRenderer.act(async () => { renderer!.root.findByProps({ testID: 'billing-period-switch' }).props.onValueChange(true); });
  expect(JSON.stringify(renderer!.toJSON())).toContain('500.000');
  await ReactTestRenderer.act(async () => { renderer!.unmount(); });
});

test('an unavailable catalog blocks creation and is refreshed when reopening', async () => {
  mockedUseAuth.mockReturnValue({ user: { themeMode: 'dark', globalRoles: [] }, reloadMe: jest.fn() });
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  mockedListEventModes.mockResolvedValueOnce({ catalog: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<AccountsScreen openCreateOnMount />); });
  expect(renderer!.root.findByProps({ testID: 'account-create-save' }).props.disabled).toBe(true);
  await ReactTestRenderer.act(async () => { renderer!.root.findByType(Modal).props.onRequestClose(); });
  await ReactTestRenderer.act(async () => { renderer!.root.findByProps({ testID: 'account-create-open' }).props.onPress(); });
  expect(mockedListEventModes).toHaveBeenCalledTimes(2);
  expect(renderer!.root.findByProps({ testID: 'account-create-save' }).props.disabled).toBe(false);
  await ReactTestRenderer.act(async () => { renderer!.unmount(); });
});

test('registration sends name and optional phone with credentials', async () => {
  const register = jest.fn().mockResolvedValue({ message: 'ok' });
  mockedUseAuth.mockReturnValue({ register });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<RegisterScreen onGoLogin={jest.fn()} />);
  });

  const inputs = renderer!.root.findAllByType(TextInput);
  await ReactTestRenderer.act(async () => {
    inputs[0].props.onChangeText('Ana Gomez');
    inputs[1].props.onChangeText('3001234567');
    inputs[2].props.onChangeText('ana@example.com');
    inputs[3].props.onChangeText('secret123');
  });

  await ReactTestRenderer.act(async () => {
    await renderer!.root.findAll((node) => typeof node.props.onPress === 'function')[0].props.onPress();
  });

  expect(register).toHaveBeenCalledWith({
    email: 'ana@example.com',
    password: 'secret123',
    name: 'Ana Gomez',
    phone: '3001234567',
  });
});

test('account cards delegate navigation to account detail', async () => {
  const onOpenAccount = jest.fn();
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '10', name: 'ViralCo', slug: 'viralco', status: 'active' }] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountsScreen onOpenAccount={onOpenAccount} />);
  });
  expect(renderer!.root.findAll((node) => node.children.includes('Mis cuentas'))).toHaveLength(0);
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-card-10' }).props.onPress();
  });

  expect(onOpenAccount).toHaveBeenCalledWith({ id: '10', name: 'ViralCo', slug: 'viralco', status: 'active' });
});

test('account creation blocks invalid required fields before api call', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountsScreen />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-empty-create-open' }).props.onPress();
  });
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'account-create-modal-card' }).props.style)).toMatchObject({ flex: 1, flexShrink: 1, maxHeight: '100%' });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-create-email-input' }).props.onChangeText('correo-invalido');
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-create-save' }).props.onPress();
  });

  expect(mockedCreateAccount).not.toHaveBeenCalled();
});

test('account creation can open immediately when routed from an account-required empty state', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountsScreen openCreateOnMount />);
  });

  expect(renderer!.root.findByType(Modal).props.visible).toBe(true);
});

test('account creation can be requested again after closing its modal', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountsScreen openCreateRequest={1} />);
  });
  ReactTestRenderer.act(() => renderer!.root.findByType(Modal).props.onRequestClose());
  expect(renderer!.root.findByType(Modal).props.visible).toBe(false);

  await ReactTestRenderer.act(async () => {
    renderer!.update(<AccountsScreen openCreateRequest={2} />);
  });
  expect(renderer!.root.findByType(Modal).props.visible).toBe(true);
});

test('account creation sends contracted service modes instead of a plan slug', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  mockedCreateAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', subscription: { modes: [] } } });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountsScreen />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-empty-create-open' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'billing-period-switch' }).props.onValueChange(true);
    renderer!.root.findByProps({ testID: 'account-create-name-input' }).props.onChangeText('ViralCo');
    renderer!.root.findByProps({ testID: 'account-create-slug-input' }).props.onChangeText('viralco');
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-create-save' }).props.onPress();
  });

  expect(mockedCreateAccount).toHaveBeenCalledWith(expect.objectContaining({
    name: 'ViralCo',
    slug: 'viralco',
    modeSlugs: ['espejo'],
    durationDays: 365,
  }));
  expect(mockedCreateAccount.mock.calls[0][0].planSlug).toBeUndefined();
});

test('account detail membership role changes use the constrained role control', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active' } });
  mockedGetMembers.mockResolvedValue({
    members: [{
      id: '20',
      status: 'active',
      user: { id: '30', name: 'Ana' },
      role: { id: '40', slug: 'cliente', name: 'Cliente' },
    }],
  });
  mockedUpdateMember.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />);
  });

  const roleControl = renderer!.root.findAll((node) => node.props.selectedValue === 'cliente')[0];
  await ReactTestRenderer.act(async () => {
    await roleControl.props.onValueChange('admin');
  });

  expect(mockedUpdateMember).toHaveBeenCalledWith('10', '20', { roleSlug: 'admin' });
});

test('account detail adds an existing user as member', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active' } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  mockedAddMember.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-add-member-open' }).props.onPress();
  });
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'account-member-modal-card' }).props.style)).toMatchObject({ flex: 1, flexShrink: 1, maxHeight: '100%' });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-add-member-user-input' }).props.onChangeText('77');
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-add-member-save' }).props.onPress();
  });

  expect(mockedAddMember).toHaveBeenCalledWith('10', { userId: '77', roleSlug: 'cliente' });
});

test('account detail blocks adding member without user id', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active' } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-add-member-open' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-add-member-save' }).props.onPress();
  });

  expect(mockedAddMember).not.toHaveBeenCalled();
});

test('account detail edits account business data', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active', phone: '111', email: 'old@example.com' } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  mockedUpdateAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo Pro', slug: 'viralco', status: 'active', phone: '222', email: 'new@example.com' } });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-detail-edit-open' }).props.onPress();
  });
  expect(StyleSheet.flatten(renderer!.root.findByProps({ testID: 'account-edit-modal-card' }).props.style)).toMatchObject({ flex: 1, flexShrink: 1, maxHeight: '100%' });
  expect(renderer!.root.findAllByProps({ testID: 'account-edit-modal-safe-area' }).find(node => node.props.topSpacing !== undefined)?.props.topSpacing).toBe(8);
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-edit-name-input' }).props.onChangeText('ViralCo Pro');
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-edit-save' }).props.onPress();
  });

  expect(mockedUpdateAccount).toHaveBeenCalledWith('10', {
    name: 'ViralCo Pro',
    phone: '111',
    email: 'old@example.com',
  });
});

test('account detail blocks saving account without required name', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active', phone: '111', email: 'old@example.com' } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-detail-edit-open' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-edit-name-input' }).props.onChangeText('');
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-edit-save' }).props.onPress();
  });

  expect(mockedUpdateAccount).not.toHaveBeenCalled();
});

test('account detail uploads selected logo and assigns it to the account', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active', phone: '111', email: 'old@example.com', subscription: { status: 'trialing', statusLabel: 'Prueba activa' } } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  mockedPickLogoImage.mockResolvedValue({ uri: 'file://logo.png', fileName: 'logo.png', type: 'image/png', fileSize: 100 });
  mockedCreateLogoAsset.mockResolvedValue({ id: '99' });
  mockedUpdateAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active', logoAssetId: '99' } });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />);
  });
  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'account-detail-edit-open' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-edit-logo-picker' }).props.onPress();
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({ testID: 'account-edit-save' }).props.onPress();
  });

  expect(mockedCreateLogoAsset).toHaveBeenCalledWith('10', { uri: 'file://logo.png', fileName: 'logo.png', type: 'image/png', fileSize: 100 });
  expect(mockedUpdateAccount).toHaveBeenCalledWith('10', {
    name: 'ViralCo',
    phone: '111',
    email: 'old@example.com',
    logoAssetId: '99',
  });
});

test('account owner must type the exact name before deleting the account', async () => {
  const reloadMe = jest.fn().mockResolvedValue(undefined);
  const onAccountDeleted = jest.fn();
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [], accounts: [{ account: { id: '10' }, status: 'active', role: { slug: 'owner' } }] },
    reloadMe,
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo', slug: 'viralco', status: 'active', isSystem: false } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" onAccountDeleted={onAccountDeleted} />);
  });
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'account-delete-open' }).props.onPress());
  expect(renderer!.root.findByProps({ testID: 'account-delete-confirm' }).props.disabled).toBe(true);
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'account-delete-input' }).props.onChangeText('ViralCo'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'account-delete-confirm' }).props.onPress());

  expect(mockedDeleteAccount).toHaveBeenCalledWith('10', 'ViralCo');
  expect(reloadMe).toHaveBeenCalled();
  expect(onAccountDeleted).toHaveBeenCalledWith(expect.objectContaining({ deleted: true }));
});

test('system account never exposes the delete action', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'light', globalRoles: [{ slug: 'super_admin' }], accounts: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedGetAccount.mockResolvedValue({ account: { id: '10', name: 'ViralCo Platform', slug: 'viralco_platform', status: 'active', isSystem: true } });
  mockedGetMembers.mockResolvedValue({ members: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<AccountDetailScreen accountId="10" />); });
  expect(renderer!.root.findAllByProps({ testID: 'account-delete-open' })).toHaveLength(0);
});
