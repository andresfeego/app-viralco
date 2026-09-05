import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { ResourceGalleryTile } from './ResourceGalleryTile';

const COLUMNS = 3;

export function DesignAssetGrid({ label, items = [], selectedItems = [], theme, disabled = false, emptyLabel = '', emptyActionLabel = '', onEmptyAction, onSelect, onRemove }) {
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
        {ordered.map((item) => <ResourceGalleryTile key={String(item.libraryAssetId)} item={item} tileSize={tileSize} theme={theme} canManage={false} selected={selectedIds.has(String(item.libraryAssetId))} showFavoriteAction={false} disabled={disabled} onPress={onSelect} onRemove={disabled ? undefined : onRemove} />)}
      </View> : <View style={styles.emptyState}>
        <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyLabel}</Text>
        {onEmptyAction && emptyActionLabel ? <AppButton label={emptyActionLabel} onPress={onEmptyAction} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.primary} style={styles.emptyAction} /> : null}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xxs },
  empty: { fontSize: tokens.typography.caption },
  emptyState: { alignItems: 'flex-start', gap: tokens.spacing.xs },
  emptyAction: { alignSelf: 'flex-start' },
});
