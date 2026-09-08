import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { AnimationFavoriteCarousel } from './AnimationFavoriteCarousel';
import { IconTextButton } from './IconTextButton';
import { ResourceEmptyActions } from './ResourceEmptyActions';
import { resourceOriginalUri, resourceThumbnailUri } from './ResourceGalleryTile';

function metadataValue(asset, key, fallback = '-') {
  const value = asset?.metadata?.[key] ?? asset?.[key];
  return value == null || value === '' ? fallback : String(value);
}

export function MirrorAnimationStageCard({ stage, label, enabled, selected, favorites = [], theme, disabled = false, onEnabledChange, onSelect, onRemove, onOpenResources, onUpload }) {
  const asset = selected?.asset || {};
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={enabled ? theme.primary : theme.border}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{label}</Text>
          <Text style={[styles.state, { color: theme.textSecondary }]}>{selected ? selected.displayName || asset.name : t('mirror_182')}</Text>
        </View>
        <Switch testID={`animation-stage-${stage}`} value={enabled} onValueChange={onEnabledChange} disabled={disabled} trackColor={{ false: theme.border, true: theme.primary }} />
      </View>
      {enabled && selected ? (
        <View style={styles.selected}>
          <View style={styles.preview}>
            <MediaPreview uri={resourceOriginalUri(selected)} posterUri={resourceThumbnailUri(selected)} mediaType={asset.mimeType || 'video/mp4'} borderColor={theme.border} textColor={theme.textSecondary} resizeMode="cover" aspectRatio={tokens.layout.verticalVideoAspectRatio} autoPlay repeat controls={false} />
          </View>
          <View style={styles.details}>
            <Text numberOfLines={2} style={[styles.name, { color: theme.textPrimary }]}>{selected.displayName || asset.name}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{metadataValue(asset, 'width')} × {metadataValue(asset, 'height')}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{metadataValue(asset, 'durationSeconds', metadataValue(asset, 'duration'))} s</Text>
          </View>
          <View style={styles.remove}>
            <IconTextButton theme={theme} icon="trash-can" variant="ghost" backgroundColor={theme.alert} pressedBackgroundColor={theme.background} iconColor={theme.buttonText} iconSize={tokens.typography.body} accessibilityLabel={t('mirror_048')} disabled={disabled} onPress={onRemove} />
          </View>
        </View>
      ) : null}
      {enabled && !selected && favorites.length ? <AnimationFavoriteCarousel items={favorites} theme={theme} disabled={disabled} onSelect={onSelect} /> : null}
      {enabled && !selected && !favorites.length ? (
        <View style={styles.empty}>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>{t('mirror_180')}</Text>
          <ResourceEmptyActions theme={theme} primaryLabel={t('mirror_148')} onPrimary={onOpenResources} secondaryLabel={t('resource_060')} onSecondary={onUpload} disabled={disabled} />
        </View>
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.md },
  headerCopy: { flex: 1, minWidth: 0, gap: tokens.spacing.xxs },
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  state: { fontSize: tokens.typography.caption },
  selected: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md, paddingTop: tokens.spacing.sm },
  preview: { flex: 1, minWidth: 0 },
  details: { flex: 1, minWidth: 0, gap: tokens.spacing.xs, paddingRight: tokens.spacing.xl },
  name: { fontSize: tokens.typography.body, fontWeight: '700' },
  meta: { fontSize: tokens.typography.caption },
  remove: { position: 'absolute', right: tokens.spacing.none, top: tokens.spacing.sm },
  empty: { gap: tokens.spacing.sm, paddingTop: tokens.spacing.sm },
});
