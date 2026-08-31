import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { StatusBadge } from './StatusBadge';

export function resourcePreviewUri(item) {
  const asset = item?.asset || {};
  return asset?.variants?.card?.signedUrl
    || asset?.variants?.card?.fileUrl
    || asset?.variants?.thumb?.signedUrl
    || asset?.variants?.thumb?.fileUrl
    || asset?.fileSignedUrl
    || asset?.previewUrl
    || asset?.fileUrl
    || '';
}

export function ResourceCard({ item, theme, canManage, compatible = true, selected = false, onToggleFavorite, onSelect }) {
  const asset = item?.asset || {};
  const previewUri = resourcePreviewUri(item);
  return (
    <SurfaceCard surfaceColor={selected ? theme.background : theme.surface} borderColor={selected ? theme.primary : theme.border}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{item.displayName || asset.name}</Text>
          <View style={styles.badges}>
            <StatusBadge compact label={asset.type || t('resource_018')} flag="info" />
            {item.isFavorite ? <StatusBadge compact label={t('resource_002')} flag="warn" /> : null}
            {!compatible ? <StatusBadge compact label={t('resource_040')} flag="error" /> : null}
          </View>
        </View>
        <IconTextButton
          theme={theme}
          icon="star"
          iconStyle={item.isFavorite ? 'solid' : 'regular'}
          variant="ghost"
          disabled={!canManage}
          onPress={() => onToggleFavorite?.(item)}
          testID={`resource-favorite-${item.libraryAssetId}`}
        />
      </View>
      {previewUri ? <MediaPreview uri={previewUri} mediaType={asset.mimeType || ''} borderColor={theme.border} textColor={theme.textSecondary} /> : null}
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{asset.ownerType === 'viralco' ? t('resource_019') : t('resource_020')}</Text>
      {onSelect ? (
        <AppButton
          label={selected ? t('resource_016') : t('resource_015')}
          onPress={() => onSelect(item)}
          disabled={!compatible}
          backgroundColor={selected ? theme.surface : theme.buttonBg}
          pressedColor={theme.buttonBgPressed}
          textColor={selected ? theme.textPrimary : theme.buttonText}
          style={styles.action}
        />
      ) : null}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: tokens.spacing.sm },
  titleWrap: { flex: 1, gap: tokens.spacing.xs },
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  meta: { fontSize: tokens.typography.caption },
  action: { width: '100%' },
});
