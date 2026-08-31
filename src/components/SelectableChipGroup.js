import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';

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
  testID,
}) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = multiple ? values.map(String).includes(String(option.value)) : String(option.value) === String(value);
          const isDisabled = disabled || option.disabled;
          const chipTestID = testID ? `${testID}-${option.value}` : undefined;

          return (
            <Pressable
              key={option.value}
              testID={chipTestID}
              accessibilityRole="button"
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
                {
                  backgroundColor: isSelected ? theme.primary : pressed ? theme.background : theme.surface,
                  borderColor: errorText ? theme.alert : isSelected ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? theme.buttonText : theme.textPrimary }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {errorText ? <Text style={[styles.feedback, { color: theme.alert }]}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  chip: {
    borderWidth: 1,
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
  feedback: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
});
