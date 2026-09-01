import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';

export function HorizontalSubMenu({ items, selectedKey, onSelect, theme }) {
  const baseBg = tokens.colors.blue[800];
  const selectedBg = tokens.colors.blue[100];
  const dividerColor = tokens.colors.blue[700];
  const useFixedRow = items.length <= 4;

  const renderItems = () =>
    items.map((item, index) => {
      const active = selectedKey === item.key;
      return (
        <Pressable
          key={item.key}
          testID={`horizontal-submenu-${item.key}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          onPress={() => onSelect(item.key)}
          style={[
            styles.item,
            useFixedRow ? styles.itemFixed : null,
            active ? { backgroundColor: selectedBg } : null,
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: active ? tokens.colors.blue[800] : theme.buttonText },
            ]}
          >
            {item.label}
          </Text>
          {index < items.length - 1 ? <View style={[styles.divider, { backgroundColor: dividerColor }]} /> : null}
        </Pressable>
      );
    });

  if (useFixedRow) {
    return (
      <View style={[styles.wrap, { backgroundColor: baseBg }]}>
        <View style={styles.fixedRow}>{renderItems()}</View>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: baseBg }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {renderItems()}
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
  fixedRow: {
    flexDirection: 'row',
    width: '100%',
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
  itemFixed: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: tokens.spacing.xs,
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
