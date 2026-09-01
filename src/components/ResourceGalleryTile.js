import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { StatusBadge } from './StatusBadge';

export function resourceTypeLabel(type) {
  const labels = {
    template: 'resource_007', frame: 'resource_008', animation: 'resource_009', gif_overlay: 'resource_010',
    font: 'resource_011', background: 'resource_012', start_screen: 'resource_044',
  };
  return t(labels[type] || 'resource_018');
}

export function resourceThumbnailUri(item) {
  const asset = item?.asset || {};
  const variant = asset?.variants?.card || asset?.variants?.thumb;
  const variantUri = variant?.signedUrl || variant?.fileUrl || '';
  if (variantUri) return variantUri;
  if (String(asset.mimeType || '').startsWith('image/')) {
    return asset.fileSignedUrl || asset.previewUrl || asset.fileUrl || '';
  }
  return asset.previewUrl || '';
}

export function resourceOriginalUri(item) {
  const asset = item?.asset || {};
  const full = asset?.variants?.full;
  return asset.fileSignedUrl || full?.signedUrl || full?.fileUrl || asset.fileUrl || resourceThumbnailUri(item);
}

export function ResourceGalleryTile({ item, tileSize, theme, canManage, onPress, onToggleFavorite }) {
  const asset = item?.asset || {};
  const name = item.displayName || asset.name || t('resource_018');
  const typeLabel = resourceTypeLabel(asset.type);
  const thumbnailUri = resourceThumbnailUri(item);
  const isVideo = String(asset.mimeType || '').startsWith('video/');
  return (
    <View style={[styles.tile, { width: tileSize, height: tileSize, backgroundColor: theme.surface }]}>
      <Pressable
        testID={`resource-gallery-item-${item.libraryAssetId}`}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${typeLabel}`}
        onPress={() => onPress(item)}
        style={styles.previewButton}
      >
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.fallback, { backgroundColor: theme.surface }]}>
            <Icon name={asset.type === 'font' ? 'font' : 'file-image'} iconStyle="solid" size={tokens.typography.heading} color={theme.textSecondary} />
            <Text numberOfLines={2} style={[styles.fallbackText, { color: theme.textSecondary }]}>{name}</Text>
          </View>
        )}
        {isVideo ? (
          <View pointerEvents="none" style={styles.playOverlay}>
            <View style={[styles.playBadge, { backgroundColor: theme.surface }]}>
              <Icon name="play" iconStyle="solid" size={tokens.typography.caption} color={theme.primary} />
            </View>
          </View>
        ) : null}
        <View pointerEvents="none" style={styles.typeBadge}><StatusBadge compact label={typeLabel} flag="info" /></View>
      </Pressable>
      <View style={[styles.favorite, { backgroundColor: theme.surface }]}>
        <IconTextButton
          theme={theme}
          icon="star"
          iconStyle={item.isFavorite ? 'solid' : 'regular'}
          variant="ghost"
          disabled={!canManage}
          accessibilityLabel={item.isFavorite ? t('resource_047') : t('resource_046')}
          onPress={() => onToggleFavorite(item)}
          testID={`resource-gallery-favorite-${item.libraryAssetId}`}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden', borderRadius: tokens.radius.sm },
  previewButton: { flex: 1 },
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.xxs, padding: tokens.spacing.xs },
  fallbackText: { fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBadge: { borderRadius: tokens.radius.pill, padding: tokens.spacing.xs },
  typeBadge: { position: 'absolute', left: tokens.spacing.xxs, bottom: tokens.spacing.xxs },
  favorite: { position: 'absolute', right: tokens.spacing.xxs, top: tokens.spacing.xxs, borderRadius: tokens.radius.pill, padding: tokens.spacing.xxs },
});
