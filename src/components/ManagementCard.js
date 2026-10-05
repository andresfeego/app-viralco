import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';

// A shared media row + Stack for settings, people and commercial administration.
export function ManagementCard({ theme, title, subtitle, icon, badge, children, actions, prominent = false, testID }) {
  return <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
    <View testID={testID} style={styles.stack}>
      <View style={styles.header}>
        {icon ? <View style={[styles.icon, { backgroundColor: theme.background }]}>
          <Icon name={icon} iconStyle="solid" size={tokens.typography.heading} color={theme.primary} accessible={false} />
        </View> : null}
        <View style={styles.copy}>
          <Text accessibilityRole="header" style={[styles.title, prominent && styles.prominent, { color: theme.textPrimary }]}>{title}</Text>
          {subtitle ? <Text selectable style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text> : null}
          {badge ? <View style={styles.badges}>{badge}</View> : null}
        </View>
      </View>
      {children}
      {actions ? <View style={[styles.actions, { borderTopColor: theme.border }]}>{actions}</View> : null}
    </View>
  </SurfaceCard>;
}

export function ManagementEmptyState({ theme, icon = 'inbox', label }) {
  return <View style={styles.empty}>
    <Icon name={icon} iconStyle="solid" size={tokens.typography.hero} color={theme.textSecondary} accessible={false} />
    <Text style={[styles.subtitle, styles.centerText, { color: theme.textSecondary }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.sm, minWidth: tokens.spacing.none },
  icon: { width: tokens.spacing.xl + tokens.spacing.md, height: tokens.spacing.xl + tokens.spacing.md, borderRadius: tokens.radius.md, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: tokens.spacing.none, gap: tokens.spacing.xs },
  title: { fontSize: tokens.typography.body, fontWeight: '700', flexShrink: 1 },
  prominent: { fontSize: tokens.typography.heading },
  subtitle: { fontSize: tokens.typography.caption, flexShrink: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: tokens.spacing.sm, borderTopWidth: tokens.border.thin, paddingTop: tokens.spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.xl, gap: tokens.spacing.md },
  centerText: { textAlign: 'center' },
});
