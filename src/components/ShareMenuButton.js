import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

const DEFAULT_OPTIONS = [
  { key: 'email', label: 'Email', icon: 'envelope', iconStyle: 'regular' },
  { key: 'whatsapp', label: 'WhatsApp', icon: 'comment', iconStyle: 'solid' },
  { key: 'x', label: 'X (Twitter)', icon: 'at', iconStyle: 'solid' },
  { key: 'facebook', label: 'Facebook', icon: 'share-nodes', iconStyle: 'solid' },
];

export function ShareMenuButton({
  theme,
  disabled = false,
  isOpen = false,
  onToggle = () => {},
  onRequestClose = () => {},
  onSelect = () => {},
  options = DEFAULT_OPTIONS,
}) {
  return (
    <View style={styles.wrap}>
      {isOpen ? <Pressable style={styles.backdrop} onPress={onRequestClose} /> : null}
      <Pressable
        style={[
          styles.button,
          {
            borderColor: theme.border,
            backgroundColor: theme.background,
            opacity: disabled ? 0.65 : 1,
          },
        ]}
        onPress={onToggle}
        disabled={disabled}
      >
        <Icon name="share-nodes" iconStyle="solid" size={16} color={theme.textSecondary} />
      </Pressable>

      {isOpen ? (
        <View style={[styles.dropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {options.map((option) => (
            <Pressable key={option.key} style={styles.item} onPress={() => onSelect(option.key)}>
              <Icon
                name={option.icon}
                iconStyle={option.iconStyle || 'solid'}
                size={14}
                color={theme.textPrimary}
              />
              <Text style={[styles.itemText, { color: theme.textPrimary }]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  backdrop: {
    position: 'absolute',
    top: -2400,
    right: -2400,
    bottom: -2400,
    left: -2400,
    zIndex: 8,
  },
  button: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minWidth: 162,
    paddingVertical: 4,
    zIndex: 10,
  },
  item: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: tokens.spacing.sm,
  },
  itemText: {
    fontSize: tokens.typography.body,
    fontWeight: '500',
  },
});
