import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { SelectableChipGroup } from './SelectableChipGroup';

export function ResourceUploadAction({ theme, purpose, onPurposeChange, disabled, onUpload }) {
  const purposes = [
    { label: t('resource_007'), value: 'template' },
    { label: t('resource_008'), value: 'frame' },
    { label: t('resource_009'), value: 'animation' },
    { label: t('resource_010'), value: 'gif_overlay' },
    { label: t('resource_011'), value: 'font' },
    { label: t('resource_012'), value: 'background' },
    { label: t('resource_044'), value: 'start_screen' },
  ];
  return (
    <View style={styles.wrap}>
      <SelectableChipGroup theme={theme} label={t('resource_013')} options={purposes} value={purpose} onChange={onPurposeChange} disabled={disabled} />
      <AppButton
        label={t('resource_004')}
        onPress={onUpload}
        disabled={disabled}
        backgroundColor={theme.buttonBg}
        pressedColor={theme.buttonBgPressed}
        textColor={theme.buttonText}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.sm },
  button: { width: '100%' },
});
