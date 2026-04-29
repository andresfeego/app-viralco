import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';

const VARIANT_STYLES = {
  info: {
    backgroundColor: tokens.colors.info[100],
    borderColor: tokens.colors.info[300],
    textColor: tokens.colors.info[600],
  },
  warn: {
    backgroundColor: tokens.colors.warn[100],
    borderColor: tokens.colors.warn[300],
    textColor: tokens.colors.warn[600],
  },
  error: {
    backgroundColor: tokens.colors.error[100],
    borderColor: tokens.colors.error[300],
    textColor: tokens.colors.error[600],
  },
  success: {
    backgroundColor: tokens.colors.success[100],
    borderColor: tokens.colors.success[300],
    textColor: tokens.colors.success[600],
  },
};

export function StatusBadge({ label, flag = 'info' }) {
  const variant = VARIANT_STYLES[flag] || VARIANT_STYLES.info;

  return (
    <View style={[styles.badge, { backgroundColor: variant.backgroundColor, borderColor: variant.borderColor }]}>
      <Text style={[styles.label, { color: variant.textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xxs,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
