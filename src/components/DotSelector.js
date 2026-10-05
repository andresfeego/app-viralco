import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '../design-system/tokens';

export function DotSelector({ items, selectedKey, onSelect, theme, disabled = false, testID }) {
  return <View testID={testID} style={styles.row}>
    {items.map((item) => <Pressable key={item.key} testID={item.testID} accessibilityRole="button"
      accessibilityLabel={item.label} accessibilityState={{ selected: item.key === selectedKey, disabled }}
      disabled={disabled} onPress={() => onSelect(item.key)} style={styles.target}>
      <View style={[styles.dot, disabled && styles.disabled, { backgroundColor: item.key === selectedKey ? theme.primary : theme.textSecondary }]} />
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: tokens.spacing.none },
  target: { width: tokens.spacing.xl + tokens.spacing.md, height: tokens.spacing.xl + tokens.spacing.md, alignItems: 'center', justifyContent: 'center' },
  dot: { width: tokens.spacing.xs, height: tokens.spacing.xs, borderRadius: tokens.radius.pill },
  disabled: { opacity: tokens.opacity.disabled },
});
