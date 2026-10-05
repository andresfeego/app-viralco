/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => {
  const { Text: MockText } = require('react-native');
  return function MockIcon(props: any) {
    return <MockText>{props?.name || 'icon'}</MockText>;
  };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/providers/AuthProvider', () => ({ AuthProvider: ({ children }: any) => children }));
jest.mock('../src/providers/PermissionProvider', () => ({ PermissionProvider: ({ children }: any) => children }));
jest.mock('../src/providers/ToastProvider', () => ({ ToastProvider: ({ children }: any) => children }));
jest.mock('../src/screens/EventsScreen', () => {
  const { Pressable: MockPressable, Text: MockText } = require('react-native');
  return { EventsScreen: ({ onCreateAccount }: any) => <MockPressable testID="events-create-account" onPress={onCreateAccount}><MockText>Eventos</MockText></MockPressable> };
});
jest.mock('../src/screens/AccountsScreen', () => {
  const { Pressable: MockPressable, Text: MockText, View: MockView } = require('react-native');
  return {
    AccountsScreen: ({ openCreateRequest, onOpenAccount }: any) => (
      <MockView>
        <MockText testID="accounts-open-request">{String(openCreateRequest)}</MockText>
        <MockPressable testID="account-open-detail" onPress={() => onOpenAccount({ id: '10', name: 'Cuenta de celebraciones empresariales' })} />
      </MockView>
    ),
  };
});
jest.mock('../src/screens/SuperAdminUsersScreen', () => {
  const { Text: MockText } = require('react-native');
  return { SuperAdminUsersScreen: () => <MockText testID="superadmin-screen">Super Admin</MockText> };
});
jest.mock('../src/screens/AccountDetailScreen', () => {
  const { Text: MockText } = require('react-native');
  return { AccountDetailScreen: () => <MockText>Detalle</MockText> };
});
jest.mock('../src/screens/ConfigurationScreen', () => {
  const { Text: MockText } = require('react-native');
  return { ConfigurationScreen: () => <MockText>Configuracion</MockText> };
});
jest.mock('../src/screens/ResourceLibraryScreen', () => {
  const { Text: MockText } = require('react-native');
  return { ResourceLibraryScreen: () => <MockText>Recursos</MockText> };
});
jest.mock('../src/screens/MagicMirrorConfigScreen', () => {
  const { Text: MockText } = require('react-native');
  return { MagicMirrorConfigScreen: () => <MockText>Espejo</MockText> };
});

import { MainFlow } from '../App';
import { BottomMainMenu } from '../src/components/BottomMainMenu';
import { SectionHeader } from '../src/components/SectionHeader';
import { useAuth } from '../src/hooks/useAuth';
import { EventsScreen } from '../src/screens/EventsScreen';
import { tokens } from '../src/design-system/tokens';

const mockedUseAuth = useAuth as jest.Mock;

beforeEach(() => {
  mockedUseAuth.mockReturnValue({
    initializing: false,
    isAuthenticated: true,
    user: { id: '170', themeMode: 'dark', status: { slug: 'active' }, globalRoles: [{ slug: 'super_admin' }] },
  });
});

test('authenticated sessions open on Events even for Super Admin', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<MainFlow />);
  });

  expect(renderer!.root.findAllByProps({ testID: 'events-create-account' }).length).toBeGreaterThan(0);
  expect(renderer!.root.findAllByProps({ testID: 'superadmin-screen' })).toHaveLength(0);
});

test('shares the gradient across navigation and details while retaining the top safe area', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<MainFlow topInset={59} />);
  });
  expect(renderer!.root.findByType('LinearGradient').props.colors).toEqual(tokens.gradients.header.colors);
  expect(renderer!.root.findByType(SectionHeader).props.topInset).toBe(59);
  ReactTestRenderer.act(() => {
    renderer!.root.findByType(EventsScreen).props.onHeaderChange({ title: 'Event', subtitle: 'Detalle de evento', iconName: 'calendar-check' });
  });
  expect(renderer!.root.findByType('LinearGradient').props.colors).toEqual(tokens.gradients.header.colors);
  expect(renderer!.root.findByType(SectionHeader).props.topInset).toBe(59);
  for (const key of ['cuenta', 'recursos', 'configuracion', 'superadmin']) {
    ReactTestRenderer.act(() => renderer!.root.findByType(BottomMainMenu).props.onSelect(key));
    expect(renderer!.root.findByType('LinearGradient').props.colors).toEqual(tokens.gradients.header.colors);
    expect(renderer!.root.findByType(SectionHeader).props.topInset).toBe(59);
  }
  ReactTestRenderer.act(() => renderer!.unmount());
});

test('the account-required action routes to account creation', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<MainFlow />);
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'events-create-account' }).props.onPress();
  });

  expect(renderer!.root.findByProps({ testID: 'accounts-open-request' }).props.children).toBe('1');
});

test('account detail shows the account name as heading and the detail label as subtitle', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<MainFlow />);
  });

  ReactTestRenderer.act(() => {
    renderer!.root.findByType(BottomMainMenu).props.onSelect('cuenta');
  });
  ReactTestRenderer.act(() => {
    renderer!.root.findByProps({ testID: 'account-open-detail' }).props.onPress();
  });

  expect(renderer!.root.findByType(SectionHeader).props).toEqual(expect.objectContaining({
    title: 'Cuenta de celebraciones empresariales',
    subtitle: 'Detalle de cuenta',
  }));
  expect(renderer!.root.findByType('LinearGradient').props.colors).toEqual(tokens.gradients.header.colors);
});
