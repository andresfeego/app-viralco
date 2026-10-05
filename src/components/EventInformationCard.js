import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { IconTextButton } from './IconTextButton';
import { StatusBadge } from './StatusBadge';
import { InformationRow } from './InformationRow';

export function EventInformationCard({
  theme,
  event,
  title,
  labels,
  statusLabel,
  statusFlag = 'warn',
  canEdit = false,
  onEdit = null,
  onActivate = null,
  activating = false,
}) {
  const rows = [
    { key: 'type', icon: 'shapes', label: labels.type, value: event?.eventType?.name },
    { key: 'date', icon: 'calendar-day', label: labels.date, value: event?.eventDate },
    { key: 'status', icon: 'circle-check', label: labels.status, status: true },
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
            {row.status ? (
              <View style={styles.statusCluster}>
                <StatusBadge label={statusLabel} flag={statusFlag} compact />
                {event?.status === 'draft' && canEdit && onActivate ? (
                  <IconTextButton
                    theme={theme}
                    label={labels.activate}
                    icon="circle-check"
                    variant="filled"
                    backgroundColor={tokens.colors.success[500]}
                    pressedBackgroundColor={tokens.colors.success[600]}
                    borderColor={tokens.colors.success[500]}
                    iconColor={theme.buttonText}
                    disabled={activating}
                    onPress={onActivate}
                    testID="event-activate"
                  />
                ) : null}
              </View>
            ) : null}
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
  statusCluster: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
});
