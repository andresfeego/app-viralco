import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { ArchivedMirrorCompositions } from '../src/components/ArchivedMirrorCompositions';
import { setCompositionArchived } from '../src/services/mirrorLocalGallery';
import { getTheme } from '../src/design-system/theme';
import { FlatList } from 'react-native';
jest.mock('../src/components/IconTextButton', () => ({ IconTextButton: 'Action' }));
jest.mock('../src/components/MirrorGuestScene', () => ({ GuestModal: 'ArchiveModal' }));
jest.mock('../src/components/CompositionSyncCard', () => ({ CompositionSyncCard: 'SyncCard' }));
jest.mock('../src/services/api/events', () => ({ listMirrorCompositionsApi: jest.fn(async () => ({ items: [], nextCursor: null })) }));
jest.mock('../src/services/mirrorLocalGallery', () => ({
  compositionKey: (run) => run.output.clientAssetId,
  loadArchivedCompositions: jest.fn(async () => ({ one: true })),
  loadEventLocalCompositions: jest.fn(async () => [{ output: { clientAssetId: 'one', uri: 'file:///photo.jpg' } }]),
  setCompositionArchived: jest.fn(async () => {}),
  syncCompositionArchives: jest.fn(async () => ({})),
}));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn() }));
it.each(['light', 'dark'])('reuses the event header and capture cards with restoration in %s', async (mode) => {
  let tree;
  await act(async () => { tree = renderer.create(<ArchivedMirrorCompositions eventId="1" eventModeIds={['2']} eventName="Fiesta" theme={getTheme(mode)} />); });
  await act(async () => tree.root.findByType('Action').props.onPress());
  expect(tree.root.findByType('ArchiveModal').props.title).toBe('Fiesta');
  expect(tree.root.findByType('ArchiveModal').props.subtitle).toBeTruthy();
  expect(tree.root.findByType('ArchiveModal').props.headerCoversSafeArea).toBe(true);
  const list = tree.root.findByType(FlatList);
  expect(list.props.alwaysBounceVertical).toBe(true);
  await act(async () => list.props.refreshControl.props.onRefresh());
  expect(tree.root.findByType(FlatList).props.refreshControl.props.refreshing).toBe(false);
  const card = tree.root.findByType('SyncCard');
  expect(card.props.onArchive).toBeUndefined();
  await act(async () => card.props.onRestore());
  expect(setCompositionArchived).toHaveBeenCalledWith(expect.objectContaining({ output: expect.objectContaining({ clientAssetId: 'one' }) }), false, { eventId: '1', eventModeIds: ['2'] });
  act(() => tree.unmount());
});
