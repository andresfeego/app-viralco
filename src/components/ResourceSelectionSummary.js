import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { ButtonRow } from '../design-system/components/ButtonRow';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function ResourceSelectionSummary({ item, theme, disabled, onConfirm, onClear, confirmLabel = t('resource_021') }) {
  if (!item) return null;
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.primary}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('resource_014')}</Text>
      <Text style={[styles.name, { color: theme.textSecondary }]}>{item.displayName || item.asset?.name}</Text>
      <ButtonRow>
        <AppButton variant="outlined" borderColor={theme.textSecondary} label={t('resource_017')} onPress={onClear} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
        <AppButton label={confirmLabel} onPress={onConfirm} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} disabled={disabled} />
      </ButtonRow>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  name: { fontSize: tokens.typography.caption },


});
