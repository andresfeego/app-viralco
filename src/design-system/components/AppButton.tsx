import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { tokens } from '../tokens';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  pressedColor: string;
  textColor: string;
  testID?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function AppButton({
  label,
  onPress,
  backgroundColor,
  pressedColor,
  textColor,
  testID,
  disabled = false,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style,
        { backgroundColor: pressed ? pressedColor : backgroundColor, opacity: disabled ? tokens.opacity.disabled : 1 },
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
