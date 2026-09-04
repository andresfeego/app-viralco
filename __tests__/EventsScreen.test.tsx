import React from 'react';
import { StyleSheet } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
jest.mock('react-native-paper', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const actual = jest.requireActual('react-native-paper');
  const Menu = (props: any) => ReactModule.createElement(View, null, props.anchor, props.visible ? props.children : null);
  Menu.Item = (props: any) => <View {...props} />;
  return { ...actual, Menu };
});
jest.mock('@react-native-picker/picker', () => {
  const { View } = require('react-native');
  const Picker = (props: any) => <View {...props}>{props.children}</View>;
  Picker.Item = (props: any) => <View {...props} />;
  return { Picker };
});
jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: () => null, useToast: jest.fn() }));
jest.mock('../src/services/api/accounts', () => ({ listAccountsApi: jest.fn() }));
jest.mock('../src/services/api/events', () => ({
  createAccountLibraryAssetApi: jest.fn(),
  createEventApi: jest.fn(),
  deleteEventApi: jest.fn(),
  createEventResourceApi: jest.fn(),
  getEventDetailApi: jest.fn(),
  getPublishedMagicMirrorConfigApi: jest.fn(),
  listAccountLibraryApi: jest.fn(),
  listEventModesApi: jest.fn(),
  listEventResourcesApi: jest.fn(),
  listEventsApi: jest.fn(),
  listEventTypesApi: jest.fn(),
  prepareAccountLibraryUploadApi: jest.fn(),
  updateEventApi: jest.fn(),
  updateEventBrandingApi: jest.fn(),
  updateEventResourceApi: jest.fn(),
}));
jest.mock('../src/services/media/imagePicker', () => ({
  pickEventResourceImage: jest.fn(),
}));

import { useAuth } from '../src/hooks/useAuth';
import { useToast } from '../src/providers/ToastProvider';
import { listAccountsApi } from '../src/services/api/accounts';
import { createEventApi, deleteEventApi, getEventDetailApi, getPublishedMagicMirrorConfigApi, listEventModesApi, listEventsApi, listEventTypesApi } from '../src/services/api/events';
import { EventListCard } from '../src/components/EventListCard';
import { EventModeRow } from '../src/components/EventModeRow';
import { AccountRequiredEmptyState } from '../src/components/AccountRequiredEmptyState';
import { SelectableChipGroup } from '../src/components/SelectableChipGroup';
import { AppButton } from '../src/design-system/components/AppButton';
import { tokens } from '../src/design-system/tokens';
import { EventsScreen } from '../src/screens/EventsScreen';

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseToast = useToast as jest.Mock;
const mockedListAccounts = listAccountsApi as jest.Mock;
const mockedCreateEvent = createEventApi as jest.Mock;
const mockedDeleteEvent = deleteEventApi as jest.Mock;
const mockedGetEventDetail = getEventDetailApi as jest.Mock;
const mockedGetPublishedMirrorConfig = getPublishedMagicMirrorConfigApi as jest.Mock;
const mockedListEvents = listEventsApi as jest.Mock;
const mockedListEventTypes = listEventTypesApi as jest.Mock;
const mockedListModes = listEventModesApi as jest.Mock;

function hasText(root: ReactTestRenderer.ReactTestInstance, text: string) {
  return root.findAll((node) => node.children.includes(text)).length > 0;
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockedUseAuth.mockReturnValue({
    user: { themeMode: 'dark', globalRoles: [], accounts: [{ account: { id: '1' }, status: 'active', role: { slug: 'owner' } }] },
  });
  mockedGetPublishedMirrorConfig.mockRejectedValue(new Error('Sin publicacion'));
  mockedUseToast.mockReturnValue({ showToast: jest.fn(), hideToast: jest.fn() });
  mockedCreateEvent.mockResolvedValue({ event: { id: '10', accountId: '1', name: 'Evento Demo', slug: 'boda-evento-demo-2026-08-19', eventType: { slug: 'boda', name: 'Boda' }, startDate: null, endDate: null, status: 'draft', timezone: 'America/Bogota', modes: [] } });
  mockedListEventTypes.mockResolvedValue({ types: [{ id: '1', slug: 'boda', name: 'Boda', isActive: true }] });
  mockedListModes.mockResolvedValue({ modes: [{ id: '1', slug: 'espejo', name: 'Espejo', isDefault: true }] });
  mockedListEvents.mockResolvedValue({ events: [] });
  mockedDeleteEvent.mockResolvedValue({ deleted: true, archived: false, eventId: '10' });
});

