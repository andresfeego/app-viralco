import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { ResourceGalleryTile } from './ResourceGalleryTile';
import { ResourceEmptyActions } from './ResourceEmptyActions';
import { IconTextButton } from './IconTextButton';
import { t } from '../i18n';

const COLUMNS = 3;

export function DesignAssetGrid({ label, items = [], selectedItems = [], theme, disabled = false, emptyLabel = '', emptyActionLabel = '', secondaryEmptyActionLabel = '', onEmptyAction, onSecondaryEmptyAction, onSelect, onRemove, instanceCounts, onAddInstance, addDisabled = false }) {
  const [width, setWidth] = useState(tokens.spacing.xl * COLUMNS);
  const selectedIds = useMemo(() => new Set(selectedItems.map((item) => String(item.libraryAssetId))), [selectedItems]);
  const ordered = useMemo(() => {
    const seen = new Set();
    return [...selectedItems, ...items].filter((item) => {
      const id = String(item.libraryAssetId);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [items, selectedItems]);
  const gapTotal = tokens.spacing.xxs * (COLUMNS - 1);
  const tileSize = Math.max(tokens.spacing.xl, Math.floor((width - gapTotal) / COLUMNS));
  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {label ? <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text> : null}
      {ordered.length ? <View style={styles.grid}>
        {ordered.map((item) => <View key={String(item.libraryAssetId)} style={{ width: tileSize }}>
          <ResourceGalleryTile item={item} tileSize={tileSize} theme={theme} canManage={false} selected={selectedIds.has(String(item.libraryAssetId))} showFavoriteAction={false} disabled={disabled} onPress={onSelect} onRemove={disabled || instanceCounts ? undefined : onRemove} />
          {Number(instanceCounts?.[String(item.libraryAssetId)]) > 0 ? <View style={styles.instanceActions}>
            <View style={styles.actionCell} />
            <View style={styles.actionCell}><View style={[styles.count, { backgroundColor: theme.primary }]}><Text testID={`design-instance-count-${item.libraryAssetId}`} style={[styles.countText, { color: theme.buttonText }]}>{instanceCounts[String(item.libraryAssetId)]}</Text></View></View>
            <View style={styles.actionCell}><IconTextButton theme={theme} icon="plus" denseIconOnly style={styles.addButton} disabled={disabled || addDisabled} testID={`design-instance-add-${item.libraryAssetId}`} accessibilityLabel={`${t('mirror_instance_add')}: ${item.displayName || item.asset?.name || ''}`} onPress={() => onAddInstance?.(item)} /></View>
          </View> : null}
        </View>)}
      </View> : <View style={styles.emptyState}>
        <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyLabel}</Text>
        {onEmptyAction && emptyActionLabel && onSecondaryEmptyAction && secondaryEmptyActionLabel
          ? <ResourceEmptyActions theme={theme} primaryLabel={emptyActionLabel} onPrimary={onEmptyAction} secondaryLabel={secondaryEmptyActionLabel} onSecondary={onSecondaryEmptyAction} disabled={disabled} />
          : onEmptyAction && emptyActionLabel ? <AppButton variant="outlined" borderColor={theme.textSecondary} label={emptyActionLabel} onPress={onEmptyAction} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.primary} style={styles.emptyAction} /> : null}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  instanceActions: { flexDirection: 'row', alignItems: 'center', minHeight: tokens.spacing.xl + tokens.spacing.sm },
  actionCell: { flex: 1, minWidth: 0, alignItems: 'center' },
  addButton: { width: tokens.spacing.xl, minHeight: tokens.spacing.xl + tokens.spacing.md, height: tokens.spacing.xl + tokens.spacing.md },
  count: { width: tokens.spacing.lg, height: tokens.spacing.lg, borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: tokens.typography.caption, fontWeight: '700' },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xxs },
  empty: { fontSize: tokens.typography.caption },
  emptyState: { alignItems: 'flex-start', gap: tokens.spacing.xs },
  emptyAction: { alignSelf: 'flex-start' },
});
