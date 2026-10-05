import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { EventMirrorGallery } from '../src/components/EventMirrorGallery';
import { listMirrorCompositionsApi } from '../src/services/api/events';
import { getTheme } from '../src/design-system/theme';
import { loadEventSyncEntries } from '../src/services/mirrorEventSync';
import { FlatList } from 'react-native';
jest.mock('../src/services/mirrorEventSync', () => ({ loadEventSyncEntries: jest.fn(async () => []), syncEventCompositions: jest.fn() }));
jest.mock('../src/components/CompositionSyncCard', () => ({ CompositionSyncCard: 'SyncCard' }));
jest.mock('../src/services/api/events', () => ({ listMirrorCompositionsApi: jest.fn() }));
jest.mock('../src/components/IconTextButton', () => ({ IconTextButton: 'Action' }));
jest.mock('../src/components/MirrorGuestScene', () => ({ GuestGallery: 'Gallery', GuestModal: 'GalleryModal' }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
it('hides the shortcut when there are no synchronized compositions', async () => {
  listMirrorCompositionsApi.mockResolvedValue({ items: [], nextCursor: null });
  let tree; await act(async () => { tree = renderer.create(<EventMirrorGallery eventId="1" eventModeId="2" theme={getTheme('light')} />); });
  expect(tree.toJSON()).toBeNull(); act(() => tree.unmount());
});
it.each(['light', 'dark'])('opens the shared gallery for the event in %s', async (mode) => {
  listMirrorCompositionsApi.mockResolvedValue({ items: [{ clientAssetId: 'remote', url: 'https://example.test/photo' }], nextCursor: null });
  let tree; await act(async () => { tree = renderer.create(<EventMirrorGallery eventId="1" eventModeId="2" eventName="Fiesta" theme={getTheme(mode)} />); });
  await act(async () => tree.root.findByProps({ testID: 'event-mirror-gallery' }).props.onPress());
  expect(listMirrorCompositionsApi).toHaveBeenLastCalledWith('1', '2', null);
  expect(tree.root.findByType('SyncCard').props.run.output.clientAssetId).toBe('remote');
  expect(tree.root.findByType('GalleryModal').props.title).toBe('Fiesta');
  expect(tree.root.findByType('GalleryModal').props.subtitle).toBeTruthy();
  expect(tree.root.findByType('GalleryModal').props.headerCoversSafeArea).toBe(true);
  act(() => tree.unmount());
});
it('keeps local photos available when the server gallery fails', async () => {
  loadEventSyncEntries.mockResolvedValueOnce([{ run: { output: { uri: 'file:///photo.jpg', clientAssetId: 'local' } } }]).mockResolvedValueOnce([{ run: { output: { uri: 'file:///photo.jpg', clientAssetId: 'local' } } }]);
  listMirrorCompositionsApi.mockRejectedValue(new Error('Offline'));
  let tree; await act(async () => { tree = renderer.create(<EventMirrorGallery eventId="1" eventModeId="2" theme={getTheme('dark')} />); });
  await act(async () => tree.root.findByProps({ testID: 'event-mirror-gallery' }).props.onPress());
  expect(tree.root.findByType('SyncCard').props.run.output.clientAssetId).toBe('local');
  act(() => tree.unmount());
});

it('refreshes from the first page by gesture without a refresh button or automatic capture upload', async () => {
  listMirrorCompositionsApi.mockResolvedValue({ items: [{ clientAssetId: 'remote', url: 'https://example.test/photo' }], nextCursor: 'next' });
  let tree;
  await act(async () => { tree = renderer.create(<EventMirrorGallery eventId="1" eventModeId="2" theme={getTheme('light')} />); });
  await act(async () => tree.root.findByProps({ testID: 'event-mirror-gallery' }).props.onPress());
  expect(tree.root.findAllByType('Action').some(action => action.props.icon === 'rotate-right')).toBe(false);
  expect(tree.root.findByType(FlatList).props.alwaysBounceVertical).toBe(true);
  await act(async () => tree.root.findByType(FlatList).props.refreshControl.props.onRefresh());
  expect(listMirrorCompositionsApi).toHaveBeenLastCalledWith('1', '2', null);
  expect(tree.root.findByType(FlatList).props.refreshControl.props.refreshing).toBe(false);
  expect(tree.root.findAllByType('Action').some(action => action.props.icon === 'cloud-arrow-up')).toBe(true);
  act(() => tree.unmount());
});
