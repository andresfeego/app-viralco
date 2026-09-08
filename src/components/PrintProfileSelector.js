import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { PaperFormInput } from './PaperFormInput';
import { ResourceEmptyActions } from './ResourceEmptyActions';
import { IconTextButton } from './IconTextButton';
import { resourceThumbnailUri } from './ResourceGalleryTile';

export function printProfileConfig(item) {
  return item?.asset?.metadata?.printProfile || null;
}

function ProfileCard({ item, selected, theme, disabled, onPress }) {
  const name = item?.displayName || item?.asset?.name || t('print_002');
  const uri = resourceThumbnailUri(item);
  const profile = printProfileConfig(item);
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} accessibilityLabel={name} disabled={disabled} onPress={() => onPress(item)} style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border }]}>
      {uri ? <Image source={{ uri }} resizeMode="contain" style={styles.profileImage} /> : <View style={styles.profileFallback}><Icon name="print" iconStyle="solid" size={tokens.typography.heading} color={theme.primary} /></View>}
      <Text numberOfLines={2} style={[styles.profileName, { color: theme.textPrimary }]}>{name}</Text>
      {profile ? <Text numberOfLines={1} style={[styles.profileMeta, { color: theme.textSecondary }]}>{profile.paper.widthMm} × {profile.paper.heightMm} mm</Text> : null}
    </Pressable>
  );
}

export function PrintProfileSelector({ items = [], selected = null, search = '', binding = null, theme, disabled = false, onSearchChange, onSelect, onRemove, onOpenResources, onDetect }) {
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return items;
    return items.filter((item) => `${item?.displayName || ''} ${item?.asset?.name || ''} ${printProfileConfig(item)?.manufacturer || ''} ${printProfileConfig(item)?.model || ''}`.toLocaleLowerCase().includes(query));
  }, [items, search]);
  return (
    <View style={styles.stack}>
      <PaperFormInput theme={theme} label={t('print_003')} value={search} onChangeText={onSearchChange} editable={!disabled} />
      {binding ? <View style={styles.binding}><Icon name="wifi" iconStyle="solid" size={tokens.typography.caption} color={theme.success} /><Text style={[styles.bindingText, { color: theme.textSecondary }]}>{t('print_004')}: {binding.name}</Text></View> : null}
      {filtered.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reel}>
          {filtered.map((item) => <ProfileCard key={String(item.libraryAssetId)} item={item} selected={String(selected?.libraryAssetId || '') === String(item.libraryAssetId)} theme={theme} disabled={disabled} onPress={onSelect} />)}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{search ? t('print_006') : t('print_005')}</Text>
          {!search ? <ResourceEmptyActions theme={theme} primaryLabel={t('mirror_148')} onPrimary={onOpenResources} secondaryLabel={t('print_007')} onSecondary={onDetect} disabled={disabled} /> : null}
        </View>
      )}
      {selected ? (
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.primary}>
          <View style={styles.selectedHeader}>
            <View style={styles.selectedCopy}>
              <Text style={[styles.selectedTitle, { color: theme.textPrimary }]}>{selected.displayName || selected.asset?.name}</Text>
              <Text style={[styles.profileMeta, { color: theme.textSecondary }]}>{printProfileConfig(selected)?.manufacturer} {printProfileConfig(selected)?.model}</Text>
            </View>
            <IconTextButton theme={theme} icon="trash-can" variant="ghost" compactIconOnly accessibilityLabel={t('print_008')} disabled={disabled} onPress={onRemove} />
          </View>
        </SurfaceCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.sm },
  reel: { gap: tokens.spacing.sm, paddingVertical: tokens.spacing.xxs },
  profileCard: { width: tokens.spacing.xl * 5, borderWidth: tokens.border.thin, borderRadius: tokens.radius.md, padding: tokens.spacing.xs, gap: tokens.spacing.xs },
  profileImage: { width: '100%', aspectRatio: 1 },
  profileFallback: { width: '100%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  profileName: { fontSize: tokens.typography.caption, fontWeight: '700' },
  profileMeta: { fontSize: tokens.typography.caption },
  binding: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.xs },
  bindingText: { flexShrink: 1, fontSize: tokens.typography.caption },
  empty: { gap: tokens.spacing.xs, alignItems: 'flex-start' },
  emptyText: { fontSize: tokens.typography.caption },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  selectedCopy: { flex: 1, minWidth: 0, gap: tokens.spacing.xxs },
  selectedTitle: { fontSize: tokens.typography.body, fontWeight: '700' },
});
