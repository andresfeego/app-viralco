import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';

export function TextLayerList({ label, emptyLabel, layers = [], selectedIds = [], theme, disabled = false, onSelect, onRemove }) {
  return (
    <View style={styles.stack}>
      {label ? <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text> : null}
      {layers.length ? (
        <View>
          {layers.map((layer, index) => {
            const selected = selectedIds.includes(String(layer.id));
            return (
              <Pressable
                key={layer.id}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onSelect?.(String(layer.id))}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected ? theme.background : theme.surface,
                    borderTopColor: theme.border,
                    borderBottomColor: theme.border,
                    borderTopWidth: index === 0 ? tokens.border.thin : tokens.spacing.none,
                  },
                ]}
              >
                <Text numberOfLines={2} style={[styles.text, { color: theme.textPrimary }]}>{layer.text || '-'}</Text>
                <IconTextButton
                  theme={theme}
                  icon="trash-can"
                  variant="ghost"
                  denseIconOnly
                  accessibilityLabel={`${label}: ${layer.text || '-'}`}
                  disabled={disabled}
                  onPress={() => onRemove?.(String(layer.id))}
                />
              </Pressable>
            );
          })}
        </View>
      ) : <Text style={[styles.empty, { color: theme.textSecondary }]}>{emptyLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: '100%', gap: tokens.spacing.xs },
  label: { fontSize: tokens.typography.body, fontWeight: '700' },
  row: {
    width: '100%',
    minWidth: tokens.spacing.none,
    minHeight: tokens.spacing.xl + tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
    borderBottomWidth: tokens.border.thin,
  },
  text: { flex: 1, minWidth: tokens.spacing.none, fontSize: tokens.typography.body, fontWeight: '600' },
  empty: { fontSize: tokens.typography.caption },
});
