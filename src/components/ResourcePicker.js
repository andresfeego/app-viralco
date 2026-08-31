import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { ResourceCard } from './ResourceCard';
import { ResourceFilters } from './ResourceFilters';

const MIRROR_RESOURCE_TYPES = new Set(['template', 'frame', 'animation', 'gif_overlay', 'font', 'background', 'start_screen']);

export function ResourcePicker({ items, theme, canManage, loading, error, filters, onFiltersChange, selectedId, onSelect, onToggleFavorite, onRetry, pagination, onPageChange }) {
  return (
    <View style={styles.wrap}>
      <ResourceFilters
        theme={theme}
        tab={filters.tab}
        onTabChange={(tab) => onFiltersChange({ ...filters, tab, page: 1 })}
        search={filters.search}
        onSearchChange={(search) => onFiltersChange({ ...filters, search, page: 1 })}
        type={filters.type}
        onTypeChange={(type) => onFiltersChange({ ...filters, type, page: 1 })}
      />
      {loading ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_022')}</Text> : null}
      {error ? (
        <View style={styles.feedbackWrap}>
          <Text style={[styles.feedback, { color: theme.alert }]}>{error}</Text>
          <AppButton label={t('resource_025')} onPress={onRetry} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
        </View>
      ) : null}
      {!loading && !error && items.length === 0 ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{filters.search || filters.type || filters.tab === 'favorites' ? t('resource_024') : t('resource_023')}</Text> : null}
      {items.map((item) => (
        <ResourceCard
          key={item.id}
          item={item}
          theme={theme}
          canManage={canManage}
          compatible={MIRROR_RESOURCE_TYPES.has(item?.asset?.type)}
          selected={selectedId === item.id}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
      {pagination?.pageCount > 1 ? (
        <View style={styles.pagination}>
          <AppButton label={t('resource_026')} onPress={() => onPageChange(pagination.page - 1)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.pageButton} />
          <Text style={[styles.feedback, { color: theme.textSecondary }]}>{pagination.page}/{pagination.pageCount}</Text>
          <AppButton label={t('resource_027')} onPress={() => onPageChange(pagination.page + 1)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.pageButton} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
  feedbackWrap: { gap: tokens.spacing.sm },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.xs },
  pageButton: { flex: 1, minWidth: 0 },
});
