import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { ProgressBar } from 'react-native-paper';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { compositionDate } from '../domain/compositionDate';
import { IconTextButton } from './IconTextButton';

export function CompositionSyncCard({ run, state, theme, onView, onArchive, onRestore, archiveDisabled = false }) {
  const synced = state ? state.stage === 'synced' : run.output.syncStatus === 'synced';
  const stage = state?.stage || (synced ? 'synced' : 'pending');
  const percent = synced ? 100 : state?.percent || 0;
  const active = ['uploading', 'originals', 'confirming'].includes(stage);
  const icon = synced ? 'circle-check' : stage === 'failed' ? 'circle-exclamation' : active ? 'arrows-rotate' : 'clock';
  const dark = theme.surface === tokens.colors.surfaceDark;
  const iconColor = synced ? tokens.colors.success[dark ? 400 : 600] : stage === 'failed' ? tokens.colors.error[dark ? 400 : 600] : active ? theme.primary : tokens.colors.yellow[dark ? 400 : 600];
  const capturedAt = compositionDate(run);
  const disabled = run.output.localAvailable === false;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${t('gallery_view')} · ${t(`sync_${stage}`)}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onView}>
    {({ pressed }) => <SurfaceCard surfaceColor={pressed ? theme.background : theme.surface} borderColor={theme.border}>
    <View style={styles.row}>
      <View style={styles.details}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('guest_photo')}</Text>
        <Text style={{ color: theme.textSecondary }}>{capturedAt ? new Date(capturedAt).toLocaleString() : '—'}</Text>
        <View style={styles.status}>
          <Icon name={icon} size={tokens.typography.body} color={iconColor} />
          <Text accessibilityLiveRegion="polite" style={[styles.statusText, { color: theme.textPrimary }]}>{t(`sync_${stage}`)}{active ? ` · ${percent}%` : ''}</Text>
        </View>
        {active ? <ProgressBar progress={percent / 100} color={theme.primary} /> : null}
      </View>
      {onArchive || onRestore ? <IconTextButton theme={theme} icon={onRestore ? 'rotate-left' : 'trash-can'} variant="ghost" iconSize={tokens.typography.body} style={styles.archive}
        iconColor={onRestore ? tokens.colors.success[dark ? 400 : 600] : tokens.colors.error[dark ? 400 : 600]} accessibilityLabel={t(onRestore ? 'gallery_restore' : 'gallery_archive')} testID={onRestore ? 'composition-restore' : 'composition-archive'}
        disabled={archiveDisabled} onPress={(event) => { event?.stopPropagation?.(); (onRestore || onArchive)(); }} /> : null}
      <Image source={{ uri: run.output.uri }} resizeMode="cover" style={styles.thumbnail} />
    </View>
  </SurfaceCard>}
  </Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.spacing.sm },
  archive: { alignItems: 'flex-start' },
  details: { flex: 1, minWidth: 0, gap: tokens.spacing.xs },
  status: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  statusText: { flex: 1, minWidth: 0 },
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  thumbnail: { width: '30%', aspectRatio: 1, borderRadius: tokens.radius.md },
});
