import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { HorizontalReel } from './HorizontalReel';
import { tokens } from '../design-system/tokens';

// Reduce the nominal filter height by 5% through padding, not text scaling.
const outlinedHeightReduction = tokens.spacing.xl * 0.05;

export function SelectableChipGroup({
  theme,
  label,
  options = [],
  value = '',
  values = [],
  multiple = false,
  onChange = () => {},
  errorText = '',
  disabled = false,
  backgroundColor = theme.background,
  labelVariant = 'caption',
  variant = 'filled',
  testID,
}) {
  const outlined = variant === 'outlined';
  const chipItems = options.map((option) => {
    const isSelected = multiple ? values.map(String).includes(String(option.value)) : String(option.value) === String(value);
    const isDisabled = disabled || option.disabled;
    const chipTestID = testID ? `${testID}-${option.value}` : undefined;

    return (
      <Pressable
        key={option.value}
        testID={chipTestID}
        accessibilityRole="button"
        accessibilityLabel={option.label}
        accessibilityState={{ selected: isSelected, disabled: isDisabled }}
        disabled={isDisabled}
        onPress={() => {
          if (!multiple) {
            onChange(option.value);
            return;
          }
          const currentValues = values.map(String);
          const optionValue = String(option.value);
          onChange(isSelected ? currentValues.filter((item) => item !== optionValue) : [...currentValues, optionValue]);
        }}
        style={({ pressed }) => [
          styles.chip,
          outlined ? styles.outlinedChip : null,
          {
            backgroundColor: isSelected && !outlined ? theme.primary : pressed ? theme.background : theme.surface,
            borderColor: errorText ? theme.alert : isSelected ? theme.primary : theme.border,
          },
        ]}
      >
        <Text numberOfLines={1} style={[styles.chipText, outlined ? styles.outlinedText : null, { color: isSelected && !outlined ? theme.buttonText : theme.textPrimary }]}>{option.label}</Text>
        {outlined && isSelected ? <Icon name="check" iconStyle="solid" size={tokens.typography.caption} color={theme.primary} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /> : null}
      </Pressable>
    );
  });

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, labelVariant === 'heading' && styles.headingLabel, { color: labelVariant === 'heading' ? theme.textPrimary : theme.textSecondary }]}>{label}</Text> : null}
      <HorizontalReel testID={testID} backgroundColor={backgroundColor}>{chipItems}</HorizontalReel>
      {errorText ? <Text style={[styles.feedback, { color: theme.alert }]}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.spacing.xs,
    minWidth: tokens.spacing.none,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  headingLabel: {
    fontSize: tokens.typography.heading,
  },
  chip: {
    flexShrink: 0,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
    minHeight: tokens.spacing.xl,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  outlinedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    minWidth: tokens.spacing.none,
    minHeight: tokens.spacing.xl - outlinedHeightReduction,
    paddingVertical: tokens.spacing.xs - outlinedHeightReduction / 2,
  },
  outlinedText: {
    flexShrink: 1,
  },
  feedback: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
});
