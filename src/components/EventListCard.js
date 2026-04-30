import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { StatusBadge } from './StatusBadge';
import { tokens } from '../design-system/tokens';

export function EventListCard({ item, selected, theme, onPress, dateLabel = 'Fecha' }) {
  const statusKey = String(item?.status || 'draft').toLowerCase();
  const statusLabel = statusKey === 'active' ? 'Activo' : statusKey === 'archived' ? 'Archivado' : 'Borrador';
  const statusFlag = statusKey === 'active' ? 'success' : statusKey === 'archived' ? 'info' : 'warn';

  return (
    <Pressable onPress={onPress} style={styles.gridItem}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={selected ? theme.primary : theme.border}>
        <View style={styles.cardContainer}>
          <View style={styles.badgeCorner}>
            <StatusBadge label={statusLabel} flag={statusFlag} compact />
          </View>
          <View style={styles.rowWrap}>
          <View style={[styles.previewFrame, { borderColor: theme.border, backgroundColor: theme.surfaceSoft || '#E5E7EB' }]}>
            <Icon name="image" iconStyle="regular" size={28} color={theme.textSecondary} />
          </View>

          <View style={styles.contentCol}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cardTitle, { color: theme.textPrimary }]}>
                {item?.name || '-'}
            </Text>
            <Text numberOfLines={1} style={[styles.cardMetaValue, { color: theme.textSecondary }]}>
              {item?.eventDate || '-'}
            </Text>
          </View>
          <View style={styles.arrowWrap}>
            <Icon name="angle-right" iconStyle="solid" size={18} color={theme.textSecondary} />
          </View>
          </View>
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridItem: {
    width: '100%',
  },
  cardContainer: {
    minHeight: 112,
    justifyContent: 'center',
    position: 'relative',
  },
  badgeCorner: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 2,
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginTop: 12,
  },
  previewFrame: {
    width: 68,
    height: 68,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  arrowWrap: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  cardTitle: {
    width: '90%',
    fontSize: tokens.typography.body,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -5,
    marginLeft: 6,
  },
  cardMetaValue: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
});
