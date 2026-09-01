import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';

export function MirrorToggleRow({ label, value, onChange, theme, disabled = false, detail = '' }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: theme.textSecondary }]}>{detail}</Text> : null}
      </View>
      <Switch value={Boolean(value)} onValueChange={onChange} disabled={disabled} trackColor={{ false: theme.border, true: theme.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.md, paddingVertical: tokens.spacing.xs },
  copy: { flex: 1, gap: tokens.spacing.xxs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  detail: { fontSize: tokens.typography.caption },
});
