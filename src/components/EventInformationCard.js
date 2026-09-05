import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';
import { StatusBadge } from './StatusBadge';

function InformationRow({ theme, icon, label, value, last = false, children = null }) {
  return (
    <View style={[styles.informationRow, last ? null : { borderBottomColor: theme.border, borderBottomWidth: tokens.border.thin }]}>
      <View style={[styles.iconFrame, { backgroundColor: theme.background }]}>
        <Icon name={icon} iconStyle="solid" size={tokens.typography.caption} color={theme.primary} />
      </View>
      <View style={styles.valueStack}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        {children || <Text selectable style={[styles.value, { color: theme.textPrimary }]}>{value || '-'}</Text>}
      </View>
    </View>
  );
}

export function EventInformationCard({
  theme,
  event,
  title,
  labels,
  statusLabel,
  statusFlag = 'warn',
  canEdit = false,
  onEdit = null,
}) {
  const rows = [
    { key: 'type', icon: 'shapes', label: labels.type, value: event?.eventType?.name },
    { key: 'date', icon: 'calendar-day', label: labels.date, value: event?.eventDate },
    { key: 'status', icon: 'circle-check', label: labels.status, status: true },
    { key: 'timezone', icon: 'clock', label: labels.timezone, value: event?.timezone },
    { key: 'slug', icon: 'fingerprint', label: labels.identifier, value: event?.slug },
    ...(event?.description ? [{ key: 'description', icon: 'align-left', label: labels.description, value: event.description }] : []),
  ];

  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <View style={styles.headerCluster}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        {canEdit ? (
          <IconTextButton
            theme={theme}
            icon="pencil"
            variant="outline"
            onPress={onEdit}
            testID="event-details-edit"
            accessibilityLabel={labels.edit}
          />
        ) : null}
      </View>
      <View style={styles.informationStack}>
        {rows.map((row, index) => (
          <InformationRow
            key={row.key}
            theme={theme}
            icon={row.icon}
            label={row.label}
            value={row.value}
            last={index === rows.length - 1}
          >
            {row.status ? <StatusBadge label={statusLabel} flag={statusFlag} compact /> : null}
          </InformationRow>
        ))}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  headerCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  title: {
    flex: 1,
    minWidth: tokens.spacing.none,
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  informationStack: {
    gap: tokens.spacing.none,
  },
  informationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  iconFrame: {
    width: tokens.spacing.xl,
    height: tokens.spacing.xl,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueStack: {
    flex: 1,
    minWidth: tokens.spacing.none,
    gap: tokens.spacing.xxs,
  },
  label: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  value: {
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
});
