import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { tokens } from '../tokens';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  pressedColor: string;
  textColor: string;
}

export function AppButton({ label, onPress, backgroundColor, pressedColor, textColor }: AppButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? pressedColor : backgroundColor },
      ]}
    >
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  label: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
});
