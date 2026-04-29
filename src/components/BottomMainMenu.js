import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

export function BottomMainMenu({ items, selectedKey, onSelect, theme }) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
      {items.map((item) => {
        const active = item.key === selectedKey;
        const color = active ? theme.secondary : theme.textSecondary;
        return (
          <Pressable key={item.key} style={styles.item} onPress={() => onSelect(item.key)}>
            <Icon name={item.iconName} iconStyle="solid" size={19} color={color} />
            <Text style={[styles.label, { color }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 88,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
  },
  item: {
    minWidth: 68,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
