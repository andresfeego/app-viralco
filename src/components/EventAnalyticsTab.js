import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';

const X_LABELS = ['Apr 4', 'Apr 9', 'Apr 15', 'Apr 21', 'Apr 29'];

function TrendCard({ theme, title, totalLabel, totalValue }) {
  return (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
      <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.totalLabel, { color: theme.textSecondary }]}>{totalLabel}</Text>
      <Text style={[styles.totalValue, { color: theme.textPrimary }]}>{totalValue}</Text>

      <View style={[styles.chartBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <View style={styles.yAxisCol}>
          <Text style={[styles.axisText, { color: theme.textSecondary }]}>4</Text>
          <Text style={[styles.axisText, { color: theme.textSecondary }]}>2</Text>
          <Text style={[styles.axisText, { color: theme.textSecondary }]}>1</Text>
          <Text style={[styles.axisText, { color: theme.textSecondary }]}>0</Text>
        </View>
        <View style={styles.plotArea}>
          <View style={[styles.baseLine, { backgroundColor: theme.border }]} />
          <View style={styles.pinkLine} />
          <View style={styles.xLabels}>
            {X_LABELS.map((label) => (
              <Text key={label} style={[styles.axisText, { color: theme.textSecondary }]}>
                {label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </SurfaceCard>
  );
}

export function EventAnalyticsTab({ theme, eventName, eventDate, onBack }) {
  return (
    <View style={styles.container}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text numberOfLines={1} style={[styles.eventName, { color: theme.textPrimary }]}>
          {eventName || 'Evento'}
        </Text>
        <Text style={[styles.eventDate, { color: theme.textSecondary }]}>{eventDate || '-'}</Text>
        <Text style={[styles.rangeLabel, { color: theme.textPrimary }]}>Ultimos 30 dias</Text>
      </SurfaceCard>

      <TrendCard theme={theme} title="Page Views" totalLabel="Total Page Views" totalValue="0" />
      <TrendCard theme={theme} title="Sessions" totalLabel="Total Sessions" totalValue="0" />
      <TrendCard theme={theme} title="Sharing from Apps" totalLabel="Total Shares" totalValue="0" />

      <AppButton
        label="Volver al dashboard"
        onPress={onBack}
        backgroundColor={theme.buttonBg}
        pressedColor={theme.buttonBgPressed}
        textColor={theme.buttonText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: tokens.spacing.sm,
  },
  eventName: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  eventDate: {
    marginTop: 2,
    fontSize: tokens.typography.body,
    fontWeight: '600',
  },
  rangeLabel: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.body,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  totalLabel: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.body,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 34,
    fontWeight: '700',
  },
  chartBox: {
    marginTop: tokens.spacing.xs,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 156,
    flexDirection: 'row',
    padding: tokens.spacing.sm,
    gap: tokens.spacing.sm,
  },
  yAxisCol: {
    justifyContent: 'space-between',
    paddingTop: tokens.spacing.xs,
    paddingBottom: 26,
  },
  plotArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  baseLine: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    height: 1,
  },
  pinkLine: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#e13b80',
  },
  xLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  axisText: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
});

