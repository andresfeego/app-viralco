import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { StatusBadge } from './StatusBadge';
import { tokens } from '../design-system/tokens';

export function EventListCard({ item, selected, theme, onPress, dateLabel = 'Fecha', logoImageUrl = '' }) {
  const [failedLogo, setFailedLogo] = useState(null);
  const logoKey = `${item?.id}:${logoImageUrl}`;
  const statusKey = String(item?.status || 'draft').toLowerCase();
  const statusLabel = statusKey === 'active' ? 'Activo' : statusKey === 'archived' ? 'Archivado' : 'Borrador';
  const statusFlag = statusKey === 'active' ? 'success' : statusKey === 'archived' ? 'info' : 'warn';

  return (
    <Pressable onPress={onPress} style={styles.gridItem}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={selected ? theme.primary : theme.border}>
          <View style={styles.rowWrap}>
          <View style={[styles.previewFrame, { borderColor: theme.border, backgroundColor: theme.surfaceSoft || theme.surface }]}>
            {logoImageUrl && failedLogo !== logoKey ? (
              <Image key={logoKey} testID="event-list-logo" source={{ uri: logoImageUrl }} resizeMode="contain" style={styles.logoImage} onError={() => setFailedLogo(logoKey)} />
            ) : <Icon name="image" iconStyle="regular" size={tokens.spacing.lg} color={theme.textSecondary} />}
          </View>

          <View style={styles.contentCol}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cardTitle, { color: theme.textPrimary }]}>
                {item?.name || '-'}
            </Text>
            <Text numberOfLines={1} style={[styles.cardMetaValue, { color: theme.textSecondary }]}>
              {item?.eventDate || '-'}
            </Text>
            <StatusBadge label={statusLabel} flag={statusFlag} compact dense />
          </View>
          <View style={styles.arrowWrap}>
            <Icon name="angle-right" iconStyle="solid" size={tokens.typography.body} color={theme.textSecondary} />
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
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  previewFrame: {
    width: tokens.spacing.xl * 2,
    aspectRatio: 1,
    borderRadius: tokens.radius.sm,
    borderWidth: tokens.border.thin,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  contentCol: {
    flex: 1,
    minWidth: 0,
    gap: tokens.spacing.xxs,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  arrowWrap: {
    width: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  cardTitle: {
    width: '100%',
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  cardMetaValue: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    textAlignVertical: 'center',
  },
});
