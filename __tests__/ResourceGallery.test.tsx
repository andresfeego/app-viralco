import React from 'react';
import { Image } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');

import { ResourceGalleryTile, resourceOriginalUri, resourceThumbnailUri } from '../src/components/ResourceGalleryTile';
import { ResourcePreviewModal } from '../src/components/ResourcePreviewModal';
import { MediaPreview } from '../src/design-system/components/MediaPreview';
import { getTheme } from '../src/design-system/theme';

const theme = getTheme('dark');
const imageItem = {
  libraryAssetId: '50', isFavorite: false, displayName: 'Marco',
  asset: {
    id: '50', name: 'Marco', type: 'frame', mimeType: 'image/png', ownerType: 'viralco',
    fileSignedUrl: 'https://assets.test/original.png',
    variants: { card: { signedUrl: 'https://assets.test/card.webp' } },
  },
};
const videoItem = {
  libraryAssetId: '51', isFavorite: true, displayName: 'Animacion',
  asset: {
    id: '51', name: 'Animacion', type: 'animation', mimeType: 'video/mp4', ownerType: 'viralco',
    fileSignedUrl: 'https://assets.test/video.mp4',
    variants: { card: { signedUrl: 'https://assets.test/poster.webp' } },
  },
};

test('uses lightweight variants in the grid and originals in the preview', () => {
  expect(resourceThumbnailUri(imageItem)).toBe('https://assets.test/card.webp');
  expect(resourceThumbnailUri(videoItem)).toBe('https://assets.test/poster.webp');
  expect(resourceOriginalUri(videoItem)).toBe('https://assets.test/video.mp4');
});

test('renders a square accessible tile with favorite and preview actions', () => {
  const onPress = jest.fn();
  const onToggleFavorite = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ResourceGalleryTile item={imageItem} tileSize={120} theme={theme} canManage onPress={onPress} onToggleFavorite={onToggleFavorite} />);
  });
  expect(renderer!.root.findByType(Image).props.source.uri).toBe('https://assets.test/card.webp');
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'resource-gallery-item-50' }).props.onPress());
  expect(onPress).toHaveBeenCalledWith(imageItem);
  ReactTestRenderer.act(() => renderer!.root.findByProps({ testID: 'resource-gallery-favorite-50' }).props.onPress());
  expect(onToggleFavorite).toHaveBeenCalledWith(imageItem);
});

test('opens video originals with controls and contain sizing in the preview modal', () => {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }}>
        <ResourcePreviewModal item={videoItem} theme={theme} canManage onClose={jest.fn()} onToggleFavorite={jest.fn()} />
      </SafeAreaProvider>,
    );
  });
  expect(renderer!.root.findByType(MediaPreview).props).toMatchObject({
    uri: 'https://assets.test/video.mp4',
    mediaType: 'video/mp4',
    resizeMode: 'contain',
  });
});
