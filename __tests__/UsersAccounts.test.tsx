import React from 'react';
import { TextInput } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-picker/picker', () => {
  const { View } = require('react-native');
  const Picker = (props: any) => <View {...props}>{props.children}</View>;
  Picker.Item = (props: any) => <View {...props} />;
  return { Picker };
});

jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/api/admin', () => ({ createAccountApi: jest.fn() }));
jest.mock('../src/services/api/accounts', () => ({
  addAccountMemberApi: jest.fn(),
  getAccountMembersApi: jest.fn(),
  listAccountsApi: jest.fn(),
  removeAccountMemberApi: jest.fn(),
  updateAccountMemberApi: jest.fn(),
}));

import { useAuth } from '../src/hooks/useAuth';
import { AccountsScreen } from '../src/screens/AccountsScreen';
import { RegisterScreen } from '../src/screens/RegisterScreen';
import {
  getAccountMembersApi,
  listAccountsApi,
  updateAccountMemberApi,
} from '../src/services/api/accounts';

const mockedUseAuth = useAuth as jest.Mock;
const mockedListAccounts = listAccountsApi as jest.Mock;
const mockedGetMembers = getAccountMembersApi as jest.Mock;
const mockedUpdateMember = updateAccountMemberApi as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
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

test('account membership role changes use the constrained role control', async () => {
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [] },
    reloadMe: jest.fn().mockResolvedValue(undefined),
  });
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '10', name: 'ViralCo', slug: 'viralco', status: 'active' }] });
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
    renderer = ReactTestRenderer.create(<AccountsScreen />);
  });
  await ReactTestRenderer.act(async () => {
    await renderer!.root.findAll((node) => typeof node.props.onPress === 'function')[0].props.onPress();
  });

  const roleControl = renderer!.root.findAll((node) => node.props.selectedValue === 'cliente')[0];
  await ReactTestRenderer.act(async () => {
    await roleControl.props.onValueChange('admin');
  });

  expect(mockedUpdateMember).toHaveBeenCalledWith('10', '20', { roleSlug: 'admin' });
});
