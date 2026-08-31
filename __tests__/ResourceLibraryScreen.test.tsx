import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const MockPicker = (props: any) => ReactModule.createElement(View, props, props.children);
  MockPicker.Item = (props: any) => ReactModule.createElement(View, props);
  return { Picker: MockPicker };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/services/api/accounts', () => ({ listAccountsApi: jest.fn() }));
jest.mock('../src/services/api/events', () => ({
  createEventResourceApi: jest.fn(),
  deleteEventResourceApi: jest.fn(),
  getMagicMirrorConfigApi: jest.fn(),
  listAccountLibraryApi: jest.fn(),
  listEventsApi: jest.fn(),
  saveMagicMirrorConfigApi: jest.fn(),
  updateAccountLibraryFavoriteApi: jest.fn(),
  uploadAccountLibraryFileApi: jest.fn(),
}));
jest.mock('../src/services/media/documentPicker', () => ({ pickLibraryResourceFile: jest.fn() }));

import { useAuth } from '../src/hooks/useAuth';
import { listAccountsApi } from '../src/services/api/accounts';
import {
  createEventResourceApi,
  deleteEventResourceApi,
  getMagicMirrorConfigApi,
  listAccountLibraryApi,
  listEventsApi,
  saveMagicMirrorConfigApi,
} from '../src/services/api/events';
import { ResourcePicker } from '../src/components/ResourcePicker';
import { ResourceSelectionSummary } from '../src/components/ResourceSelectionSummary';
import { ResourceUploadAction } from '../src/components/ResourceUploadAction';
import { ResourceLibraryScreen } from '../src/screens/ResourceLibraryScreen';

const mockedUseAuth = useAuth as unknown as jest.Mock;
const account = { id: '10', name: 'Cuenta' };
const event = { id: '20', name: 'Evento', modes: [{ id: '30', isActive: true, mode: { slug: 'espejo' } }] };
const libraryItem = { id: '40', libraryAssetId: '50', displayName: 'Marco', asset: { id: '50', type: 'frame', mimeType: 'image/png', ownerType: 'viralco' } };

async function flush() {
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

beforeEach(() => {
  jest.clearAllMocks();
  (listAccountsApi as jest.Mock).mockResolvedValue({ accounts: [account] });
  (listEventsApi as jest.Mock).mockResolvedValue({ events: [event] });
  (listAccountLibraryApi as jest.Mock).mockResolvedValue({ library: [libraryItem], pagination: { page: 1, pageCount: 1 } });
  (createEventResourceApi as jest.Mock).mockResolvedValue({ resource: { id: '60' } });
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 2, config: { resources: {} } } });
  (saveMagicMirrorConfigApi as jest.Mock).mockResolvedValue({});
  (deleteEventResourceApi as jest.Mock).mockResolvedValue({});
});

test('keeps the pool read-only for an operator', async () => {
  mockedUseAuth.mockReturnValue({ user: { themeMode: 'dark', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'operator' } }] } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();
  expect(renderer!.root.findAllByType(ResourceUploadAction)).toHaveLength(0);
  expect(renderer!.root.findByType(ResourcePicker).props.canManage).toBe(false);
});

test('associates a selected resource and updates the mirror draft revision', async () => {
  mockedUseAuth.mockReturnValue({ user: { themeMode: 'light', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'admin' } }] } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByType(ResourcePicker).props.onSelect(libraryItem));
  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceSelectionSummary).props.onConfirm());
  expect(createEventResourceApi).toHaveBeenCalledWith('20', expect.objectContaining({ libraryAssetId: '50', eventModeId: '30', purpose: 'frame' }));
  expect(saveMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({
    expectedRevision: 2,
    config: expect.objectContaining({ resources: expect.objectContaining({ frameResourceId: '60' }) }),
  }));
});

test('rolls back the event resource after a revision conflict', async () => {
  mockedUseAuth.mockReturnValue({ user: { themeMode: 'light', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'owner' } }] } });
  (saveMagicMirrorConfigApi as jest.Mock).mockRejectedValue(Object.assign(new Error('conflict'), { status: 409 }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<ResourceLibraryScreen />); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByType(ResourcePicker).props.onSelect(libraryItem));
  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceSelectionSummary).props.onConfirm());
  expect(deleteEventResourceApi).toHaveBeenCalledWith('20', '60');
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat().join(' ');
  expect(text).toContain('La configuracion cambio');
});
