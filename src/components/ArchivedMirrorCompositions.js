import React, { useState } from 'react';
import { FlatList, Image, StyleSheet, Text } from 'react-native';
import { IconTextButton } from './IconTextButton';
import { PullToRefreshControl } from './PullToRefreshControl';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { GuestModal } from './MirrorGuestScene';
import { CompositionSyncCard } from './CompositionSyncCard';
import { newestCompositionsFirst } from '../domain/compositionDate';
import { tokens } from '../design-system/tokens';
import { compositionKey, setCompositionArchived } from '../services/mirrorLocalGallery';
import { loadArchivedEventCompositions } from '../services/mirrorArchivedGallery';
import { useToast } from '../providers/ToastProvider';
import { recordClientTechnicalError } from '../services/errorHandling';
import { t } from '../i18n';

export function ArchivedMirrorCompositions({ eventId, eventModeIds, eventName, theme }) {
  const [open, setOpen] = useState(false);
  const [runs, setRuns] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const load = async () => {
    setBusy(true);
    try {
      const result = await loadArchivedEventCompositions(eventId, eventModeIds);
      setRuns(result.runs); setOpen(true);
      if (result.errors.length) {
        result.errors.forEach((error) => recordClientTechnicalError({ code: 'MIRROR_ARCHIVED_REMOTE_FAILED', detail: error.message }));
        showToast({ type: 'error', message: t('gallery_failed') });
      }
    } catch (error) { recordClientTechnicalError({ code: 'MIRROR_ARCHIVED_GALLERY_FAILED', detail: error.message }); showToast({ type: 'error', message: t('gallery_failed') }); }
    finally { setBusy(false); }
  };
  const restore = async (run) => {
    setBusy(true);
    try { await setCompositionArchived(run, false, { eventId, eventModeIds }); await load(); }
    catch (error) { recordClientTechnicalError({ code: 'MIRROR_RESTORE_FAILED', detail: error.message }); showToast({ type: 'error', message: t('gallery_failed') }); }
    finally { setBusy(false); }
  };
  const refresh = usePullToRefresh(load, { disabled: busy });
  return <>
    <IconTextButton theme={theme} icon="box-archive" label={t('gallery_archived')} onPress={load} disabled={busy} />
    {open ? <GuestModal headerCoversSafeArea theme={theme} title={eventName || t('gallery_event')} subtitle={t('gallery_archived_captures')} onClose={() => { if (!busy) { setOpen(false); setViewing(null); } }}>
      {viewing ? <><Image source={{ uri: viewing.output.uri }} resizeMode="contain" style={styles.viewer} /><IconTextButton theme={theme} icon="arrow-left" label={t('guest_gallery')} onPress={() => setViewing(null)} /></> : <FlatList
        testID="archived-captures-list" alwaysBounceVertical refreshControl={<PullToRefreshControl theme={theme} {...refresh} disabled={busy} />}
        data={newestCompositionsFirst(runs.map((run) => ({ run })))} keyExtractor={({ run }) => compositionKey(run)} contentContainerStyle={styles.list}
        renderItem={({ item }) => <CompositionSyncCard run={item.run} theme={theme} onView={() => setViewing(item.run)} onRestore={() => restore(item.run)} archiveDisabled={busy} />}
        ListEmptyComponent={<Text style={{ color: theme.textSecondary }}>{t('guest_empty')}</Text>}
      />}
      {busy && !refresh.refreshing ? <Text style={{ color: theme.textSecondary }}>{t('gallery_loading')}</Text> : null}
    </GuestModal> : null}
  </>;
}
const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: tokens.spacing.md, paddingBottom: tokens.spacing.md },
  viewer: { flex: 1, width: '100%', minHeight: 0 },
});
