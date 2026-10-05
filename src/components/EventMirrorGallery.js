import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Share, StyleSheet, Text, View } from 'react-native';
import { CompositionSyncCard } from './CompositionSyncCard';
import { loadEventSyncEntries, syncEventCompositions } from '../services/mirrorEventSync';
import { compositionKey, loadArchivedCompositions, setCompositionArchived, syncCompositionArchives } from '../services/mirrorLocalGallery';
import { newestCompositionsFirst } from '../domain/compositionDate';
import { GuestModal } from './MirrorGuestScene';
import { IconTextButton } from './IconTextButton';
import { PullToRefreshControl } from './PullToRefreshControl';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { listMirrorCompositionsApi } from '../services/api/events';
import { recordClientTechnicalError } from '../services/errorHandling';
import { useToast } from '../providers/ToastProvider';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function EventMirrorGallery({ eventId, eventModeId, eventName, theme }) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [local, setLocal] = useState([]);
  const [states, setStates] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [hidden, setHidden] = useState({});
  const [archiving, setArchiving] = useState({});
  const syncLock = useRef(false);
  const generation = useRef(0);
  const { showToast } = useToast();
  const load = async (next = null, notify = true) => {
    const request = ++generation.current;
    setBusy(true);
    try {
      try { await syncCompositionArchives(eventId, [eventModeId]); }
      catch (error) { recordClientTechnicalError({ code: 'MIRROR_ARCHIVE_SYNC_PENDING', detail: error.message }); }
      const entries = await loadEventSyncEntries(eventId, eventModeId, true);
      const archived = await loadArchivedCompositions();
      if (generation.current !== request) return;
      setHidden(archived);
      setLocal(entries);
      const page = await listMirrorCompositionsApi(eventId, eventModeId, next);
      if (generation.current !== request) return;
      const rows = page.items.map((asset) => ({ output: { uri: asset.url, clientAssetId: asset.clientAssetId, capturedAt: asset.metadata?.capturedAt || asset.metadata?.localCreatedAt, createdAt: asset.createdAt, syncStatus: 'synced' }, asset }));
      setItems((previous) => next ? [...previous, ...rows] : rows);
      setCursor(page.nextCursor); setFailed(false);
    } catch (error) {
      if (generation.current !== request) return;
      setFailed(true);
      recordClientTechnicalError({ code: 'MIRROR_EVENT_GALLERY_FAILED', detail: error.message });
      if (notify) showToast({ type: 'error', message: t('gallery_failed') });
    } finally { if (generation.current === request) setBusy(false); }
  };
  useEffect(() => {
    setItems([]); setOpen(false); setViewing(null); setCursor(null);
    load(null, false);
    return () => { generation.current += 1; };
    // Each event/mode owns an independent request generation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, eventModeId]);
  const share = async () => {
    try { await Share.share({ url: viewing.output.uri, message: viewing.output.uri }); }
    catch (error) { recordClientTechnicalError({ code: 'MIRROR_EVENT_SHARE_FAILED', detail: error.message }); showToast({ type: 'error', message: t('gallery_failed') }); }
  };
  const synchronize = async () => {
    if (syncLock.current) return;
    syncLock.current = true; setSyncing(true);
    try {
      const entries = await loadEventSyncEntries(eventId, eventModeId, true);
      await syncEventCompositions(entries, (key, state) => setStates((previous) => ({ ...previous, [key]: state })));
      await load();
    } catch (error) { recordClientTechnicalError({ code: 'MIRROR_EVENT_SYNC_FAILED', detail: error.message }); showToast({ type: 'error', message: t('gallery_failed') }); }
    finally { syncLock.current = false; setSyncing(false); }
  };
  const archive = async (run) => {
    const key = compositionKey(run);
    setArchiving((previous) => ({ ...previous, [key]: true }));
    try { setHidden(await setCompositionArchived(run, true, { eventId, eventModeId })); }
    catch (error) { recordClientTechnicalError({ code: 'MIRROR_EVENT_ARCHIVE_FAILED', detail: error.message }); showToast({ type: 'error', message: t('gallery_failed') }); }
    finally { setArchiving((previous) => ({ ...previous, [key]: false })); }
  };
  const refresh = usePullToRefresh(() => load(), { disabled: busy || syncing });
  if (!items.length && !local.length && !failed && !open) return null;
  return <>
    <IconTextButton testID="event-mirror-gallery" theme={theme} icon="images" iconOnlyShape="rounded-square" variant="outlined" borderColor={theme.primary} iconColor={theme.primary} accessibilityLabel={t('gallery_event')} onPress={() => { setOpen(true); load(); }} />
    {open ? <GuestModal headerCoversSafeArea theme={theme} title={eventName || t('gallery_event')} subtitle={t('gallery_capture_list')} onClose={() => { if (!syncing) { setOpen(false); setViewing(null); } }}>
      {viewing ? <>
        <Image source={{ uri: viewing.output.uri }} resizeMode="contain" style={styles.viewer} />
        <View style={styles.actions}>
          <IconTextButton theme={theme} icon="arrow-left" label={t('guest_gallery')} onPress={() => setViewing(null)} />
          <IconTextButton theme={theme} icon="share-nodes" label={t('gallery_share')} onPress={share} />
        </View>
      </> : <>
        <>
          <View style={styles.syncAction}><IconTextButton theme={theme} icon="cloud-arrow-up" label={t('sync_all')} disabled={syncing || busy || !local.some((entry) => entry.run.syncStatus !== 'synced')} onPress={synchronize} /></View>
          <FlatList testID="event-captures-list" alwaysBounceVertical refreshControl={<PullToRefreshControl theme={theme} {...refresh} disabled={busy || syncing} />} data={newestCompositionsFirst([...local, ...items.filter((run) => !local.some((entry) => compositionKey(entry.run) === compositionKey(run))).map((run) => ({ run }))].filter((entry) => !hidden[compositionKey(entry.run)]))} keyExtractor={(entry) => compositionKey(entry.run)} contentContainerStyle={styles.list}
            renderItem={({ item }) => <CompositionSyncCard run={item.run} state={states[compositionKey(item.run)]} theme={theme} onView={() => setViewing(item.run)} onArchive={() => archive(item.run)} archiveDisabled={syncing || !!archiving[compositionKey(item.run)]} />}
            ListEmptyComponent={<Text style={{ color: theme.textSecondary }}>{t('guest_empty')}</Text>}
          />
        </>
        {busy && !refresh.refreshing ? <Text style={{ color: theme.textSecondary }}>{t('gallery_loading')}</Text> : null}
        <View style={styles.actions}>
          {cursor ? <IconTextButton theme={theme} icon="chevron-down" label={t('gallery_more')} disabled={busy || syncing} onPress={() => load(cursor)} /> : null}
        </View>
      </>}
    </GuestModal> : null}
  </>;
}
const styles = StyleSheet.create({
  viewer: { flex: 1, width: '100%', minHeight: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.spacing.sm },
  syncAction: { alignItems: 'flex-end' },
  list: { flexGrow: 1, gap: tokens.spacing.md, paddingBottom: tokens.spacing.md },
});
