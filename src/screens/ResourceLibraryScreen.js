import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { CompactAccountSelector } from '../components/CompactAccountSelector';
import { AccountRequiredEmptyState } from '../components/AccountRequiredEmptyState';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { ResourceFilters } from '../components/ResourceFilters';
import { ResourceGallery } from '../components/ResourceGallery';
import { ResourcePreviewModal } from '../components/ResourcePreviewModal';
import { ResourceUploadModal } from '../components/ResourceUploadModal';
import { IconTextButton } from '../components/IconTextButton';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';
import { listAccountsApi } from '../services/api/accounts';
import { createAccountPrintProfileApi, listAccountLibraryApi, listEventTypesApi, updateAccountLibraryFavoriteApi, uploadAccountLibraryFileApi } from '../services/api/events';
import { userErrorMessage } from '../services/errorHandling';
import { pickResourceFromDevice } from '../services/media/resourcePicker';
import { detectPrinter, detectedPrinterProfileInput } from '../services/printers';

const INITIAL_FILTERS = { tab: 'favorites', search: '', type: '', eventType: '', motion: '' };
const PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 300;
const MAX_STANDARD_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

function normalizeEntry(item) {
  return {
    ...item,
    id: item?.id == null ? null : String(item.id),
    libraryAssetId: String(item?.libraryAssetId || item?.asset?.id || ''),
    isFavorite: Boolean(item?.isFavorite),
  };
}

function mergeUnique(current, incoming) {
  const byAsset = new Map(current.map((item) => [String(item.libraryAssetId), item]));
  incoming.forEach((item) => byAsset.set(String(item.libraryAssetId), item));
  return [...byAsset.values()];
}

function accountRole(user, accountId) {
  const membership = (user?.accounts || []).find((item) => String(item.account?.id) === String(accountId));
  return membership?.status === 'active' ? membership?.role?.slug || '' : '';
}

