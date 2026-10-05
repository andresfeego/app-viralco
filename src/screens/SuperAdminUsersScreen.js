import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { createAdminUserApi, listAdminUsersApi, listBitacoraApi, updateUserStatusApi } from '../services/api/admin';
import { ProtectedScreen } from '../components/ProtectedScreen';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { StatusBadge } from '../components/StatusBadge';
import { SelectableChipGroup } from '../components/SelectableChipGroup';
import { tokens } from '../design-system/tokens';
import { getTheme } from '../design-system/theme';
import { t } from '../i18n';
import { userErrorMessage } from '../services/errorHandling';
import { BillingPanel } from '../components/BillingPanel';
import { PaperFormInput } from '../components/PaperFormInput';
import { FormModal } from '../components/FormModal';
import { ManagementCard, ManagementEmptyState } from '../components/ManagementCard';
import { InformationRow } from '../components/InformationRow';
import { IconTextButton } from '../components/IconTextButton';
import { PaperDateInput } from '../components/PaperDateInput';
import { ToastViewport, useToast } from '../providers/ToastProvider';
import { AppButton } from '../design-system/components/AppButton';
import { PullToRefreshControl } from '../components/PullToRefreshControl';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function getEstadoFlag(userItem) {
  const slug = userItem?.status?.slug;
  if (slug === 'active') {
    return 'success';
  }
  if (slug === 'suspended') {
    return 'error';
  }
  if (slug === 'pending') {
    return 'warn';
  }
  return 'info';
}

function getEstadoLabel(userItem) {
  const labels = { active: t('status_001'), suspended: t('admin_suspended'), pending: t('status_000') };
  return labels[userItem?.status?.slug] || userItem?.status?.name || '—';
}

