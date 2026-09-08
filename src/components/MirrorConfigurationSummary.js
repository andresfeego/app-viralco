import Icon from '@react-native-vector-icons/fontawesome6';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { assessMagicMirrorConfig } from '../domain/magicMirrorAssessment';
import { t } from '../i18n';
import { StatusBadge } from './StatusBadge';

function SummaryItem({ item, kind, theme, onNavigate }) {
  const actionable = Boolean(onNavigate && item.target);
  const borderColor = kind === 'invalid'
    ? theme.alert
    : kind === 'missing'
      ? tokens.colors.warn[400]
      : tokens.colors.success[400];
  const content = (
    <SurfaceCard surfaceColor={theme.surface} borderColor={borderColor}>
      <View style={styles.itemHeader}>
        <Text style={[styles.itemTitle, { color: theme.textPrimary }]}>{item.title}</Text>
        {actionable ? <Icon name="arrow-right" iconStyle="solid" size={tokens.typography.caption} color={theme.primary} /> : null}
      </View>
      <Text style={[styles.itemDetail, { color: theme.textSecondary }]}>{item.detail || item.reason}</Text>
      {item.advice ? <Text style={[styles.advice, { color: theme.textPrimary }]}>{item.advice}</Text> : null}
    </SurfaceCard>
  );
  if (!actionable) return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. ${item.reason || item.detail}. ${item.advice || ''}`}
      onPress={() => onNavigate(item.target)}
      style={({ pressed }) => ({ opacity: pressed ? tokens.opacity.disabled : 1 })}
    >
      {content}
    </Pressable>
  );
}

function SummarySection({ title, flag, items, kind, theme, onNavigate, testID }) {
  if (!items.length) return null;
  return (
    <View testID={testID} style={styles.section}>
      <StatusBadge label={`${title} · ${items.length}`} flag={flag} />
      <View style={styles.itemStack}>
        {items.map((item) => <SummaryItem key={item.id} item={item} kind={kind} theme={theme} onNavigate={onNavigate} />)}
      </View>
    </View>
  );
}

export function MirrorConfigurationSummary({ config, issues = [], resourcesById = {}, theme, onNavigate }) {
  const assessment = useMemo(
    () => assessMagicMirrorConfig({ config, issues, resourcesById, translate: t }),
    [config, issues, resourcesById],
  );
  return (
    <View testID="mirror-configuration-summary" style={styles.stack}>
      <SummarySection testID="mirror-summary-invalid" title={t('mirror_summary_invalid')} flag="error" items={assessment.invalid} kind="invalid" theme={theme} onNavigate={onNavigate} />
      <SummarySection testID="mirror-summary-applied" title={t('mirror_summary_applied')} flag="success" items={assessment.applied} kind="applied" theme={theme} />
      <SummarySection testID="mirror-summary-missing" title={t('mirror_summary_missing')} flag="warn" items={assessment.missing} kind="missing" theme={theme} onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.spacing.lg },
  section: { gap: tokens.spacing.sm, minWidth: 0 },
  itemStack: { gap: tokens.spacing.sm },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm, minWidth: 0 },
  itemTitle: { flex: 1, minWidth: 0, fontSize: tokens.typography.body, fontWeight: '700' },
  itemDetail: { fontSize: tokens.typography.caption },
  advice: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
