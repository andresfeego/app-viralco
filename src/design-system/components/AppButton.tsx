import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { tokens } from '../tokens';

interface AppButtonGradient {
  colors: readonly (string | number)[];
  angle?: number;
  angleCenter?: { readonly x: number; readonly y: number };
  start: { readonly x: number; readonly y: number };
  end: { readonly x: number; readonly y: number };
}

interface AppButtonProps {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  pressedColor: string;
  textColor: string;
  testID?: string;
  disabled?: boolean;
  gradient?: AppButtonGradient;
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
  gradient,
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
        {
          backgroundColor: pressed ? pressedColor : backgroundColor,
          opacity: disabled ? tokens.opacity.disabled : 1,
        },
      ]}
    >
      {({ pressed }) => (
        <>
          {gradient ? (
            <LinearGradient
              pointerEvents="none"
              colors={
                pressed ? [pressedColor, pressedColor] : [...gradient.colors]
              }
              useAngle={typeof gradient.angle === 'number'}
              angle={gradient.angle}
              angleCenter={gradient.angleCenter}
              start={gradient.start}
              end={gradient.end}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  label: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
});