export function SuperAdminUsersScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const mode = user?.themeMode || 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [section, setSection] = useState('usuarios');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const mutationLock = useRef(false);
  const [changingUser, setChangingUser] = useState(null);
  const [createVisible, setCreateVisible] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [technicalVisible, setTechnicalVisible] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bitacoraItems, setBitacoraItems] = useState([]);
  const [bitacoraLoading, setBitacoraLoading] = useState(false);
  const [bitacoraHasMore, setBitacoraHasMore] = useState(false);
  const [bitacoraPage, setBitacoraPage] = useState(1);
  const [selectedBitacora, setSelectedBitacora] = useState(null);
  const [bitacoraSearch, setBitacoraSearch] = useState('');
  const [bitacoraResultado, setBitacoraResultado] = useState('all');
  const [bitacoraStartDate, setBitacoraStartDate] = useState('');
  const [bitacoraEndDate, setBitacoraEndDate] = useState('');

  const isSuperAdmin = useMemo(
    () => (user?.globalRoles || []).some((role) => role.slug === 'super_admin'),
    [user]
  );

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await listAdminUsersApi();
      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch (err) {
      setError(userErrorMessage(err, t('admin_users_failed')));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const changeStatus = async (id, status) => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setChangingUser(id);
    try {
      await updateUserStatusApi(id, status);
      await loadUsers();
    } catch (err) {
      setError(userErrorMessage(err, t('admin_status_failed')));
    } finally { mutationLock.current = false; setChangingUser(null); }
  };

  const createAdmin = async () => {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setSubmitting(true);
    setError('');
    try {
      await createAdminUserApi({ email: email.trim(), password, name: name.trim(), phone: phone || undefined });
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setCreateVisible(false);
      showToast({ type: 'success', message: t('admin_created') });
      await loadUsers();
      setSection('usuarios');
    } catch (err) {
      const failure = userErrorMessage(err, t('admin_create_failed'));
      setError(failure);
      showToast({ type: 'error', message: failure });
    } finally {
      mutationLock.current = false;
      setSubmitting(false);
    }
  };

  const loadBitacora = async (nextPage = 1, append = false) => {
    setBitacoraLoading(true);
    setError('');
    try {
      const payload = await listBitacoraApi({
        page: nextPage,
        pageSize: 30,
        startDate: bitacoraStartDate,
        endDate: bitacoraEndDate,
      });
      const rows = Array.isArray(payload?.items) ? payload.items : [];
      setBitacoraItems((prev) => {
        if (!append) {
          return rows;
        }
        const merged = [...prev, ...rows];
        const unique = [];
        const seen = new Set();
        for (const row of merged) {
          const stableKey = `${row?.id ?? 'no-id'}-${row?.requestId ?? 'no-request'}`;
          if (seen.has(stableKey)) {
            continue;
          }
          seen.add(stableKey);
          unique.push(row);
        }
        return unique;
      });
      setBitacoraHasMore(Boolean(payload?.hasMore));
      setBitacoraPage(Number(payload?.page || nextPage));
    } catch (err) {
      setError(userErrorMessage(err, t('admin_audit_failed')));
    } finally {
      setBitacoraLoading(false);
    }
  };

  const userRefresh = usePullToRefresh(loadUsers, { disabled: loading || changingUser !== null || createVisible || !isSuperAdmin });
  const auditRefresh = usePullToRefresh(() => loadBitacora(1, false), { disabled: bitacoraLoading || !isSuperAdmin });

  useEffect(() => {
    if (section === 'bitacora' && isSuperAdmin) {
      loadBitacora(1, false);
    }
  }, [section, user?.id, isSuperAdmin, bitacoraStartDate, bitacoraEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredBitacoraItems = useMemo(() => {
    const query = String(bitacoraSearch || '').trim().toLowerCase();
    return bitacoraItems.filter((item) => {
      const byResultado = bitacoraResultado === 'all' ? true : String(item?.resultado || '') === bitacoraResultado;
      if (!byResultado) {
        return false;
      }
      if (!query) {
        return true;
      }
      const haystack = `${item?.accion || ''} ${item?.mensaje || ''} ${item?.httpPath || ''} ${item?.requestId || ''} ${item?.errorCode || ''} ${item?.errorDetalle || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [bitacoraItems, bitacoraResultado, bitacoraSearch]);

  const formatDate = (isoDate) => {
    if (!isoDate) {
      return '-';
    }
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return String(isoDate);
    }
    return date.toLocaleString();
  };

  if (!isSuperAdmin) return <View style={styles.centered}><Text style={{ color: theme.textPrimary }}>{t('auth_013')}</Text></View>;
  const sections = [
    { key: 'usuarios', label: t('admin_users') },
    { key: 'catalog', label: t('billing_catalog') },
    { key: 'reports', label: t('billing_collections') },
    { key: 'bitacora', label: t('submenu_002') },
  ];
  const visibleUsers = users.filter(item => !userSearch.trim() || `${item.name || ''} ${item.email || ''}`.toLowerCase().includes(userSearch.trim().toLowerCase()));
  const secondary = { variant: 'outlined', borderColor: theme.buttonSecondaryBorder, backgroundColor: theme.surface, pressedColor: theme.background, textColor: theme.textPrimary };
  const closeCreate = () => { if (!submitting) { setCreateVisible(false); setPassword(''); } };

  return <ProtectedScreen permission="users.view">
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HorizontalSubMenu items={sections} selectedKey={section} onSelect={setSection} theme={theme} />
      {['catalog', 'reports'].includes(section) ? <BillingPanel key={section} section={section} theme={theme} /> : null}
      {error ? <Text accessibilityRole="alert" style={[styles.feedback, { color: theme.alert }]}>{error}</Text> : null}

      {section === 'usuarios' ? <FlatList testID="admin-users-list" alwaysBounceVertical
        refreshControl={<PullToRefreshControl theme={theme} {...userRefresh} disabled={loading || changingUser !== null || createVisible} />}
        data={visibleUsers} keyExtractor={item => String(item.id)} contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.stack}>
          <View style={styles.headingRow}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{t('submenu_000')}</Text>
          </View>
          <View style={styles.actions}><IconTextButton testID="admin-user-create-open" theme={theme} icon="plus" label={t('admin_new_user')} onPress={() => { setError(''); setCreateVisible(true); }} /></View>
          <PaperFormInput theme={theme} testID="admin-user-search" label={t('admin_user_search')} value={userSearch} onChangeText={setUserSearch} autoCapitalize="none" />
          {loading && !userRefresh.refreshing ? <ActivityIndicator color={theme.primary} /> : null}
        </View>}
        ListEmptyComponent={!loading ? <ManagementEmptyState theme={theme} icon="users" label={t('admin_no_users')} /> : null}
        renderItem={({ item }) => <ManagementCard theme={theme} title={item.name || item.email} subtitle={item.name ? item.email : null} icon="user-shield"
          badge={<StatusBadge compact label={getEstadoLabel(item)} flag={getEstadoFlag(item)} />}
          actions={<AppButton testID={`admin-status-${item.id}`} label={t(item?.status?.slug === 'active' ? 'account_020' : 'account_021')} {...secondary} textColor={item?.status?.slug === 'active' ? theme.alert : theme.primary} disabled={changingUser !== null || loading} onPress={() => changeStatus(item.id, item?.status?.slug === 'active' ? 'suspended' : 'active')} style={styles.action} />} />}
      /> : null}

      {section === 'bitacora' ? <FlatList testID="admin-audit-list" alwaysBounceVertical
        refreshControl={<PullToRefreshControl theme={theme} {...auditRefresh} disabled={bitacoraLoading} />}
        data={filteredBitacoraItems}
        keyExtractor={(item, index) => `${item?.id ?? 'no-id'}-${item?.requestId ?? index}`}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View style={styles.stack}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.textPrimary }]}>{t('submenu_002')}</Text>
          <PaperFormInput theme={theme} testID="audit-search" value={bitacoraSearch} onChangeText={setBitacoraSearch} label={t('admin_audit_search')} autoCapitalize="none" />
          <View style={styles.dateRow}>
            <View style={styles.dateField}><PaperDateInput theme={theme} testID="audit-from" label={t('admin_from')} value={bitacoraStartDate} onChangeDate={setBitacoraStartDate} /></View>
            <View style={styles.dateField}><PaperDateInput theme={theme} testID="audit-to" label={t('admin_to')} value={bitacoraEndDate} onChangeDate={setBitacoraEndDate} /></View>
          </View>
          {bitacoraStartDate || bitacoraEndDate ? <View style={styles.actions}><IconTextButton theme={theme} icon="xmark" label={t('admin_clear_dates')} variant="outlined" borderColor={theme.buttonSecondaryBorder} onPress={() => { setBitacoraStartDate(''); setBitacoraEndDate(''); }} /></View> : null}
          <SelectableChipGroup testID="audit-result-filter" theme={theme} variant="outlined" options={[{ value: 'all', label: t('resource_006') }, { value: 'success', label: t('admin_success') }, { value: 'fail', label: t('admin_failure') }]} value={bitacoraResultado} onChange={setBitacoraResultado} />
          {bitacoraLoading && !auditRefresh.refreshing ? <ActivityIndicator color={theme.primary} /> : null}
        </View>}
        ListEmptyComponent={!bitacoraLoading ? <ManagementEmptyState theme={theme} icon="clipboard-list" label={t('admin_no_records')} /> : null}
        ListFooterComponent={bitacoraHasMore ? <AppButton label={t('admin_more')} {...secondary} disabled={bitacoraLoading} onPress={() => loadBitacora(bitacoraPage + 1, true)} /> : null}
        renderItem={({ item }) => <ManagementCard theme={theme} title={item.accion || t('admin_activity')} subtitle={formatDate(item.createdAt)} icon={item.resultado === 'success' ? 'circle-check' : 'circle-exclamation'}
          badge={<StatusBadge compact label={item.resultado === 'success' ? t('admin_success') : item.resultado === 'fail' ? t('admin_failure') : item.resultado || '—'} flag={item.resultado === 'success' ? 'success' : item.resultado === 'fail' ? 'error' : 'info'} />}
          actions={<IconTextButton testID={`audit-open-${item.id}`} theme={theme} icon="arrow-right" label={t('admin_details')} order="text-first" variant="outlined" borderColor={theme.buttonSecondaryBorder} onPress={() => { setTechnicalVisible(false); setSelectedBitacora(item); }} />}>
          {item.mensaje ? <Text numberOfLines={2} style={[styles.body, { color: theme.textSecondary }]}>{item.mensaje}</Text> : null}
        </ManagementCard>}
      /> : null}

      <FormModal visible={createVisible} theme={theme} testID="admin-user-create" title={t('submenu_001')} onClose={closeCreate}
        overlay={<ToastViewport theme={theme} topOffset={tokens.spacing.xl * 3} />} actions={<>
          <AppButton {...secondary} label={t('common_cancel')} onPress={closeCreate} disabled={submitting} />
          <AppButton label={submitting ? t('auth_admin_creating') : t('auth_admin_create')} onPress={createAdmin} disabled={submitting || !name.trim() || !email.trim() || !password} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
        </>}>
        <PaperFormInput theme={theme} value={name} onChangeText={setName} label={t('auth_001')} editable={!submitting} />
        <PaperFormInput theme={theme} value={phone} onChangeText={setPhone} label={t('auth_002')} keyboardType="phone-pad" editable={!submitting} />
        <PaperFormInput theme={theme} value={email} onChangeText={setEmail} label={t('auth_003')} autoCapitalize="none" keyboardType="email-address" editable={!submitting} />
        <PaperFormInput theme={theme} value={password} onChangeText={setPassword} label={t('auth_temporary_password')} secureTextEntry autoCapitalize="none" editable={!submitting} />
      </FormModal>

      {selectedBitacora ? <FormModal theme={theme} testID="admin-audit-detail" title={t('admin_audit_detail')} onClose={() => setSelectedBitacora(null)}
        actions={<AppButton {...secondary} label={t('admin_close')} onPress={() => setSelectedBitacora(null)} />}>
        <InformationRow theme={theme} icon="bolt" label={t('admin_activity')} value={selectedBitacora.accion} />
        <InformationRow theme={theme} icon="clock" label={t('event_011')} value={formatDate(selectedBitacora.createdAt)} />
        <InformationRow theme={theme} icon="circle-info" label={t('admin_result')} value={selectedBitacora.resultado === 'success' ? t('admin_success') : selectedBitacora.resultado === 'fail' ? t('admin_failure') : selectedBitacora.resultado} />
        <InformationRow theme={theme} icon="comment" label={t('admin_message')} value={selectedBitacora.mensaje} last />
        <IconTextButton testID="audit-technical-toggle" theme={theme} icon={technicalVisible ? 'chevron-up' : 'chevron-down'} label={t('admin_technical')} variant="outlined" borderColor={theme.buttonSecondaryBorder} onPress={() => setTechnicalVisible(value => !value)} />
        {technicalVisible ? <Text testID="audit-technical-data" selectable style={[styles.body, { color: theme.textSecondary }]}>{JSON.stringify(selectedBitacora, null, 2)}</Text> : null}
      </FormModal> : null}
    </View>
  </ProtectedScreen>;
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: tokens.spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.md },
  list: { flexGrow: 1, gap: tokens.spacing.md, padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl },
  stack: { gap: tokens.spacing.md, minWidth: tokens.spacing.none },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  title: { fontSize: tokens.typography.heading, fontWeight: '700', flexShrink: 1, minWidth: tokens.spacing.none },
  feedback: { fontSize: tokens.typography.caption, paddingHorizontal: tokens.spacing.md },
  body: { fontSize: tokens.typography.caption },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: tokens.spacing.sm },
  action: { minWidth: tokens.spacing.none, maxWidth: '100%' },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  dateField: { flexGrow: 1, flexBasis: tokens.spacing.xl * 4, minWidth: tokens.spacing.none },
});
