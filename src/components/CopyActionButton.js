import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

export function CopyActionButton({ theme, disabled = false, copied = false, onPress = () => {} }) {
  return (
    <Pressable
      style={[
        styles.button,
        {
          borderColor: theme.border,
          backgroundColor: theme.background,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Icon name="clipboard" iconStyle="regular" size={14} color={theme.textSecondary} />
      <Text style={[styles.text, { color: theme.textPrimary }]}>{copied ? 'Copiado' : 'Copy'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 44,
    paddingHorizontal: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    fontWeight: '700',
    fontSize: tokens.typography.caption,
  },
});

