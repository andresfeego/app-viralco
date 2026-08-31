import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function ResourceSelectionSummary({ item, theme, disabled, onConfirm, onClear }) {
  if (!item) return null;
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.primary}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('resource_014')}</Text>
      <Text style={[styles.name, { color: theme.textSecondary }]}>{item.displayName || item.asset?.name}</Text>
      <View style={styles.actions}>
        <AppButton label={t('resource_017')} onPress={onClear} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.button} />
        <AppButton label={t('resource_021')} onPress={onConfirm} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.button} disabled={disabled} />
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  name: { fontSize: tokens.typography.caption },
  actions: { flexDirection: 'row', gap: tokens.spacing.xs },
  button: { flex: 1, minWidth: 0 },
});
