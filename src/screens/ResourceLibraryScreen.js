import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Picker } from '@react-native-picker/picker';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { ResourcePicker } from '../components/ResourcePicker';
import { ResourceSelectionSummary } from '../components/ResourceSelectionSummary';
import { ResourceUploadAction } from '../components/ResourceUploadAction';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { listAccountsApi } from '../services/api/accounts';
import {
  createEventResourceApi,
  deleteEventResourceApi,
  getMagicMirrorConfigApi,
  listAccountLibraryApi,
  listEventsApi,
  saveMagicMirrorConfigApi,
  updateAccountLibraryFavoriteApi,
  uploadAccountLibraryFileApi,
} from '../services/api/events';
import { pickLibraryResourceFile } from '../services/media/documentPicker';

const INITIAL_FILTERS = { tab: 'pool', search: '', type: '', page: 1 };
const MAX_STANDARD_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

function normalizeEntry(item) {
  return {
    ...item,
    id: String(item?.id || ''),
    libraryAssetId: String(item?.libraryAssetId || item?.asset?.id || ''),
    isFavorite: Boolean(item?.isFavorite),
  };
}

function accountRole(user, accountId) {
  const membership = (user?.accounts || []).find((item) => String(item.account?.id) === String(accountId));
  return membership?.status === 'active' ? membership?.role?.slug || '' : '';
}

function mirrorModeForEvent(event) {
  return (event?.modes || []).find((item) => item?.mode?.slug === 'espejo' && item?.isActive !== false) || null;
}

function configResourcePatch(config, purpose, eventResourceId) {
  const resources = { ...(config.resources || {}) };
  const fields = {
    template: 'templateResourceId',
    frame: 'frameResourceId',
    gif_overlay: 'gifOverlayResourceId',
    start_screen: 'startScreenResourceId',
    background: 'backgroundResourceId',
    font: 'fontResourceId',
  };
  if (purpose === 'animation') {
    resources.animationResourceIds = [...new Set([...(resources.animationResourceIds || []), eventResourceId])];
  } else if (fields[purpose]) {
    resources[fields[purpose]] = eventResourceId;
  }
  return { ...config, resources };
}

