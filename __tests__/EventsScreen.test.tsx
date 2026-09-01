import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
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
jest.mock('../src/providers/ToastProvider', () => ({ useToast: jest.fn() }));
jest.mock('../src/services/api/accounts', () => ({ listAccountsApi: jest.fn() }));
jest.mock('../src/services/api/events', () => ({
  createAccountLibraryAssetApi: jest.fn(),
  createEventApi: jest.fn(),
  createEventResourceApi: jest.fn(),
  getEventDetailApi: jest.fn(),
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
import { createEventApi, getEventDetailApi, listEventModesApi, listEventsApi, listEventTypesApi } from '../src/services/api/events';
import { EventListCard } from '../src/components/EventListCard';
import { EventsScreen } from '../src/screens/EventsScreen';

const mockedUseAuth = useAuth as jest.Mock;
const mockedUseToast = useToast as jest.Mock;
const mockedListAccounts = listAccountsApi as jest.Mock;
const mockedCreateEvent = createEventApi as jest.Mock;
const mockedGetEventDetail = getEventDetailApi as jest.Mock;
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
  mockedUseToast.mockReturnValue({ showToast: jest.fn(), hideToast: jest.fn() });
  mockedCreateEvent.mockResolvedValue({ event: { id: '10', accountId: '1', name: 'Evento Demo', slug: 'boda-evento-demo-2026-08-19', eventType: { slug: 'boda', name: 'Boda' }, startDate: null, endDate: null, status: 'draft', timezone: 'America/Bogota', modes: [] } });
  mockedListEventTypes.mockResolvedValue({ types: [{ id: '1', slug: 'boda', name: 'Boda', isActive: true }] });
  mockedListModes.mockResolvedValue({ modes: [{ id: '1', slug: 'espejo', name: 'Espejo', isDefault: true }] });
  mockedListEvents.mockResolvedValue({ events: [] });
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
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => { renderer = ReactTestRenderer.create(<EventsScreen allowedSections={['list', 'detail']} onConfigureMirror={onConfigureMirror} />); });
  await ReactTestRenderer.act(async () => renderer!.root.findByType(EventListCard).props.onPress());
  await ReactTestRenderer.act(async () => { await Promise.resolve(); await Promise.resolve(); });
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'event-configure-mirror' }).props.onPress());
  expect(onConfigureMirror).toHaveBeenCalledWith(expect.objectContaining({ event: expect.objectContaining({ id: '10' }), eventMode: expect.objectContaining({ id: '30' }), accountId: '1', canEdit: true }));
});
