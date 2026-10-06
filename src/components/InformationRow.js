import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

export function InformationRow({ theme, icon, label, value, last = false, children = null, action = null }) {
  return <View style={[styles.row, last ? null : { borderBottomColor: theme.border, borderBottomWidth: tokens.border.thin }]}>
    <View style={[styles.iconFrame, { backgroundColor: theme.background }]}>
      <Icon name={icon} iconStyle="solid" size={tokens.typography.caption} color={theme.primary} />
    </View>
    <View style={styles.valueStack}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      {children || <Text selectable style={[styles.value, { color: theme.textPrimary }]}>{value || '-'}</Text>}
    </View>
    {action}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, paddingVertical: tokens.spacing.sm },
  iconFrame: { width: tokens.spacing.xl, height: tokens.spacing.xl, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  valueStack: { flex: 1, minWidth: tokens.spacing.none, gap: tokens.spacing.xxs },
  label: { fontSize: tokens.typography.caption, fontWeight: '600' },
  value: { fontSize: tokens.typography.body, fontWeight: '700' },
});
