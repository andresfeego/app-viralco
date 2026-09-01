import React from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { ResourceGalleryTile } from './ResourceGalleryTile';

export function ResourceGallery({ items, theme, canManage, loading, loadingMore, refreshing, error, emptyLabel, header, onPressItem, onToggleFavorite, onRetry, onRefresh, onLoadMore }) {
  const { width } = useWindowDimensions();
  const columns = width >= tokens.layout.wideScreenMinWidth
    ? tokens.layout.resourceGridWideColumns
    : tokens.layout.resourceGridPhoneColumns;
  const gaps = tokens.spacing.xxs * (columns - 1);
  const tileSize = Math.floor((width - gaps) / columns);

  const empty = loading ? (
    <ActivityIndicator testID="resource-gallery-loading" color={theme.primary} />
  ) : error ? (
    <View style={styles.state}>
      <Text style={[styles.feedback, { color: theme.alert }]}>{error}</Text>
      <AppButton label={t('resource_025')} onPress={onRetry} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
    </View>
  ) : <Text style={[styles.feedback, { color: theme.textSecondary }]}>{emptyLabel}</Text>;

  return (
    <FlatList
      key={`resource-gallery-${columns}`}
      testID="resource-gallery"
      data={items}
      numColumns={columns}
      keyExtractor={(item) => String(item.libraryAssetId)}
      renderItem={({ item }) => (
        <ResourceGalleryTile item={item} tileSize={tileSize} theme={theme} canManage={canManage} onPress={onPressItem} onToggleFavorite={onToggleFavorite} />
      )}
      columnWrapperStyle={columns > 1 ? styles.row : null}
      contentContainerStyle={[styles.content, items.length === 0 ? styles.emptyContent : null]}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ListFooterComponent={loadingMore ? <ActivityIndicator testID="resource-gallery-loading-more" color={theme.primary} style={styles.footer} /> : null}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: tokens.spacing.xl * 3, gap: tokens.spacing.xxs },
  emptyContent: { flexGrow: 1 },
  row: { gap: tokens.spacing.xxs },
  state: { padding: tokens.spacing.md, gap: tokens.spacing.sm, alignItems: 'center' },
  feedback: { padding: tokens.spacing.md, fontSize: tokens.typography.caption, fontWeight: '700', textAlign: 'center' },
  footer: { padding: tokens.spacing.md },
});
