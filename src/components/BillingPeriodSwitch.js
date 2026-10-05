import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Switch } from 'react-native-paper';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function BillingPeriodSwitch({ theme, durationDays, onChange, disabled = false }) {
  return <View style={styles.row}>
    <Text style={[styles.label, { color: durationDays === 30 ? theme.primary : theme.textSecondary }]}>{t('billing_monthly')}</Text>
    <Switch testID="billing-period-switch" accessibilityLabel={t('billing_annual')} color={theme.primary} value={durationDays === 365} disabled={disabled} onValueChange={annual => onChange(annual ? 365 : 30)} />
    <Text style={[styles.label, { color: durationDays === 365 ? theme.primary : theme.textSecondary }]}>{t('billing_annual')}</Text>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.spacing.xs },
  label: { fontSize: tokens.typography.caption, fontWeight: '700', flexShrink: 1, minWidth: 0 },
});
