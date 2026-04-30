import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';

const DEFAULT_ACTIONS = [
  { key: 'download', label: 'Descargar', icon: 'download' },
  { key: 'upload', label: 'Subir', icon: 'upload' },
  { key: 'embed', label: 'Embed', icon: 'code' },
  { key: 'analytics', label: 'Analiticas', icon: 'chart-column' },
  { key: 'slideshow', label: 'Presentacion', icon: 'image' },
  { key: 'shares', label: 'Compartidos', icon: 'share-nodes' },
  { key: 'delete', label: 'Eliminar', icon: 'trash' },
];

export function EventQuickActions({ theme, actions = DEFAULT_ACTIONS, onAction = () => {} }) {
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable key={action.key} style={styles.item} onPress={() => onAction(action.key)}>
            <Icon
              name={action.icon}
              iconStyle="solid"
              size={20}
              color={action.key === 'delete' ? theme.alert : theme.textPrimary}
            />
            <Text
              numberOfLines={1}
              style={[styles.label, { color: action.key === 'delete' ? theme.alert : theme.textPrimary }]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.bottomLine, { backgroundColor: theme.border }]} />
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: tokens.spacing.md,
    columnGap: tokens.spacing.xs,
  },
  item: {
    width: '23%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    minHeight: 62,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomLine: {
    marginTop: tokens.spacing.sm,
    height: 1,
    width: '100%',
  },
});
