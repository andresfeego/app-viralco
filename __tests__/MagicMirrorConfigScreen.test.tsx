import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return { getItem: jest.fn((key) => Promise.resolve(store.get(key) || null)), setItem: jest.fn((key, value) => { store.set(key, value); return Promise.resolve(); }), removeItem: jest.fn((key) => { store.delete(key); return Promise.resolve(); }), clear: jest.fn(() => { store.clear(); return Promise.resolve(); }) };
});
jest.mock('react-native-paper', () => {
  const actual = jest.requireActual('react-native-paper');
  return { ...actual, TextInput: 'PaperTextInput', HelperText: 'HelperText' };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('../src/services/api/events', () => ({
  createEventResourceApi: jest.fn(), deleteEventResourceApi: jest.fn(),
  getMagicMirrorConfigApi: jest.fn(), getPublishedMagicMirrorConfigApi: jest.fn(),
  listAccountLibraryApi: jest.fn(), listEventResourcesApi: jest.fn(), listEventTypesApi: jest.fn(() => Promise.resolve({ types: [] })),
  publishMagicMirrorConfigApi: jest.fn(), saveMagicMirrorConfigApi: jest.fn(),
  updateAccountLibraryFavoriteApi: jest.fn(), uploadAccountLibraryFileApi: jest.fn(),
  validateMagicMirrorConfigApi: jest.fn(),
}));
jest.mock('../src/services/media/documentPicker', () => ({ pickLibraryResourceFile: jest.fn() }));

import { MirrorFormatSelector } from '../src/components/MirrorFormatSelector';
import { ResourcePicker } from '../src/components/ResourcePicker';
import { ResourceSelectionSummary } from '../src/components/ResourceSelectionSummary';
import { applyMirrorFormat, defaultMirrorConfig } from '../src/domain/magicMirrorConfig';
import { useAuth } from '../src/hooks/useAuth';
import { useToast } from '../src/providers/ToastProvider';
import {
  createEventResourceApi,
  deleteEventResourceApi,
  getMagicMirrorConfigApi,
  getPublishedMagicMirrorConfigApi,
  listAccountLibraryApi,
  listEventResourcesApi,
  publishMagicMirrorConfigApi,
  saveMagicMirrorConfigApi,
  validateMagicMirrorConfigApi,
} from '../src/services/api/events';
import { MagicMirrorConfigScreen } from '../src/screens/MagicMirrorConfigScreen';

const account = { id: '10', name: 'Cuenta' };
const event = { id: '20', accountId: '10', name: 'Boda', eventDate: '2026-09-01' };
const eventMode = { id: '30', mode: { slug: 'espejo' }, isActive: true };
const mockedAuth = useAuth as jest.Mock;
const mockedToast = useToast as jest.Mock;

async function flush() {
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

function owner() {
  mockedAuth.mockReturnValue({ user: { themeMode: 'light', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'owner' } }] } });
}

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.clear();
  owner();
  mockedToast.mockReturnValue({ showToast: jest.fn(), hideToast: jest.fn() });
  (getMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ config: { revision: 2, config: defaultMirrorConfig(), publishedVersionId: null } });
  (getPublishedMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ version: { id: '90', version: 1, config: defaultMirrorConfig() }, manifest: [] });
  (listEventResourcesApi as jest.Mock).mockResolvedValue({ resources: [] });
  (listAccountLibraryApi as jest.Mock).mockResolvedValue({ library: [], pagination: { page: 1, pageCount: 0 } });
  (deleteEventResourceApi as jest.Mock).mockResolvedValue({ deleted: true });
  (saveMagicMirrorConfigApi as jest.Mock).mockImplementation((_eventId, _modeId, input) => Promise.resolve({ config: { revision: input.expectedRevision + 1, config: input.config } }));
  (validateMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ valid: true, errors: [], warnings: [] });
  (publishMagicMirrorConfigApi as jest.Mock).mockResolvedValue({ version: { id: '91', version: 2, config: defaultMirrorConfig() } });
});

test('owner changes a prototype format and saves with the expected revision', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByType(MirrorFormatSelector).props.onChange('collage'));
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  expect(saveMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({ expectedRevision: 2, config: expect.objectContaining({ layout: expect.objectContaining({ format: 'collage', shotCount: 4 }) }) }));
});

test('a real tab press reveals the selected configurator section', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();

  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'horizontal-submenu-design' }).props.onPress());

  expect(renderer!.root.findByProps({ testID: 'horizontal-submenu-design' }).props.accessibilityState).toEqual({ selected: true });
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Seleccion multiple');
});

