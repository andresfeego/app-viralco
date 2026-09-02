import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const MockPicker = (props: any) => ReactModule.createElement(View, props, props.children);
  MockPicker.Item = (props: any) => ReactModule.createElement(View, props);
  return { Picker: MockPicker };
});
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return { ...actual, TextInput: 'PaperTextInput', HelperText: 'HelperText' };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('../src/components/ResourceGallery', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return { ResourceGallery: (props: any) => ReactModule.createElement(View, props, props.header) };
});
jest.mock('../src/components/ResourcePreviewModal', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return { ResourcePreviewModal: (props: any) => ReactModule.createElement(View, props) };
});
jest.mock('../src/services/api/accounts', () => ({ listAccountsApi: jest.fn() }));
jest.mock('../src/services/api/events', () => ({
  listAccountLibraryApi: jest.fn(),
  listEventTypesApi: jest.fn(),
  updateAccountLibraryFavoriteApi: jest.fn(),
}));

import { CompactAccountSelector } from '../src/components/CompactAccountSelector';
import { AccountRequiredEmptyState } from '../src/components/AccountRequiredEmptyState';
import { HorizontalSubMenu } from '../src/components/HorizontalSubMenu';
import { ResourceFilters } from '../src/components/ResourceFilters';
import { ResourceGallery } from '../src/components/ResourceGallery';
import { ResourcePreviewModal } from '../src/components/ResourcePreviewModal';
import { useAuth } from '../src/hooks/useAuth';
import { useToast } from '../src/providers/ToastProvider';
import { listAccountsApi } from '../src/services/api/accounts';
import { listAccountLibraryApi, listEventTypesApi, updateAccountLibraryFavoriteApi } from '../src/services/api/events';
import { ResourceLibraryScreen } from '../src/screens/ResourceLibraryScreen';

const mockedUseAuth = useAuth as unknown as jest.Mock;
const mockedUseToast = useToast as unknown as jest.Mock;
const showToast = jest.fn();
const account = { id: '10', name: 'Cuenta' };
const secondAccount = { id: '11', name: 'Segunda' };
const libraryItem = {
  id: null,
  libraryAssetId: '50',
  displayName: 'Marco global',
  isFavorite: false,
  asset: {
    id: '50', type: 'frame', mimeType: 'image/png', ownerType: 'viralco', name: 'Marco global',
    variants: { card: { signedUrl: 'https://assets.test/card.webp', mimeType: 'image/webp' } },
    fileSignedUrl: 'https://assets.test/original.png',
  },
};

async function flush() {
  await ReactTestRenderer.act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function setRole(role: string, accounts = [account]) {
  mockedUseAuth.mockReturnValue({
    user: {
      themeMode: 'light',
      globalRoles: [],
      accounts: accounts.map((item) => ({ account: item, status: 'active', role: { slug: role } })),
    },
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  setRole('owner');
  mockedUseToast.mockReturnValue({ showToast, hideToast: jest.fn() });
  (listAccountsApi as jest.Mock).mockResolvedValue({ accounts: [account] });
  (listEventTypesApi as jest.Mock).mockResolvedValue({ types: [{ id: '1', slug: 'boda', name: 'Boda' }] });
  (listAccountLibraryApi as jest.Mock).mockResolvedValue({ library: [libraryItem], pagination: { page: 1, pageSize: 60, total: 1, pageCount: 1 } });
  (updateAccountLibraryFavoriteApi as jest.Mock).mockResolvedValue({ library: { ...libraryItem, id: '70', isFavorite: true } });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('loads only the global catalog and keeps it read-only for an operator', async () => {
  setRole('operator');
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();

  expect(listAccountLibraryApi).toHaveBeenCalledWith('10', expect.objectContaining({ scope: 'global', favorite: true, page: 1, pageSize: 60 }));
  expect(renderer!.root.findByType(ResourceGallery).props.canManage).toBe(false);
  expect(renderer!.root.findByType(ResourceFilters).props.showTabs).toBe(false);
  expect(renderer!.root.findByType(ResourceFilters).props.eventTypes).toEqual([expect.objectContaining({ slug: 'boda' })]);
  expect(renderer!.root.findByType(HorizontalSubMenu).props.items.map((item: any) => item.label)).toEqual(['Favoritos', 'Global']);
});

test('shows only the account-required empty state and opens account creation when no account exists', async () => {
  const onCreateAccount = jest.fn();
  (listAccountsApi as jest.Mock).mockResolvedValue({ accounts: [] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen onCreateAccount={onCreateAccount} />); });
  await flush();

  expect(renderer!.root.findAllByType(ResourceGallery)).toHaveLength(0);
  expect(renderer!.root.findAllByType(ResourceFilters)).toHaveLength(0);
  expect(renderer!.root.findAllByType(HorizontalSubMenu)).toHaveLength(0);
  ReactTestRenderer.act(() => renderer!.root.findByType(AccountRequiredEmptyState).props.onCreateAccount());
  expect(onCreateAccount).toHaveBeenCalledTimes(1);
});

test('shows the compact account selector only for multiple accounts', async () => {
  setRole('admin', [account, secondAccount]);
  (listAccountsApi as jest.Mock).mockResolvedValue({ accounts: [account, secondAccount] });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();
  expect(renderer!.root.findByType(CompactAccountSelector).props.accounts).toHaveLength(2);
});

test('starts in shared favorites, switches to global and opens a resource preview', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();

  expect(listAccountLibraryApi).toHaveBeenLastCalledWith('10', expect.objectContaining({ scope: 'global', favorite: true }));
  ReactTestRenderer.act(() => renderer!.root.findByType(HorizontalSubMenu).props.onSelect('pool'));
  await flush();
  expect(listAccountLibraryApi).toHaveBeenLastCalledWith('10', expect.objectContaining({ scope: 'global', favorite: '' }));

  ReactTestRenderer.act(() => renderer!.root.findByType(ResourceGallery).props.onPressItem(libraryItem));
  expect(renderer!.root.findByType(ResourcePreviewModal).props.item.libraryAssetId).toBe('50');
});

test('updates a favorite optimistically and persists the account association', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();

  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceGallery).props.onToggleFavorite(libraryItem));

  expect(updateAccountLibraryFavoriteApi).toHaveBeenCalledWith('10', '50', true);
  expect(renderer!.root.findByType(ResourceGallery).props.items[0].isFavorite).toBe(true);
  expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
});

test('rolls back the optimistic favorite when the API fails', async () => {
  (updateAccountLibraryFavoriteApi as jest.Mock).mockRejectedValue(new Error('fallo'));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();

  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceGallery).props.onToggleFavorite(libraryItem));

  expect(renderer!.root.findByType(ResourceGallery).props.items[0].isFavorite).toBe(false);
  expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
});

test('loads and merges the next catalog page without duplicate assets', async () => {
  (listAccountLibraryApi as jest.Mock)
    .mockResolvedValueOnce({ library: [libraryItem], pagination: { page: 1, pageSize: 60, total: 2, pageCount: 2 } })
    .mockResolvedValueOnce({ library: [{ ...libraryItem, libraryAssetId: '51', asset: { ...libraryItem.asset, id: '51', name: 'Otro marco' } }], pagination: { page: 2, pageSize: 60, total: 2, pageCount: 2 } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();

  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceGallery).props.onLoadMore());
  await flush();

  expect(listAccountLibraryApi).toHaveBeenLastCalledWith('10', expect.objectContaining({ page: 2 }));
  expect(renderer!.root.findByType(ResourceGallery).props.items.map((item: any) => item.libraryAssetId)).toEqual(['50', '51']);
});
