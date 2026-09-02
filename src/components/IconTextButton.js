import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';

export function IconTextButton({
  theme,
  label = '',
  icon = 'arrow-right',
  iconStyle = 'solid',
  direction = 'row',
  order = 'icon-first',
  variant = 'filled',
  disabled = false,
  onPress = () => {},
  accessibilityLabel,
  backgroundColor: customBackgroundColor,
  pressedBackgroundColor,
  iconColor,
  testID,
  style,
}) {
  const isTextFirst = order === 'text-first';
  const isIconOnly = !label;
  const isGhost = variant === 'ghost';
  const backgroundColor = customBackgroundColor ?? (variant === 'filled' ? theme.buttonBg : theme.surface);
  const pressedColor = pressedBackgroundColor ?? (variant === 'filled' ? theme.buttonBgPressed : theme.background);
  const borderColor = variant === 'filled' ? theme.buttonBg : theme.border;
  const contentColor = iconColor ?? (variant === 'filled' ? theme.buttonText : isGhost ? theme.primary : theme.textPrimary);

  const iconNode = <Icon name={icon} iconStyle={iconStyle} size={tokens.typography.caption} color={contentColor} />;
  const textNode = label ? <Text style={[styles.label, { color: contentColor }]}>{label}</Text> : null;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label || undefined}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isGhost ? styles.ghost : null,
        isIconOnly ? styles.iconOnly : null,
        direction === 'column' ? styles.column : styles.row,
        style,
        {
          backgroundColor: isGhost && customBackgroundColor == null ? undefined : pressed ? pressedColor : backgroundColor,
          borderColor: isGhost ? undefined : borderColor,
          opacity: disabled ? tokens.opacity.disabled : 1,
        },
      ]}
    >
      {isTextFirst ? textNode : iconNode}
      {isTextFirst ? iconNode : textNode}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    minHeight: tokens.spacing.xl + tokens.spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  iconOnly: {
    width: tokens.spacing.xl + tokens.spacing.xs,
    height: tokens.spacing.xl + tokens.spacing.xs,
    minHeight: tokens.spacing.xl + tokens.spacing.xs,
    borderRadius: tokens.radius.pill,
    paddingVertical: 0,
    paddingHorizontal: tokens.spacing.xs,
  },
  ghost: {
    borderWidth: 0,
    borderRadius: 0,
    minHeight: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
});
