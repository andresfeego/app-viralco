import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';

export function HorizontalSubMenu({ items, selectedKey, onSelect, theme }) {
  const baseBg = tokens.colors.blue[800];
  const selectedBg = tokens.colors.blue[100];
  const dividerColor = tokens.colors.blue[700];

  return (
    <View style={[styles.wrap, { backgroundColor: baseBg }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((item, index) => {
          const active = selectedKey === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onSelect(item.key)}
              style={[styles.item, active ? { backgroundColor: selectedBg } : null]}
            >
              <Text style={[styles.label, { color: active ? tokens.colors.blue[800] : theme.buttonText }]}>
                {item.label}
              </Text>
              {index < items.length - 1 ? <View style={[styles.divider, { backgroundColor: dividerColor }]} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 0,
  },
  scroll: {
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  item: {
    minHeight: 42,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 0,
    borderRadius: 0,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  divider: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 1,
  },
});
