import React from 'react';
import { Modal, TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

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
jest.mock('../src/services/api/events', () => ({ listEventModesApi: jest.fn() }));
jest.mock('../src/services/api/accounts', () => ({
  addAccountMemberApi: jest.fn(),
  createAccountApi: jest.fn(),
  createAccountLogoAssetApi: jest.fn(),
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
import { RegisterScreen } from '../src/screens/RegisterScreen';
import {
  addAccountMemberApi,
  createAccountApi,
  createAccountLogoAssetApi,
  getAccountApi,
  getAccountMembersApi,
  listAccountsApi,
  updateAccountApi,
  updateAccountMemberApi,
} from '../src/services/api/accounts';
import { pickLogoImage } from '../src/services/media/imagePicker';
import { listEventModesApi } from '../src/services/api/events';

const mockedUseAuth = useAuth as jest.Mock;
const mockedListAccounts = listAccountsApi as jest.Mock;
const mockedGetAccount = getAccountApi as jest.Mock;
const mockedGetMembers = getAccountMembersApi as jest.Mock;
const mockedAddMember = addAccountMemberApi as jest.Mock;
const mockedCreateAccount = createAccountApi as jest.Mock;
const mockedCreateLogoAsset = createAccountLogoAssetApi as jest.Mock;
const mockedUpdateAccount = updateAccountApi as jest.Mock;
const mockedUpdateMember = updateAccountMemberApi as jest.Mock;
const mockedPickLogoImage = pickLogoImage as jest.Mock;
const mockedListEventModes = listEventModesApi as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockedListEventModes.mockResolvedValue({
    modes: [
      { id: '1', slug: 'espejo', name: 'Espejo', description: 'Experiencia tipo espejo', priceAmount: 50, priceCurrency: 'USD', isDefault: true },
      { id: '2', slug: 'cabina', name: 'Cabina', description: 'Experiencia tipo cabina', priceAmount: 60, priceCurrency: 'USD', isDefault: false },
      { id: '3', slug: 'video-360', name: 'Video 360', description: 'Video 360', priceAmount: 80, priceCurrency: 'USD', isDefault: false },
    ],
  });
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