export function ResourceLibraryScreen({ onHeaderChange = null }) {
  const { user } = useAuth();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 30, total: 0, pageCount: 0 });
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [selected, setSelected] = useState(null);
  const [uploadPurpose, setUploadPurpose] = useState('template');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [libraryError, setLibraryError] = useState('');
  const [ok, setOk] = useState('');

  const canManage = isSuperAdmin || ['owner', 'admin'].includes(accountRole(user, accountId));
  const selectedEvent = events.find((event) => String(event.id) === String(eventId)) || null;
  const selectedMirrorMode = mirrorModeForEvent(selectedEvent);

  useEffect(() => {
    onHeaderChange?.({ title: t('menu_004'), subtitle: '', iconName: 'images', onBack: null, backLabel: t('event_109') });
  }, [onHeaderChange]);

  const loadAccounts = useCallback(async () => {
    try {
      const payload = await listAccountsApi();
      const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];
      setAccounts(rows);
      setAccountId((current) => rows.some((account) => String(account.id) === String(current)) ? current : String(rows[0]?.id || ''));
    } catch (loadError) {
      setError(loadError?.message || t('account_006'));
    }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!accountId) { setEvents([]); setEventId(''); return; }
    try {
      const payload = await listEventsApi(accountId);
      const rows = Array.isArray(payload?.events) ? payload.events.filter((event) => mirrorModeForEvent(event)) : [];
      setEvents(rows);
      setEventId((current) => rows.some((event) => String(event.id) === String(current)) ? current : String(rows[0]?.id || ''));
    } catch (loadError) {
      setError(loadError?.message || t('event_040'));
    }
  }, [accountId]);

  const loadLibrary = useCallback(async () => {
    if (!accountId) { setItems([]); return; }
    setLoading(true);
    setLibraryError('');
    try {
      const payload = await listAccountLibraryApi(accountId, {
        favorite: filters.tab === 'favorites' ? true : '',
        type: filters.type,
        q: filters.search,
        page: filters.page,
        pageSize: 30,
      });
      setItems((payload?.library || []).map(normalizeEntry));
      setPagination(payload?.pagination || { page: 1, pageSize: 30, total: 0, pageCount: 0 });
    } catch (loadError) {
      setLibraryError(loadError?.message || t('resource_028'));
    } finally {
      setLoading(false);
    }
  }, [accountId, filters]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const toggleFavorite = async (item) => {
    if (!canManage) return;
    setSaving(true); setError(''); setOk('');
    try {
      await updateAccountLibraryFavoriteApi(accountId, item.libraryAssetId, !item.isFavorite);
      setOk(t('resource_029'));
      await loadLibrary();
    } catch (saveError) {
      setError(saveError?.message || t('resource_030'));
    } finally { setSaving(false); }
  };

  const uploadResource = async () => {
    if (!canManage || !accountId) return;
    setSaving(true); setError(''); setOk('');
    setUploadProgress(0);
    try {
      const file = await pickLibraryResourceFile();
      if (!file) return;
      if (!file.fileSize) throw new Error(t('resource_031'));
      const maxBytes = file.type.startsWith('video/') ? MAX_VIDEO_UPLOAD_BYTES : MAX_STANDARD_UPLOAD_BYTES;
      if (file.fileSize > maxBytes) throw new Error(t('resource_043'));
      await uploadAccountLibraryFileApi(accountId, file, uploadPurpose, setUploadProgress);
      setOk(t('resource_032'));
      await loadLibrary();
    } catch (uploadError) {
      setError(uploadError?.message || t('resource_033'));
    } finally { setSaving(false); setUploadProgress(0); }
  };

  const assignResource = async () => {
    if (!selected || !selectedEvent || !selectedMirrorMode || !canManage) return;
    setSaving(true); setError(''); setOk('');
    let createdResourceId = '';
    try {
      const created = await createEventResourceApi(selectedEvent.id, {
        libraryAssetId: selected.libraryAssetId,
        eventModeId: selectedMirrorMode.id,
        purpose: selected.asset?.type || uploadPurpose,
        orderIndex: 0,
        isActive: true,
      });
      const resourceId = created?.resource?.id;
      if (!resourceId) throw new Error(t('resource_034'));
      createdResourceId = String(resourceId);
      const current = await getMagicMirrorConfigApi(selectedEvent.id, selectedMirrorMode.id);
      const draft = current?.config;
      await saveMagicMirrorConfigApi(selectedEvent.id, selectedMirrorMode.id, {
        expectedRevision: draft.revision,
        schemaVersion: 1,
        config: configResourcePatch(draft.config, selected.asset?.type, resourceId),
      });
      setOk(t('resource_035'));
      setSelected(null);
    } catch (assignError) {
      if (createdResourceId) {
        try {
          await deleteEventResourceApi(selectedEvent.id, createdResourceId);
        } catch (_rollbackError) {
          // The original assignment error remains the actionable result.
        }
      }
      setError(assignError?.status === 409 ? t('resource_036') : assignError?.message || t('resource_034'));
    } finally { setSaving(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('resource_037')}</Text>
        <View style={[styles.picker, { borderColor: theme.border }]}>
          <Picker selectedValue={accountId} onValueChange={(value) => { setAccountId(String(value)); setFilters(INITIAL_FILTERS); setSelected(null); }} style={{ color: theme.textPrimary }}>
            {accounts.map((account) => <Picker.Item key={account.id} label={account.name} value={String(account.id)} />)}
          </Picker>
        </View>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{t('resource_038')}</Text>
        <View style={[styles.picker, { borderColor: theme.border }]}>
          <Picker selectedValue={eventId} onValueChange={(value) => setEventId(String(value))} style={{ color: theme.textPrimary }}>
            {!events.length ? <Picker.Item label={t('resource_039')} value="" /> : null}
            {events.map((event) => <Picker.Item key={event.id} label={event.name} value={String(event.id)} />)}
          </Picker>
        </View>
      </SurfaceCard>

      {error ? <Text style={[styles.feedback, { color: theme.alert }]}>{error}</Text> : null}
      {ok ? <Text style={[styles.feedback, { color: theme.secondary }]}>{ok}</Text> : null}
      {saving ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{uploadProgress ? `${t('resource_042')} ${uploadProgress}%` : t('event_020')}</Text> : null}

      {canManage ? (
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <ResourceUploadAction theme={theme} purpose={uploadPurpose} onPurposeChange={setUploadPurpose} disabled={saving} onUpload={uploadResource} />
        </SurfaceCard>
      ) : null}

      <ResourceSelectionSummary item={selected} theme={theme} disabled={!selectedMirrorMode || saving} onClear={() => setSelected(null)} onConfirm={assignResource} />

      <ResourcePicker
        items={items}
        theme={theme}
        canManage={canManage}
        loading={loading}
        error={libraryError}
        filters={filters}
        onFiltersChange={setFilters}
        selectedId={selected?.id || ''}
        onSelect={setSelected}
        onToggleFavorite={toggleFavorite}
        onRetry={loadLibrary}
        pagination={pagination}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl, gap: tokens.spacing.md },
  label: { fontSize: tokens.typography.caption, fontWeight: '700' },
  picker: { borderWidth: 1, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
