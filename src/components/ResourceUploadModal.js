import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { SelectableChipGroup } from './SelectableChipGroup';

const PURPOSE_OPTIONS = [
  { value: 'background', labelKey: 'resource_012' },
  { value: 'frame', labelKey: 'resource_008' },
  { value: 'sticker', labelKey: 'resource_053' },
  { value: 'animation', labelKey: 'resource_009' },
  { value: 'font', labelKey: 'resource_011' },
  { value: 'print_profile', labelKey: 'print_001' },
];

export function ResourceUploadModal({ visible, theme, purpose, fixedPurpose = false, progress = 0, disabled = false, onPurposeChange, onUpload, onClose }) {
  const options = fixedPurpose
    ? PURPOSE_OPTIONS.filter((option) => option.value === purpose)
    : PURPOSE_OPTIONS;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <ModalSafeArea style={styles.overlay} testID="resource-upload-modal">
        <View style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('resource_058')}</Text>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            {!fixedPurpose ? <SelectableChipGroup theme={theme} label={t('resource_013')} options={options.map((option) => ({ value: option.value, label: t(option.labelKey) }))} value={purpose} onChange={onPurposeChange} disabled={disabled} /> : null}
            {fixedPurpose ? <Text style={[styles.purpose, { color: theme.textSecondary }]}>{t(options[0]?.labelKey || 'resource_018')}</Text> : null}
            {progress ? <Text style={[styles.progress, { color: theme.textSecondary }]}>{t('resource_042')} {progress}%</Text> : null}
            <View style={styles.actions}>
              <AppButton label={t('account_028')} onPress={onClose} disabled={disabled} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.action} />
              <AppButton label={purpose === 'print_profile' ? t('print_007') : t('resource_059')} onPress={() => onUpload(purpose)} disabled={disabled || !purpose} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.action} />
            </View>
          </SurfaceCard>
        </View>
      </ModalSafeArea>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { justifyContent: 'flex-end' },
  sheet: { borderTopWidth: tokens.border.thin, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg, padding: tokens.spacing.md, gap: tokens.spacing.md },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  purpose: { fontSize: tokens.typography.body, fontWeight: '700' },
  progress: { fontSize: tokens.typography.caption, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  action: { flex: 1, minWidth: tokens.spacing.xl * 4 },
});
