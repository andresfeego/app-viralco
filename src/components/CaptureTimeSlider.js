import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function CaptureTimeSlider({
  label,
  value,
  onChange,
  theme,
  disabled = false,
  minimumValue = 0,
  maximumValue = 20,
  step = 1,
  layout = 'inline',
  testID,
}) {
  const seconds = Math.max(minimumValue, Math.min(maximumValue, Math.round(Number(value) || minimumValue)));
  const valueLabel = `${seconds} ${t('mirror_seconds')}`;
  const slider = (
    <Slider
      style={layout === 'stacked' ? styles.stackedSlider : styles.slider}
      value={seconds}
      minimumValue={minimumValue}
      maximumValue={maximumValue}
      step={step}
      disabled={disabled}
      minimumTrackTintColor={theme.primary}
      maximumTrackTintColor={theme.border}
      thumbTintColor={theme.primary}
      accessibilityLabel={label}
      accessibilityValue={{ min: minimumValue, max: maximumValue, now: seconds, text: valueLabel }}
      onValueChange={(nextValue) => onChange(Math.round(nextValue))}
    />
  );

  if (layout === 'stacked') {
    return (
      <View style={styles.stack} testID={testID}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
        {slider}
        <Text style={[styles.stackedValue, { color: theme.textSecondary }]}>{valueLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row} testID={testID}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.textSecondary }]}>{valueLabel}</Text>
      </View>
      {slider}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.md },
  stack: { width: '100%', gap: tokens.spacing.xs },
  copy: { flex: 1, minWidth: 0, gap: tokens.spacing.xxs },
  label: { fontSize: tokens.typography.caption, fontWeight: '700' },
  value: { fontSize: tokens.typography.caption },
  slider: { flex: 2, minWidth: 0 },
  stackedSlider: { width: '100%' },
  stackedValue: { fontSize: tokens.typography.caption, textAlign: 'center' },
});
