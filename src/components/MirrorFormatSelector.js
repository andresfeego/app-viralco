import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { MIRROR_FORMATS } from '../domain/magicMirrorConfig';
import { t } from '../i18n';

export function MirrorFormatSelector({ value, onChange, theme, disabled = false }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {MIRROR_FORMATS.map((format) => {
        const selected = value === format.id;
        return (
          <Pressable
            key={format.id}
            testID={`mirror-format-${format.id}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(format.id)}
            style={[styles.card, disabled ? styles.disabled : null, { backgroundColor: selected ? tokens.colors.blue[100] : theme.surface, borderColor: selected ? theme.primary : theme.border }]}
          >
            <View style={[styles.miniCanvas, { borderColor: selected ? theme.primary : theme.border, aspectRatio: format.width / format.height }]}>
              {format.slots.map((slot) => <View key={slot.photoNumber} style={[styles.miniSlot, { borderColor: selected ? theme.primary : theme.textSecondary, left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }]} />)}
            </View>
            <Text style={[styles.title, { color: selected ? tokens.colors.blue[800] : theme.textPrimary }]}>{t(format.labelKey)}</Text>
            <Text style={[styles.meta, { color: selected ? tokens.colors.blue[700] : theme.textSecondary }]}>{format.width} × {format.height} · {format.shots}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: tokens.spacing.sm, paddingVertical: tokens.spacing.xxs },
  card: { width: tokens.spacing.xl * 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.md, padding: tokens.spacing.sm, gap: tokens.spacing.xs },
  miniCanvas: { width: '100%', maxHeight: tokens.spacing.xl * 2, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.sm, position: 'relative', overflow: 'hidden' },
  miniSlot: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.sm },
  title: { fontSize: tokens.typography.caption, fontWeight: '700' },
  meta: { fontSize: tokens.typography.caption },
  disabled: { opacity: tokens.opacity.disabled },
});
