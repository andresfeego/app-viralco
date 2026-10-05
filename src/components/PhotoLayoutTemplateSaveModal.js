import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { FormModal } from './FormModal';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { MirrorConfigPreview } from './MirrorConfigPreview';
import { PaperFormInput } from './PaperFormInput';

export function PhotoLayoutTemplateSaveModal({ visible, config, theme, name, onNameChange, saving, error, onCancel, onSave }) {
  return (
    <FormModal visible={visible} theme={theme} title={t('mirror_122')} onClose={onCancel} testID="photo-layout-template-save" safeAreaTestID="photo-layout-template-save-modal" actions={<>
      <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={t('common_cancel')} onPress={onCancel} disabled={saving} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
      <AppButton label={t('mirror_124')} onPress={onSave} disabled={saving || !name.trim()} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
    </>}>
          <MirrorConfigPreview config={config} theme={theme} showMeta={false} compact />
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <PaperFormInput theme={theme} label={t('mirror_123')} value={name} onChangeText={onNameChange} errorText={error} autoCapitalize="sentences" />
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{config.layout.shotCount} {t('mirror_027')} · {config.layout.output.width} × {config.layout.output.height}</Text>
          </SurfaceCard>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  meta: { fontSize: tokens.typography.caption },


});
