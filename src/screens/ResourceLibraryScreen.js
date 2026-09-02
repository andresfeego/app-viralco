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
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';
import { listAccountsApi } from '../services/api/accounts';
import { listAccountLibraryApi, listEventTypesApi, updateAccountLibraryFavoriteApi } from '../services/api/events';

const INITIAL_FILTERS = { tab: 'favorites', search: '', type: '', eventType: '', motion: '' };
const PAGE_SIZE = 60;
const SEARCH_DEBOUNCE_MS = 300;

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
        listEventTypesApi().catch(() => ({ eventTypes: [] })),
      ]);
      const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];
      setEventTypes(Array.isArray(eventTypesPayload?.eventTypes) ? eventTypesPayload.eventTypes : []);
      setAccounts(rows);
      setAccountId((current) => rows.some((account) => String(account.id) === String(current)) ? current : String(rows[0]?.id || ''));
    } catch (loadError) {
      setAccountError(loadError?.message || t('account_006'));
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
        scope: 'global',
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
      if (requestId === requestSequence.current) setError(loadError?.message || t('resource_028'));
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
      showToast({ message: saveError?.message || t('resource_030'), type: 'error' });
    } finally {
      favoriteSavingIds.current.delete(assetId);
    }
  };

  const loadMore = () => {
    if (loading || loadingMore || pagination.page >= pagination.pageCount) return;
    loadLibrary({ page: pagination.page + 1, append: true });
  };

  const hasActiveFilter = Boolean(filters.search || filters.type || filters.eventType || filters.motion);
  const header = (
    <View style={styles.header}>
      <ResourceFilters
        theme={theme}
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
        horizontalTypes
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
      <CompactAccountSelector
        accounts={accounts}
        value={accountId}
        onChange={changeAccount}
        theme={theme}
        roleLabel={isSuperAdmin ? 'super_admin' : accountRole(user, accountId)}
      />
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
      />
      <ResourcePreviewModal item={previewItem} theme={theme} canManage={canManage} onClose={() => setPreviewItem(null)} onToggleFavorite={toggleFavorite} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
