import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from '../design-system/components/AppButton';
import { MediaPreview } from '../design-system/components/MediaPreview';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { StatusBadge } from './StatusBadge';
import { resourceOriginalUri, resourceTypeLabel } from './ResourceGalleryTile';

export function ResourcePreviewModal({ item, theme, canManage, onClose, onToggleFavorite }) {
  const insets = useSafeAreaInsets();
  const asset = item?.asset || {};
  const name = item?.displayName || asset.name || t('resource_018');
  const uri = resourceOriginalUri(item);
  const isVideo = String(asset.mimeType || '').startsWith('video/');
  return (
    <Modal visible={Boolean(item)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + tokens.spacing.md }]}>
          <Text numberOfLines={1} style={[styles.title, { color: theme.textPrimary }]}>{name}</Text>
          <AppButton label={t('resource_048')} onPress={onClose} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.closeButton} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            {uri ? (
              <MediaPreview uri={uri} mediaType={asset.mimeType || ''} borderColor={theme.border} textColor={theme.textSecondary} resizeMode="contain" aspectRatio={isVideo ? 16 / 9 : 1} />
            ) : (
              <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_041')}: {asset.mimeType || asset.type}</Text>
            )}
            <View style={styles.metaRow}>
              <StatusBadge compact label={resourceTypeLabel(asset.type)} flag="info" />
              <Text style={[styles.meta, { color: theme.textSecondary }]}>{asset.ownerType === 'viralco' ? t('resource_019') : t('resource_020')}</Text>
            </View>
          </SurfaceCard>
          <AppButton
            label={item?.isFavorite ? t('resource_047') : t('resource_046')}
            onPress={() => onToggleFavorite(item)}
            disabled={!canManage}
            backgroundColor={theme.buttonBg}
            pressedColor={theme.buttonBgPressed}
            textColor={theme.buttonText}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md, paddingBottom: tokens.spacing.md, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: tokens.typography.body, fontWeight: '700' },
  closeButton: { minWidth: tokens.spacing.xl * 3 },
  content: { padding: tokens.spacing.md, gap: tokens.spacing.md, paddingBottom: tokens.spacing.xl },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  meta: { fontSize: tokens.typography.caption },
  feedback: { fontSize: tokens.typography.caption, textAlign: 'center', padding: tokens.spacing.md },
});
