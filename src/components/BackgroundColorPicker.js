import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { ColorPickerModal, ColorPickerTrigger } from './ColorPickerModal';

function ColorSwatch({ color, selected, theme, disabled, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={`${t('mirror_background_color')} ${color}`}
      disabled={disabled}
      onPress={() => onPress(color)}
      style={[styles.swatchOuter, { borderColor: selected ? theme.primary : theme.border }]}
    >
      <View style={[styles.swatch, { backgroundColor: color }]} />
    </Pressable>
  );
}

export function BackgroundColorPicker({ theme, selectedColors = [], disabled = false, onSelect }) {
  const [customVisible, setCustomVisible] = useState(false);
  const selected = new Set(selectedColors.map((color) => String(color).toUpperCase()));
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textPrimary }]}>{t('mirror_background_colors')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {tokens.colors.backgroundPalette.map((color) => <ColorSwatch key={color} color={color} selected={selected.has(color)} theme={theme} disabled={disabled} onPress={onSelect} />)}
        <View style={styles.custom}><ColorPickerTrigger theme={theme} disabled={disabled} accessibilityLabel={t('mirror_background_custom')} onPress={() => setCustomVisible(true)} /></View>
      </ScrollView>
      <ColorPickerModal visible={customVisible} initialColor={tokens.colors.backgroundPalette[0]} theme={theme} onClose={() => setCustomVisible(false)} onSelect={onSelect} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.xs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  row: { gap: tokens.spacing.sm, paddingVertical: tokens.spacing.xxs },
  swatchOuter: { width: tokens.spacing.xl * 2, height: tokens.spacing.xl * 2, padding: tokens.spacing.xxs, borderWidth: tokens.border.medium, borderRadius: tokens.radius.md },
  swatch: { width: '100%', height: '100%', borderRadius: tokens.radius.sm },
  custom: { width: tokens.spacing.xl * 2, height: tokens.spacing.xl * 2, alignItems: 'center', justifyContent: 'center' },
});