export function ResourceLibraryScreen({ onHeaderChange = null, onCreateAccount = () => {} }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [eventTypes, setEventTypes] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: PAGE_SIZE, total: 0, pageCount: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [previewItem, setPreviewItem] = useState(null);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [uploadPurpose, setUploadPurpose] = useState('background');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const uploadInFlight = useRef(false);
  const favoriteSavingIds = useRef(new Set());
  const requestSequence = useRef(0);

  const canManage = isSuperAdmin || ['owner', 'admin'].includes(accountRole(user, accountId));

  useEffect(() => {
    onHeaderChange?.({ title: t('menu_004'), subtitle: '', iconName: 'images', onBack: null, backLabel: t('event_109') });
  }, [onHeaderChange]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(filters.search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [filters.search]);

  const loadAccounts = useCallback(async () => {
    setAccountError('');
    setAccountsLoading(true);
    try {
      const [payload, eventTypesPayload] = await Promise.all([
        listAccountsApi(),
        listEventTypesApi().catch(() => ({ types: [] })),
      ]);
      const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];
      setEventTypes(Array.isArray(eventTypesPayload?.types) ? eventTypesPayload.types : []);
      setAccounts(rows);
      setAccountId((current) => rows.some((account) => String(account.id) === String(current)) ? current : String(rows[0]?.id || ''));
    } catch (loadError) {
      setAccountError(userErrorMessage(loadError, t('account_006')));
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  const loadLibrary = useCallback(async ({ page = 1, append = false, refresh = false } = {}) => {
    if (!accountId) { setItems([]); return; }
    const requestId = ++requestSequence.current;
    if (append) setLoadingMore(true);
    else if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const payload = await listAccountLibraryApi(accountId, {
        scope: filters.tab === 'favorites' ? 'available' : 'global',
        favorite: filters.tab === 'favorites' ? true : '',
        type: filters.type,
        eventType: filters.eventType,
        motion: filters.type === 'sticker' ? filters.motion : '',
        q: debouncedSearch,
        page,
        pageSize: PAGE_SIZE,
      });
      if (requestId !== requestSequence.current) return;
      const rows = (payload?.library || []).map(normalizeEntry);
      setItems((current) => append ? mergeUnique(current, rows) : rows);
      setPagination(payload?.pagination || { page, pageSize: PAGE_SIZE, total: rows.length, pageCount: rows.length ? 1 : 0 });
    } catch (loadError) {
      if (requestId === requestSequence.current) setError(userErrorMessage(loadError, t('resource_028')));
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }
  }, [accountId, debouncedSearch, filters.eventType, filters.motion, filters.tab, filters.type]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { setItems([]); setPreviewItem(null); loadLibrary(); }, [loadLibrary]);

  const changeAccount = (nextAccountId) => {
    requestSequence.current += 1;
    setAccountId(nextAccountId);
    setItems([]);
    setPagination({ page: 1, pageSize: PAGE_SIZE, total: 0, pageCount: 0 });
    setPreviewItem(null);
  };

  const toggleFavorite = async (item) => {
    if (!canManage || !item?.libraryAssetId || favoriteSavingIds.current.has(item.libraryAssetId)) return;
    const assetId = item.libraryAssetId;
    const nextFavorite = !item.isFavorite;
    const beforeItems = items;
    const beforePreview = previewItem;
    favoriteSavingIds.current.add(assetId);
    setItems((current) => current
      .map((entry) => entry.libraryAssetId === assetId ? { ...entry, isFavorite: nextFavorite } : entry)
      .filter((entry) => filters.tab !== 'favorites' || entry.isFavorite));
    setPreviewItem((current) => current?.libraryAssetId === assetId ? { ...current, isFavorite: nextFavorite } : current);
    try {
      const payload = await updateAccountLibraryFavoriteApi(accountId, assetId, nextFavorite);
      const saved = normalizeEntry(payload?.library || { ...item, isFavorite: nextFavorite });
      setItems((current) => current.map((entry) => entry.libraryAssetId === assetId ? { ...entry, ...saved } : entry));
      setPreviewItem((current) => current?.libraryAssetId === assetId ? { ...current, ...saved } : current);
      showToast({ message: t('resource_029'), type: 'success' });
    } catch (saveError) {
      setItems(beforeItems);
      setPreviewItem(beforePreview);
      showToast({ message: userErrorMessage(saveError, t('resource_030')), type: 'error' });
    } finally {
      favoriteSavingIds.current.delete(assetId);
    }
  };

  const loadMore = () => {
    if (loading || loadingMore || pagination.page >= pagination.pageCount) return;
    loadLibrary({ page: pagination.page + 1, append: true });
  };

  const uploadFromDevice = async (purpose, source = 'files') => {
    if (!canManage || !purpose || uploadInFlight.current) return;
    uploadInFlight.current = true;
    setUploadBusy(true);
    try {
      if (purpose === 'print_profile') {
        const binding = await detectPrinter(accountId);
        if (!binding) return;
        const available = await listAccountLibraryApi(accountId, { scope: 'available', type: 'print_profile', page: 1, pageSize: 100 });
        const matching = (available?.library || []).find((item) => {
          const profile = item?.asset?.metadata?.printProfile;
          return profile && String(binding.name).toLowerCase().includes(String(profile.model || '').toLowerCase());
        });
        if (matching) await updateAccountLibraryFavoriteApi(accountId, matching.libraryAssetId, true);
        else await createAccountPrintProfileApi(accountId, detectedPrinterProfileInput(binding));
        setUploadVisible(false);
        await loadLibrary({ refresh: true });
        showToast({ message: t('print_023'), type: 'success' });
        return;
      }
      const file = await pickResourceFromDevice(purpose, source);
      if (!file) return;
      const maxBytes = String(file.type || '').startsWith('video/') ? MAX_VIDEO_UPLOAD_BYTES : MAX_STANDARD_UPLOAD_BYTES;
      if (!file.fileSize || file.fileSize > maxBytes) throw new Error(t('resource_043'));
      setUploadProgress(1);
      const asset = await uploadAccountLibraryFileApi(accountId, file, purpose, setUploadProgress);
      if (asset?.id) await updateAccountLibraryFavoriteApi(accountId, asset.id, true);
      setUploadProgress(0);
      setUploadVisible(false);
      await loadLibrary({ refresh: true });
      showToast({ message: t('resource_032'), type: 'success' });
    } catch (uploadError) {
      setUploadProgress(0);
      showToast({ message: userErrorMessage(uploadError, purpose === 'print_profile' ? t('print_024') : t('resource_033')), type: 'error' });
    } finally {
      uploadInFlight.current = false;
      setUploadBusy(false);
    }
  };

  const hasActiveFilter = Boolean(filters.search || filters.type || filters.eventType || filters.motion);
  const header = (
    <View style={styles.header}>
      <ResourceFilters
        theme={theme}
        chipVariant="outlined"
        tab={filters.tab}
        onTabChange={(tab) => setFilters((current) => ({ ...current, tab }))}
        search={filters.search}
        onSearchChange={(search) => setFilters((current) => ({ ...current, search }))}
        type={filters.type}
        onTypeChange={(type) => setFilters((current) => ({ ...current, type, motion: type === 'sticker' ? current.motion : '' }))}
        eventTypes={eventTypes}
        eventType={filters.eventType}
        onEventTypeChange={(eventType) => setFilters((current) => ({ ...current, eventType }))}
        motion={filters.motion}
        onMotionChange={(motion) => setFilters((current) => ({ ...current, motion }))}
        showTabs={false}
      />
    </View>
  );

  if (accountsLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (accounts.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {accountError ? <Text style={[styles.feedback, { color: theme.alert }]}>{accountError}</Text> : null}
        <AccountRequiredEmptyState theme={theme} onCreateAccount={onCreateAccount} testID="resources-account-required" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HorizontalSubMenu
        theme={theme}
        selectedKey={filters.tab}
        onSelect={(tab) => setFilters((current) => ({ ...current, tab }))}
        items={[{ key: 'favorites', label: t('resource_002') }, { key: 'pool', label: t('resource_045') }]}
      />
      <CompactAccountSelector accounts={accounts} value={accountId} onChange={changeAccount} theme={theme} roleLabel={isSuperAdmin ? 'super_admin' : accountRole(user, accountId)} />
      {canManage ? <View style={styles.accountTools}>
        <IconTextButton testID="resource-upload-open" theme={theme} icon="plus" label={t('resource_058')} onPress={() => setUploadVisible(true)} />
      </View> : null}
      <ResourceGallery
        items={items}
        theme={theme}
        canManage={canManage}
        loading={loading}
        loadingMore={loadingMore}
        refreshing={refreshing}
        error={error}
        emptyLabel={hasActiveFilter || filters.tab === 'favorites' ? t('resource_024') : t('resource_023')}
        header={header}
        onPressItem={setPreviewItem}
        onToggleFavorite={toggleFavorite}
        onRetry={() => loadLibrary()}
        onRefresh={() => loadLibrary({ refresh: true })}
        onLoadMore={loadMore}
        emptyPrimaryLabel={t('mirror_148')}
        onEmptyPrimary={() => setFilters((current) => ({ ...current, tab: 'pool', search: '', type: '', eventType: '', motion: '' }))}
        emptySecondaryLabel={t('resource_060')}
        onEmptySecondary={() => setUploadVisible(true)}
      />
      <ResourcePreviewModal item={previewItem} theme={theme} canManage={canManage} isSuperAdmin={isSuperAdmin} onGuideSaved={guide => { setPreviewItem(value => ({ ...value, asset: { ...value.asset, metadata: { ...value.asset.metadata, printGuide: guide } } })); loadLibrary({ refresh: true }); }} onClose={() => setPreviewItem(null)} onToggleFavorite={toggleFavorite} />
      <ResourceUploadModal visible={uploadVisible} theme={theme} purpose={uploadPurpose} progress={uploadProgress} disabled={uploadBusy} onPurposeChange={setUploadPurpose} onUpload={uploadFromDevice} onClose={() => { if (!uploadInFlight.current) setUploadVisible(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  accountTools: { alignItems: 'flex-end', paddingHorizontal: tokens.spacing.md, paddingTop: tokens.spacing.md },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
