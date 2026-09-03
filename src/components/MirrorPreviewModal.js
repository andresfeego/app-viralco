import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { formatDefinition } from '../domain/magicMirrorConfig';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { MirrorConfigPreview } from './MirrorConfigPreview';

function DetailRow({ label, value, theme }) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

export function MirrorPreviewModal({ visible, config, theme, resourcesById = {}, onClose }) {
  const insets = useSafeAreaInsets();
  const format = formatDefinition(config.layout.format);
  const output = config.layout.output;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['left', 'right', 'bottom']} testID="mirror-preview-modal" accessibilityViewIsModal style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View testID="mirror-preview-header" style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + tokens.spacing.xl }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_030')}</Text>
          <IconTextButton
            testID="mirror-preview-close"
            theme={theme}
            icon="xmark"
            variant="outlined"
            accessibilityLabel={t('resource_048')}
            onPress={onClose}
          />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <MirrorConfigPreview config={config} theme={theme} resourcesById={resourcesById} showMeta={false} />
            <View style={styles.details}>
              <DetailRow label={t('mirror_031')} value={t(format.labelKey)} theme={theme} />
              <DetailRow label={t('mirror_119')} value={`${output.width} × ${output.height} px`} theme={theme} />
              <DetailRow label={t('mirror_120')} value={String(config.layout.shotCount)} theme={theme} />
            </View>
          </SurfaceCard>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingBottom: tokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: tokens.typography.heading, fontWeight: '700' },
  content: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  details: { marginTop: tokens.spacing.sm },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { flex: 1, fontSize: tokens.typography.caption },
  detailValue: { flex: 1, fontSize: tokens.typography.body, fontWeight: '700', textAlign: 'right' },
});
