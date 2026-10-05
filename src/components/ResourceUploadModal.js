import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { FormModal } from './FormModal';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { SelectableChipGroup } from './SelectableChipGroup';
import { ResourceSourceButton } from './ResourceSourceButton';
import { ToastViewport } from '../providers/ToastProvider';

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
    <FormModal portalHost visible={visible} theme={theme} title={t('resource_058')} onClose={onClose} testID="resource-upload" safeAreaTestID="resource-upload-modal" overlay={<ToastViewport theme={theme} />} actions={<>
      <AppButton variant="outlined" borderColor={theme.textSecondary} label={t('account_028')} onPress={onClose} disabled={disabled} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
      <ResourceSourceButton buttonRowItem theme={theme} purpose={purpose} active={visible} onSelect={onUpload} disabled={disabled} />
    </>}>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <View testID="resource-upload-content" style={styles.content}>
                {!fixedPurpose ? <SelectableChipGroup testID="resource-upload-purpose" theme={theme} backgroundColor={theme.surface} variant="outlined" label={t('resource_013')} options={options.map((option) => ({ value: option.value, label: t(option.labelKey) }))} value={purpose} onChange={onPurposeChange} disabled={disabled} /> : null}
                {fixedPurpose ? <Text style={[styles.purpose, { color: theme.textSecondary }]}>{t(options[0]?.labelKey || 'resource_018')}</Text> : null}
                {progress ? <Text style={[styles.progress, { color: theme.textSecondary }]}>{t('resource_042')} {progress}%</Text> : null}
              </View>
          </SurfaceCard>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  content: { gap: tokens.spacing.xs, minWidth: tokens.spacing.none },
  purpose: { fontSize: tokens.typography.body, fontWeight: '700' },
  progress: { fontSize: tokens.typography.caption, fontWeight: '700' },


});
