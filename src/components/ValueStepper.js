import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';

export function ValueStepper({ label, value, onChange, min = 0, max = 100, step = 1, theme, disabled = false, testID }) {
  const update = (amount) => onChange(Math.min(max, Math.max(min, Math.round((Number(value) + amount) * 100) / 100)));
  return (
    <View style={styles.wrap} testID={testID}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.controls}>
        <IconTextButton theme={theme} icon="minus" variant="outline" disabled={disabled || Number(value) <= min} onPress={() => update(-step)} style={styles.button} />
        <Text style={[styles.value, { color: theme.textPrimary }]}>{Math.round(Number(value) * 100) / 100}</Text>
        <IconTextButton theme={theme} icon="plus" variant="outline" disabled={disabled || Number(value) >= max} onPress={() => update(step)} style={styles.button} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: tokens.spacing.xl * 3, gap: tokens.spacing.xxs },
  label: { fontSize: tokens.typography.caption, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  button: { width: tokens.spacing.xl, minHeight: tokens.spacing.xl, paddingHorizontal: tokens.spacing.none, paddingVertical: tokens.spacing.none },
  value: { minWidth: tokens.spacing.xl, textAlign: 'center', fontSize: tokens.typography.caption, fontWeight: '700' },
});
