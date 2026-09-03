import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { useAuth } from '../hooks/useAuth';
import { createAdminUserApi, listAdminUsersApi, listBitacoraApi, updateUserStatusApi } from '../services/api/admin';
import { ProtectedScreen } from '../components/ProtectedScreen';
import { ModalSafeArea } from '../design-system/components/ModalSafeArea';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { StatusBadge } from '../components/StatusBadge';
import { tokens } from '../design-system/tokens';
import { getTheme } from '../design-system/theme';
import { t } from '../i18n';

const SUB_SECTIONS = [
  { key: 'usuarios', label: t('submenu_000') },
  { key: 'crear', label: t('submenu_001') },
  { key: 'bitacora', label: t('submenu_002') },
];

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
  return userItem?.status?.name || t('status_003');
}

export function SuperAdminUsersScreen() {
  const { user } = useAuth();
  const mode = user?.themeMode || 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);
  const [section, setSection] = useState('usuarios');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
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
    setMessage('');
    try {
      const payload = await listAdminUsersApi();
      setUsers(Array.isArray(payload.users) ? payload.users : []);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar usuarios admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadUsers();
    }
  }, [isSuperAdmin]);

  const activate = async (id) => {
    try {
      await updateUserStatusApi(id, 'active');
      await loadUsers();
    } catch (err) {
      setError(err?.message || 'No se pudo activar usuario');
    }
  };

  const deactivate = async (id) => {
    try {
      await updateUserStatusApi(id, 'suspended');
      await loadUsers();
    } catch (err) {
      setError(err?.message || 'No se pudo desactivar usuario');
    }
  };

  const createAdmin = async () => {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const payload = await createAdminUserApi({ email, password, name, phone: phone || undefined });
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setMessage(`Usuario admin creado: ${payload?.user?.email || ''}`);
      await loadUsers();
      setSection('usuarios');
    } catch (err) {
      setError(err?.message || 'No se pudo crear usuario admin');
    } finally {
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
      setError(err?.message || 'No se pudo cargar bitacora');
    } finally {
      setBitacoraLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'bitacora') {
      loadBitacora(1, false);
    }
  }, [section, user?.id, bitacoraStartDate, bitacoraEndDate]); // eslint-disable-line react-hooks/exhaustive-deps

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
      const haystack = `${item?.accion || ''} ${item?.mensaje || ''} ${item?.httpPath || ''}`.toLowerCase();
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

  if (!isSuperAdmin) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: theme.textPrimary }}>No eres Super Admin.</Text>
      </View>
    );
  }

  return (
    <ProtectedScreen permission="users.view">
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <HorizontalSubMenu items={SUB_SECTIONS} selectedKey={section} onSelect={setSection} theme={theme} />

        {error ? <Text style={[styles.error, { color: theme.alert }]}>{error}</Text> : null}
        {message ? <Text style={[styles.ok, { color: theme.secondary }]}>{message}</Text> : null}

        {section === 'usuarios' ? (
          <View style={styles.contentWrap}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('submenu_000')}</Text>
            {loading ? <Text style={{ color: theme.textSecondary }}>Cargando...</Text> : null}
            <FlatList
              data={users}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.email, { color: theme.textPrimary }]}>{item.email}</Text>
                    <StatusBadge label={getEstadoLabel(item)} flag={getEstadoFlag(item)} />
                  </View>
                  <View style={styles.row}>
                    {item?.status?.slug === 'active' ? (
                      <Pressable style={[styles.actionButton, { backgroundColor: theme.alert }]} onPress={() => deactivate(item.id)}>
                        <Text style={[styles.actionText, { color: theme.buttonText }]}>Desactivar</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={[styles.actionButton, { backgroundColor: theme.primary }]} onPress={() => activate(item.id)}>
                        <Text style={[styles.actionText, { color: theme.buttonText }]}>Activar</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              )}
            />
          </View>
        ) : null}

        {section === 'crear' ? (
          <View style={styles.contentWrap}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Crear usuario admin</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t('auth_001')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
            />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={t('auth_002')}
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
            />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="correo@empresa.com"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Contrasena temporal"
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              style={[styles.input, { borderColor: theme.border, color: theme.textPrimary, backgroundColor: theme.surface }]}
            />
            <Pressable
              style={[styles.submitButton, { backgroundColor: theme.primary }]}
              onPress={createAdmin}
              disabled={submitting}
            >
              <Text style={[styles.actionText, { color: theme.buttonText }]}>
                {submitting ? 'Creando...' : 'Crear admin'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {section === 'bitacora' ? (
          <View style={styles.contentWrap}>
            <View style={styles.bitacoraHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Bitacora</Text>
              <Pressable style={[styles.refreshButton, { borderColor: theme.primary }]} onPress={() => loadBitacora(1, false)}>
                <Icon name="rotate-right" iconStyle="solid" size={15} color={theme.primary} />
              </Pressable>
            </View>
            <View style={[styles.filterWrap, { borderColor: theme.border, backgroundColor: theme.surface }]}>
              <TextInput
                value={bitacoraSearch}
                onChangeText={setBitacoraSearch}
                placeholder="Buscar por accion o mensaje"
                placeholderTextColor={theme.textSecondary}
                style={[styles.filterInput, { color: theme.textPrimary, borderColor: theme.border }]}
              />
              <View style={styles.filterRow}>
                <TextInput
                  value={bitacoraStartDate}
                  onChangeText={setBitacoraStartDate}
                  placeholder="Desde YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.filterInput, styles.halfInput, { color: theme.textPrimary, borderColor: theme.border }]}
                />
                <TextInput
                  value={bitacoraEndDate}
                  onChangeText={setBitacoraEndDate}
                  placeholder="Hasta YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.filterInput, styles.halfInput, { color: theme.textPrimary, borderColor: theme.border }]}
                />
              </View>
              <View style={styles.filterRow}>
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'success', label: 'Success' },
                  { key: 'fail', label: 'Fail' },
                ].map((opt) => {
                  const active = bitacoraResultado === opt.key;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => setBitacoraResultado(opt.key)}
                      style={[
                        styles.filterPill,
                        {
                          borderColor: active ? theme.primary : theme.border,
                          backgroundColor: active ? theme.primary : theme.surface,
                        },
                      ]}
                    >
                      <Text style={{ color: active ? theme.buttonText : theme.textPrimary, fontWeight: '700' }}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
            {bitacoraLoading ? <Text style={{ color: theme.textSecondary }}>Cargando...</Text> : null}
            <FlatList
              data={filteredBitacoraItems}
              keyExtractor={(item, index) => `${item?.id ?? 'no-id'}-${item?.requestId ?? `idx-${index}`}`}
              contentContainerStyle={styles.listContent}
              ListFooterComponent={
                bitacoraHasMore ? (
                  <Pressable
                    style={[styles.loadMoreButton, { borderColor: theme.primary }]}
                    onPress={() => loadBitacora(bitacoraPage + 1, true)}
                    disabled={bitacoraLoading}
                  >
                    <Text style={{ color: theme.primary, fontWeight: '700' }}>
                      {bitacoraLoading ? 'Cargando...' : 'Cargar mas'}
                    </Text>
                  </Pressable>
                ) : null
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => setSelectedBitacora(item)}
                  style={[styles.card, { borderColor: theme.border, backgroundColor: theme.surface }]}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={[styles.email, { color: theme.textPrimary }]} numberOfLines={1}>
                      {item.accion || 'dicc_undefined'}
                    </Text>
                    <StatusBadge label={item.resultado || 'info'} flag={item.resultado === 'success' ? 'success' : 'error'} />
                  </View>
                  <Text style={{ color: theme.textSecondary }} numberOfLines={2}>
                    {item.mensaje || 'dicc_undefined'}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                    {formatDate(item.createdAt)}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        <Modal
          visible={Boolean(selectedBitacora)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedBitacora(null)}
        >
          <ModalSafeArea style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.cardTopRow}>
                <Text style={[styles.sectionTitle, { color: theme.textPrimary, fontSize: 18 }]}>Detalle bitacora</Text>
                <Pressable onPress={() => setSelectedBitacora(null)}>
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>Cerrar</Text>
                </Pressable>
              </View>
              <ScrollView style={styles.modalBody}>
                {selectedBitacora ? (
                  <Text style={{ color: theme.textPrimary }}>
                    {JSON.stringify(selectedBitacora, null, 2)}
                  </Text>
                ) : null}
              </ScrollView>
            </View>
          </ModalSafeArea>
        </Modal>
      </View>
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: tokens.spacing.sm },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contentWrap: { flex: 1, paddingHorizontal: tokens.spacing.md, gap: tokens.spacing.sm },
  sectionTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
  error: { fontSize: tokens.typography.caption, paddingHorizontal: tokens.spacing.md },
  ok: { fontSize: tokens.typography.caption, paddingHorizontal: tokens.spacing.md, fontWeight: '700' },
  listContent: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.lg },
  card: { borderWidth: 1, borderRadius: tokens.radius.md, padding: tokens.spacing.sm, gap: tokens.spacing.xs },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: tokens.spacing.sm },
  email: { fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  actionButton: { paddingHorizontal: tokens.spacing.sm, paddingVertical: tokens.spacing.xs, borderRadius: tokens.radius.sm },
  actionText: { fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.body,
  },
  submitButton: {
    borderRadius: tokens.radius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    marginTop: tokens.spacing.xs,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '80%',
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    borderWidth: 1,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  modalBody: {
    maxHeight: 420,
  },
  bitacoraHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  refreshButton: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterWrap: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    fontSize: tokens.typography.caption,
  },
  filterRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  halfInput: {
    flex: 1,
  },
  filterPill: {
    borderWidth: 1,
    borderRadius: tokens.radius.pill,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xxs,
  },
  loadMoreButton: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
});
