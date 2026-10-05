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
  locations?: readonly number[];
  start: { readonly x: number; readonly y: number };
  end: { readonly x: number; readonly y: number };
}

interface AppButtonProps {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  pressedColor: string;
  textColor: string;
  variant?: 'filled' | 'outlined';
  borderColor?: string;
  singleLine?: boolean;
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
  variant = 'filled',
  borderColor = textColor,
  singleLine = false,
  testID,
  disabled = false,
  gradient,
  style,
}: AppButtonProps) {
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'outlined' ? styles.outlined : null,
        style,
        {
          backgroundColor: pressed ? pressedColor : backgroundColor,
          borderColor: variant === 'outlined' ? borderColor : undefined,
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
              locations={gradient.locations ? [...gradient.locations] : undefined}
              start={gradient.start}
              end={gradient.end}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
          <Text numberOfLines={singleLine ? 1 : undefined} style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: tokens.spacing.xl * 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: tokens.radius.pill,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
  },
  outlined: {
    borderWidth: tokens.border.thin,
  },
  label: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
});