afterEach(() => {
  ReactTestRenderer.act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

test('events list hides account selector when user has one account', async () => {
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list']} />);
  });

  expect(hasText(renderer!.root, 'Cambiar de cuenta')).toBe(false);
  ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});

test('event creation opens in a modal and shows the account-required state when needed', async () => {
  mockedListAccounts.mockResolvedValue({ accounts: [] });
  const onCreateAccount = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'create']} onCreateAccount={onCreateAccount} />);
  });

  expect(renderer!.root.findAllByProps({ testID: 'event-name-input' })).toHaveLength(0);
  expect(renderer!.root.findAllByProps({ testID: 'event-create-save' })).toHaveLength(0);
  const createButton = renderer!.root
    .findAllByType(AppButton)
    .find((node) => node.props.testID === 'event-create-open');
  expect(createButton).toBeDefined();
  expect(renderer!.root.findAllByType(AccountRequiredEmptyState)).toHaveLength(0);

  ReactTestRenderer.act(() => {
    createButton!.props.onPress();
  });

  const modalSafeAreaNodes = renderer!.root.findAllByProps({ testID: 'event-create-modal-safe-area' });
  expect(modalSafeAreaNodes.some((node) => StyleSheet.flatten(node.props.style)?.paddingTop === tokens.spacing.xl * 2)).toBe(true);
  expect(renderer!.root.findAllByType(AccountRequiredEmptyState)).toHaveLength(1);
  ReactTestRenderer.act(() => renderer!.root.findByType(AccountRequiredEmptyState).props.onCreateAccount());
  expect(onCreateAccount).toHaveBeenCalledTimes(1);
});

test('events list shows account switcher when user has multiple accounts', async () => {
  mockedListAccounts.mockResolvedValue({
    accounts: [
      { id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' },
      { id: '2', name: 'Cuenta Dos', slug: 'cuenta-dos' },
    ],
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list']} />);
  });

  expect(hasText(renderer!.root, 'Cambiar de cuenta')).toBe(true);
  ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});

test('filters the event list by status', async () => {
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  mockedListEvents.mockResolvedValue({
    events: [
      { id: '10', name: 'Evento activo', status: 'active' },
      { id: '11', name: 'Evento borrador', status: 'draft' },
      { id: '12', name: 'Evento archivado', status: 'archived' },
    ],
  });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'create']} />);
  });

  expect(renderer!.root.findAllByType(EventListCard)).toHaveLength(3);
  const statusFilter = renderer!.root
    .findAllByType(SelectableChipGroup)
    .find((node) => node.props.testID === 'event-status-filter');
  expect(statusFilter?.props.options.map((option: any) => option.value)).toEqual(['', 'active', 'draft', 'archived']);

  ReactTestRenderer.act(() => {
    statusFilter!.props.onChange('draft');
  });

  expect(renderer!.root.findAllByType(EventListCard)).toHaveLength(1);
  expect(renderer!.root.findByType(EventListCard).props.item.id).toBe('11');
});

test('event creation uses the selected account even when selector is hidden', async () => {
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen initialSection="create" allowedSections={['create']} />);
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'event-type-selector-boda' }).props.onPress();
    renderer!.root.findByProps({ testID: 'event-name-input' }).props.onChangeText('Evento Demo');
  });

  await ReactTestRenderer.act(async () => {
    renderer!.root.findByProps({ testID: 'event-create-save' }).props.onPress();
  });

  expect(mockedCreateEvent).toHaveBeenCalledWith('1', expect.objectContaining({ eventTypeSlug: 'boda', name: 'Evento Demo', modeSlugs: ['espejo'], status: 'draft' }));
  expect(mockedCreateEvent.mock.calls[0][1].startDate).toBeUndefined();
  expect(mockedCreateEvent.mock.calls[0][1].timezone).toBeUndefined();
  expect(hasText(renderer!.root, 'Cambiar de cuenta')).toBe(false);
  ReactTestRenderer.act(() => {
    renderer!.unmount();
  });
});