test('starts in design without an event tab and opens the transversal preview modal', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();

  expect(renderer!.root.findAllByProps({ testID: 'horizontal-submenu-event' })).toHaveLength(0);
  expect(renderer!.root.findByProps({ testID: 'horizontal-submenu-design' }).props.accessibilityState).toEqual({ selected: true });
  expect(renderer!.root.findByType(MirrorFormatSelector)).toBeTruthy();
  expect(renderer!.root.findAllByProps({ testID: 'mirror-preview-modal' })).toHaveLength(0);

  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'mirror-preview-open' }).props.onPress());

  expect(renderer!.root.findByProps({ testID: 'mirror-preview-modal' })).toBeTruthy();
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Asi quedaria');
  expect(text).toContain('Dimensiones');
  expect(text).toContain('Numero de tomas');
});

test('operator sees only the active publication', async () => {
  mockedAuth.mockReturnValue({ user: { themeMode: 'dark', globalRoles: [], accounts: [{ account, status: 'active', role: { slug: 'operator' } }] } });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();
  expect(getPublishedMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30');
  expect(getMagicMirrorConfigApi).not.toHaveBeenCalled();
  expect(renderer!.root.findAllByProps({ testID: 'mirror-save' })).toHaveLength(0);
});

test('revision conflict exposes both explicit recovery actions', async () => {
  (saveMagicMirrorConfigApi as jest.Mock).mockRejectedValue(Object.assign(new Error('CONFIG_REVISION_CONFLICT'), { status: 409, payload: { error: 'CONFIG_REVISION_CONFLICT', details: { currentRevision: 3 } } }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByType(MirrorFormatSelector).props.onChange('postal'));
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  const text = renderer!.root.findAllByType(Text).map((node) => node.props.children).flat(Infinity).join(' ');
  expect(text).toContain('Cargar servidor');
  expect(text).toContain('Conservar copia local');
});

test('publish saves dirty state, validates and creates an immutable version after confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByType(MirrorFormatSelector).props.onChange('doble'));
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-publish' }).props.onPress());
  await flush();
  expect(saveMagicMirrorConfigApi).toHaveBeenCalled();
  expect(validateMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', expect.objectContaining({ publish: true }));
  expect(publishMagicMirrorConfigApi).toHaveBeenCalledWith('20', '30', 3);
  alert.mockRestore();
});

test('restores a local draft after an app restart when the base revision still matches', async () => {
  const localConfig = applyMirrorFormat(defaultMirrorConfig(), 'collage');
  await AsyncStorage.setItem('mirror-config-draft:v1:10:20:30', JSON.stringify({ baseRevision: 2, config: localConfig }));
  const alert = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => { buttons?.[1]?.onPress?.(); });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();
  expect(renderer!.root.findByType(MirrorFormatSelector).props.value).toBe('collage');
  alert.mockRestore();
});

test('rolls back a newly associated resource when saving conflicts', async () => {
  const item = { id: '40', libraryAssetId: '50', displayName: 'Marco', asset: { id: '50', name: 'Marco', type: 'template', mimeType: 'image/png' } };
  (listAccountLibraryApi as jest.Mock).mockResolvedValue({ library: [item], pagination: { page: 1, pageCount: 1 } });
  (createEventResourceApi as jest.Mock).mockResolvedValue({ resource: { id: '60', libraryAssetId: '50', purpose: 'template', asset: item.asset } });
  (saveMagicMirrorConfigApi as jest.Mock).mockRejectedValue(Object.assign(new Error('CONFIG_REVISION_CONFLICT'), { status: 409, payload: { error: 'CONFIG_REVISION_CONFLICT' } }));
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<MagicMirrorConfigScreen event={event} eventMode={eventMode} accountId="10" onBack={jest.fn()} />); });
  await flush();
  const openButtons = renderer!.root.findAll((node) => node.props.label === 'Seleccionar recurso');
  await ReactTestRenderer.act(async () => openButtons[0].props.onPress());
  await flush();
  ReactTestRenderer.act(() => renderer!.root.findByType(ResourcePicker).props.onSelect(item));
  await ReactTestRenderer.act(async () => renderer!.root.findByType(ResourceSelectionSummary).props.onConfirm());
  ReactTestRenderer.act(() => renderer!.root.findByProps({ selectedKey: 'design' }).props.onSelect('review'));
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'mirror-save' }).props.onPress());
  expect(deleteEventResourceApi).toHaveBeenCalledWith('20', '60');
});
