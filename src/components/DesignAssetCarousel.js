import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { AppButton } from '../design-system/components/AppButton';
import { t } from '../i18n';
import { resourceThumbnailUri } from './ResourceGalleryTile';
import { IconTextButton } from './IconTextButton';
import { ResourceEmptyActions } from './ResourceEmptyActions';

function AssetCard({ item, selected, theme, disabled, onPress, onRemove }) {
  const thumbnail = resourceThumbnailUri(item);
  const name = item?.displayName || item?.asset?.name || '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={name}
      disabled={disabled}
      onPress={() => onPress?.(item)}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border }]}
    >
      {thumbnail ? <Image source={{ uri: thumbnail }} resizeMode="contain" style={styles.image} /> : (
        <View style={styles.fallback}>
          <Icon name={item?.icon || 'image'} iconStyle="solid" size={tokens.typography.heading} color={theme.textSecondary} />
        </View>
      )}
      <Text numberOfLines={2} style={[styles.name, { color: theme.textPrimary }]}>{name}</Text>
      {selected && onRemove ? (
        <View style={styles.remove}>
          <IconTextButton
            theme={theme}
            icon="trash"
            variant="ghost"
            compactIconOnly
            accessibilityLabel={`${t('mirror_048')}: ${name}`}
            disabled={disabled}
            onPress={() => onRemove(item)}
 />
        </View>
      ) : null}
    </Pressable>
  );
}

export function DesignAssetCarousel({ label, items = [], selectedItems = [], leadingItem = null, leadingFirst = false, theme, emptyLabel = '', emptyActionLabel = '', secondaryEmptyActionLabel = '', disabled = false, onSelect, onRemove, onEmptyAction, onSecondaryEmptyAction }) {
  const selectedIds = new Set(selectedItems.map((item) => String(item.libraryAssetId)));
  const remaining = items.filter((item) => !selectedIds.has(String(item.libraryAssetId)));
  const ordered = leadingFirst
    ? [...(leadingItem ? [leadingItem] : []), ...selectedItems, ...remaining]
    : [...selectedItems, ...(leadingItem ? [leadingItem] : []), ...remaining];
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text> : null}
      {ordered.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {ordered.map((item) => (
            <AssetCard
              key={String(item.key || item.libraryAssetId)}
              item={item}
              selected={Boolean(item.selected) || selectedIds.has(String(item.libraryAssetId))}
              theme={theme}
              disabled={disabled}
              onPress={onSelect}
              onRemove={onRemove}
 />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyLabel}</Text>
          {onEmptyAction && emptyActionLabel && onSecondaryEmptyAction && secondaryEmptyActionLabel ? (
            <ResourceEmptyActions theme={theme} primaryLabel={emptyActionLabel} onPrimary={onEmptyAction} secondaryLabel={secondaryEmptyActionLabel} onSecondary={onSecondaryEmptyAction} disabled={disabled} />
          ) : onEmptyAction && emptyActionLabel ? (
            <AppButton variant="outlined" borderColor={theme.textSecondary}
              label={emptyActionLabel}
              onPress={onEmptyAction}
              backgroundColor={theme.surface}
              pressedColor={theme.background}
              textColor={theme.primary}
              style={styles.emptyAction}
 />
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  row: { gap: tokens.spacing.sm, paddingVertical: tokens.spacing.xxs },
  card: {
    width: tokens.spacing.xl * 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.xs,
    gap: tokens.spacing.xs,
    position: 'relative',
  },
  image: { width: '100%', height: tokens.spacing.xl * 2 },
  fallback: { height: tokens.spacing.xl * 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: tokens.typography.caption, fontWeight: '700' },
  empty: { fontSize: tokens.typography.caption },
  emptyState: { alignItems: 'flex-start', gap: tokens.spacing.xs },
  emptyAction: { alignSelf: 'flex-start' },
  remove: { position: 'absolute', right: tokens.spacing.sm, top: tokens.spacing.sm },
});