test('opens the mirror configurator from event detail', async () => {
  const mirrorEvent = { id: '10', accountId: '1', name: 'Evento Espejo', status: 'draft', modes: [{ id: '30', isActive: true, mode: { slug: 'espejo', name: 'Espejo magico' } }] };
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  mockedListEvents.mockResolvedValue({ events: [mirrorEvent] });
  mockedGetEventDetail.mockResolvedValue({ event: mirrorEvent });
  const onConfigureMirror = jest.fn();
  const onHeaderChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'detail']} onConfigureMirror={onConfigureMirror} onHeaderChange={onHeaderChange} />); });
  await ReactTestRenderer.act(async () => renderer!.root.findByType(EventListCard).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
  expect(onHeaderChange).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Evento Espejo', subtitle: 'Detalle de evento' }));
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'event-configure-mirror' }).props.onPress());
  expect(onConfigureMirror).toHaveBeenCalledWith(expect.objectContaining({ event: expect.objectContaining({ id: '10' }), eventMode: expect.objectContaining({ id: '30' }), accountId: '1', canEdit: true }));
  expect(renderer!.root.findByType(EventModeRow).props.canLaunch).toBe(false);
});

test('enables launch only for an active mode with a published configuration and launch handler', async () => {
  const mirrorEvent = { id: '10', accountId: '1', name: 'Evento activo', status: 'active', modes: [{ id: '30', isActive: true, mode: { slug: 'espejo', name: 'Espejo' } }] };
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  mockedListEvents.mockResolvedValue({ events: [mirrorEvent] });
  mockedGetEventDetail.mockResolvedValue({ event: mirrorEvent });
  mockedGetPublishedMirrorConfig.mockResolvedValue({ version: { id: '99' } });
  const onLaunchMirror = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'detail']} onConfigureMirror={jest.fn()} onLaunchMirror={onLaunchMirror} />);
  });
  await ReactTestRenderer.act(async () => renderer!.root.findByType(EventListCard).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });

  const modeRow = renderer!.root.findByType(EventModeRow);
  expect(modeRow.props.canLaunch).toBe(true);
  ReactTestRenderer.act(() => modeRow.props.onLaunch());
  expect(onLaunchMirror).toHaveBeenCalledWith(expect.objectContaining({ eventMode: expect.objectContaining({ id: '30' }) }));
});

test('groups mode rows without card gaps and omits the final divider', async () => {
  const event = {
    id: '10',
    accountId: '1',
    name: 'Evento multimodo',
    status: 'draft',
    modes: [
      { id: '30', isActive: true, mode: { slug: 'espejo', name: 'Espejo' } },
      { id: '31', isActive: true, mode: { slug: 'cabina', name: 'Cabina' } },
      { id: '32', isActive: true, mode: { slug: 'video-360', name: 'Video 360' } },
    ],
  };
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  mockedListEvents.mockResolvedValue({ events: [event] });
  mockedGetEventDetail.mockResolvedValue({ event });
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'detail']} onConfigureMirror={jest.fn()} />);
  });
  await ReactTestRenderer.act(async () => renderer!.root.findByType(EventListCard).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });

  const modeRows = renderer!.root.findAllByType(EventModeRow);
  expect(modeRows.map((row) => row.props.showTopDivider)).toEqual([true, false, false]);
  expect(modeRows.map((row) => row.props.showDivider)).toEqual([true, true, false]);
  expect(renderer!.root.findByProps({ testID: 'event-mode-list' })).toBeTruthy();
});

test('confirms and deletes an event from its detail', async () => {
  const event = { id: '10', accountId: '1', name: 'Evento eliminable', status: 'draft', modes: [] };
  mockedListAccounts.mockResolvedValue({ accounts: [{ id: '1', name: 'Cuenta Uno', slug: 'cuenta-uno' }] });
  mockedListEvents.mockResolvedValue({ events: [event] });
  mockedGetEventDetail.mockResolvedValue({ event });
  const showToast = jest.fn();
  mockedUseToast.mockReturnValue({ showToast, hideToast: jest.fn() });
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'detail']} />); });
  await ReactTestRenderer.act(async () => renderer!.root.findByType(EventListCard).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'event-delete-open' }).props.onPress());
  await ReactTestRenderer.act(async () => renderer!.root.findByProps({ testID: 'event-delete-confirm' }).props.onPress());
  expect(mockedDeleteEvent).toHaveBeenCalledWith('10');
  expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ message: 'Evento eliminado', type: 'success' }));
});
