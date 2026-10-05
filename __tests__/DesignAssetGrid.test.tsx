import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');

import { DesignAssetGrid } from '../src/components/DesignAssetGrid';
import { ResourceGalleryTile } from '../src/components/ResourceGalleryTile';
import { getTheme } from '../src/design-system/theme';
import { IconTextButton } from '../src/components/IconTextButton';

const item = (id: string) => ({ libraryAssetId: id, asset: { id, name: `Asset ${id}`, type: 'frame', mimeType: 'image/png' } });

test('renders selected assets first in a fixed three-column design grid', () => {
  const onRemove = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<DesignAssetGrid label="Favoritos" items={[item('1'), item('2'), item('3'), item('4')]} selectedItems={[item('3')]} theme={getTheme('light')} onSelect={jest.fn()} onRemove={onRemove} />);
  });
  const grid = renderer!.root.findByType(DesignAssetGrid).findByType('View' as any);
  ReactTestRenderer.act(() => grid.props.onLayout?.({ nativeEvent: { layout: { width: 304 } } }));
  const tiles = renderer!.root.findAllByType(ResourceGalleryTile);
  expect(tiles).toHaveLength(4);
  expect(tiles[0].props.item.libraryAssetId).toBe('3');
  expect(tiles[0].props.selected).toBe(true);
  expect(tiles.every((tile) => tile.props.tileSize <= 100)).toBe(true);
  ReactTestRenderer.act(() => tiles[0].props.onRemove(tiles[0].props.item));
  expect(onRemove).toHaveBeenCalledWith(expect.objectContaining({ libraryAssetId: '3' }));
});

test.each(['light', 'dark'])('instance controls use a separate add button without a gallery trash action in %s', (mode) => {
  const onAddInstance = jest.fn();
  const onSelect = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => { renderer = ReactTestRenderer.create(<DesignAssetGrid items={[item('1')]} selectedItems={[item('1')]} theme={getTheme(mode)} instanceCounts={{ '1': 2 }} onSelect={onSelect} onAddInstance={onAddInstance} onRemove={jest.fn()} />); });
  expect(renderer!.root.findByType(ResourceGalleryTile).props.onRemove).toBeUndefined();
  expect(renderer!.root.findByProps({ testID: 'design-instance-count-1' }).props.children).toBe(2);
  ReactTestRenderer.act(() => renderer!.root.findByType(IconTextButton).props.onPress());
  expect(onAddInstance).toHaveBeenCalledWith(item('1'));
  expect(onSelect).not.toHaveBeenCalled();
});
