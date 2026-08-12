import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { EventListCard } from '../components/EventListCard';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { listAccountsApi } from '../services/api/accounts';
import {
  createAccountLibraryAssetApi,
  createEventApi,
  createEventResourceApi,
  getEventDetailApi,
  listAccountLibraryApi,
  listEventResourcesApi,
  listEventsApi,
  listEventTypesApi,
  prepareAccountLibraryUploadApi,
  updateEventApi,
  updateEventBrandingApi,
  updateEventResourceApi,
} from '../services/api/events';

const EVENT_STATUS = ['draft', 'active', 'archived'];
const RESOURCE_PURPOSES = ['frame', 'overlay', 'intro', 'outro', 'music', 'logo', 'background', 'template', 'branding', 'other'];

function normalizeEvent(item) {
  if (!item) return null;
  return {
    id: String(item.id || ''),
    accountId: String(item.accountId || ''),
    name: String(item.name || ''),
    slug: String(item.slug || ''),
    eventDate: String(item.startDate || item.eventDate || ''),
    startDate: String(item.startDate || item.eventDate || ''),
    endDate: String(item.endDate || ''),
    status: String(item.status || 'draft'),
    timezone: String(item.timezone || 'America/Bogota'),
    description: String(item.description || ''),
    branding: {
      logoResourceId: String(item.branding?.logoResourceId || ''),
      backgroundResourceId: String(item.branding?.backgroundResourceId || ''),
      phone: String(item.branding?.phone || ''),
      primaryColor: String(item.branding?.primaryColor || ''),
      interval: String(item.branding?.interval || ''),
      maxEvents: item.branding?.maxEvents == null ? '' : String(item.branding.maxEvents),
      maxStorageGb: item.branding?.maxStorageGb == null ? '' : String(item.branding.maxStorageGb),
      maxDevices: item.branding?.maxDevices == null ? '' : String(item.branding.maxDevices),
    },
    modes: Array.isArray(item.modes) ? item.modes : [],
  };
}

function normalizeLibraryEntry(item) {
  const asset = item?.asset || item;
  return {
    id: String(item?.id || asset?.id || ''),
    libraryAssetId: String(item?.libraryAssetId || asset?.id || ''),
    name: String(item?.displayName || asset?.name || ''),
    type: String(asset?.type || ''),
    fileUrl: String(asset?.fileUrl || ''),
    ownerType: String(asset?.ownerType || ''),
    asset,
  };
}

function normalizeResource(item) {
  return {
    id: String(item.id || ''),
    libraryAssetId: String(item.libraryAssetId || ''),
    purpose: String(item.purpose || ''),
    placement: String(item.placement || ''),
    orderIndex: Number(item.orderIndex || 0),
    isActive: Boolean(item.isActive ?? true),
    asset: item.asset || null,
  };
}

function isValidDateYmd(value) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
}

function activeAccountRole(user, accountId) {
  const membership = (user?.accounts || []).find((item) => String(item.account?.id) === String(accountId));
  return membership?.status === 'active' ? membership?.role?.slug : null;
}

export function EventsScreen({
  initialSection = 'list',
  allowedSections = ['list', 'create', 'detail', 'branding', 'resources'],
  showKpi = true,
  onHeaderChange = null,
}) {
  const { user } = useAuth();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const normalizedSections = allowedSections.filter((key) => ['list', 'create', 'detail', 'branding', 'resources', 'overlays'].includes(key)).map((key) => (key === 'overlays' ? 'resources' : key));
  const [section, setSection] = useState(normalizedSections.includes(initialSection) ? initialSection : normalizedSections[0] || 'list');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [modes, setModes] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [library, setLibrary] = useState([]);
  const [resources, setResources] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [eventForm, setEventForm] = useState({ name: '', slug: '', startDate: '', endDate: '', status: 'draft', timezone: 'America/Bogota', description: '', modeSlugs: ['foto'] });
  const [brandingForm, setBrandingForm] = useState({ logoResourceId: '', backgroundResourceId: '', phone: '', primaryColor: '', interval: '', maxEvents: '', maxStorageGb: '', maxDevices: '' });
  const [libraryForm, setLibraryForm] = useState({ name: '', purpose: 'overlay', key: '', fileUrl: '', mimeType: 'image/png', sizeBytes: '1' });
  const [resourceForm, setResourceForm] = useState({ libraryAssetId: '', purpose: 'overlay', placement: '', orderIndex: '0', isActive: true });

  const roleSlug = activeAccountRole(user, accountId);
  const canEdit = isSuperAdmin || ['owner', 'admin'].includes(roleSlug);
  const eventMenu = [
    { key: 'list', label: t('event_000') },
    { key: 'create', label: t('event_001') },
    { key: 'detail', label: t('event_002') },
    { key: 'branding', label: t('event_003') },
    { key: 'resources', label: 'Recursos' },
  ].filter((item) => normalizedSections.includes(item.key));

  const stats = useMemo(() => ({
    active: events.filter((event) => event.status === 'active').length,
    draft: events.filter((event) => event.status === 'draft').length,
    archived: events.filter((event) => event.status === 'archived').length,
  }), [events]);

  const clearMessages = () => { setError(''); setOk(''); };

  const loadAccounts = useCallback(async () => {
    try {
      const payload = await listAccountsApi();
      const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];
      setAccounts(rows);
      setAccountId((current) => current || String(rows[0]?.id || ''));
    } catch (err) { setError(err?.message || t('account_006')); }
  }, []);

  const loadModes = useCallback(async () => {
    try {
      const payload = await listEventTypesApi();
      const rows = Array.isArray(payload?.modes) ? payload.modes : Array.isArray(payload?.types) ? payload.types : [];
      setModes(rows);
      const defaults = rows.filter((mode) => mode.isDefault).map((mode) => mode.slug);
      if (defaults.length) setEventForm((prev) => ({ ...prev, modeSlugs: defaults }));
    } catch (err) { setError(err?.message || 'No se pudieron cargar modos'); }
  }, []);

  const loadEvents = useCallback(async () => {
    if (!accountId) return;
    setLoading(true); clearMessages();
    try {
      const payload = await listEventsApi(accountId);
      const normalized = (payload?.events || []).map(normalizeEvent).filter(Boolean);
      setEvents(normalized);
      if (!selectedEventId && normalized[0]?.id) setSelectedEventId(normalized[0].id);
    } catch (err) { setError(err?.message || t('event_040')); }
    finally { setLoading(false); }
  }, [accountId, selectedEventId]);

  const loadEventDetail = useCallback(async (eventId) => {
    if (!eventId) return;
    try {
      const payload = await getEventDetailApi(eventId);
      const event = normalizeEvent(payload?.event || payload);
      setSelectedEvent(event);
      setEventForm({
        name: event?.name || '', slug: event?.slug || '', startDate: event?.startDate || '', endDate: event?.endDate || '',
        status: event?.status || 'draft', timezone: event?.timezone || 'America/Bogota', description: event?.description || '',
        modeSlugs: event?.modes?.map((item) => item.mode?.slug).filter(Boolean) || ['foto'],
      });
      setBrandingForm(event?.branding || brandingForm);
    } catch (err) { setError(err?.message || t('event_041')); }
  }, [brandingForm]);

  const loadLibraryAndResources = useCallback(async (eventId) => {
    if (!accountId) return;
    try {
      const [libraryPayload, resourcePayload] = await Promise.all([
        listAccountLibraryApi(accountId),
        eventId ? listEventResourcesApi(eventId) : Promise.resolve({ resources: [] }),
      ]);
      const normalizedLibrary = (libraryPayload?.library || []).map(normalizeLibraryEntry);
      setLibrary(normalizedLibrary);
      setResources((resourcePayload?.resources || []).map(normalizeResource));
      if (!resourceForm.libraryAssetId && normalizedLibrary[0]?.libraryAssetId) setResourceForm((prev) => ({ ...prev, libraryAssetId: normalizedLibrary[0].libraryAssetId }));
    } catch (err) { setError(err?.message || t('event_042')); }
  }, [accountId, resourceForm.libraryAssetId]);

  useEffect(() => { loadAccounts(); loadModes(); }, [loadAccounts, loadModes]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => {
    if (selectedEventId && ['detail', 'branding', 'resources'].includes(section)) loadEventDetail(selectedEventId);
    if (['branding', 'resources'].includes(section)) loadLibraryAndResources(selectedEventId);
  }, [loadEventDetail, loadLibraryAndResources, section, selectedEventId]);

  useEffect(() => {
    if (!onHeaderChange) return;
    onHeaderChange({ title: selectedEvent?.name || t('menu_002'), subtitle: selectedEvent?.startDate || '', iconName: selectedEvent ? 'calendar-check' : 'champagne-glasses', onBack: null, backLabel: 'Volver al listado' });
  }, [onHeaderChange, selectedEvent]);

  const validateEvent = () => {
    if (!accountId) return 'Selecciona una cuenta';
    if (!String(eventForm.name || '').trim()) return t('event_050');
    if (!isValidDateYmd(eventForm.startDate) || !isValidDateYmd(eventForm.endDate)) return 'Las fechas deben usar YYYY-MM-DD';
    if (!EVENT_STATUS.includes(eventForm.status)) return `Estado invalido: ${EVENT_STATUS.join(', ')}`;
    return '';
  };

  const onCreateEvent = async () => {
    const validation = validateEvent();
    if (validation) { setError(validation); return; }
    if (!canEdit) { setError(t('event_060')); return; }
    setSaving(true); clearMessages();
    try {
      const payload = await createEventApi(accountId, eventForm);
      const event = normalizeEvent(payload?.event || payload);
      setOk(t('event_061'));
      await loadEvents();
      if (event?.id) { setSelectedEventId(event.id); setSection('detail'); }
    } catch (err) { setError(err?.message || t('event_062')); }
    finally { setSaving(false); }
  };

  const onUpdateEvent = async () => {
    const validation = validateEvent();
    if (validation) { setError(validation); return; }
    if (!selectedEventId || !canEdit) { setError(t('event_060')); return; }
    setSaving(true); clearMessages();
    try { await updateEventApi(selectedEventId, eventForm); setOk(t('event_063')); await loadEvents(); await loadEventDetail(selectedEventId); }
    catch (err) { setError(err?.message || t('event_064')); }
    finally { setSaving(false); }
  };

  const onPrepareLibraryUpload = async () => {
    if (!accountId || !canEdit) return;
    setSaving(true); clearMessages();
    try {
      const payload = await prepareAccountLibraryUploadApi(accountId, { purpose: libraryForm.purpose, fileName: `${libraryForm.purpose}.png`, contentType: libraryForm.mimeType, sizeBytes: Number(libraryForm.sizeBytes || 1) });
      setLibraryForm((prev) => ({ ...prev, key: payload.key, fileUrl: payload.fileUrl }));
      setOk('Upload R2 preparado para biblioteca');
    } catch (err) { setError(err?.message || 'No se pudo preparar upload'); }
    finally { setSaving(false); }
  };

  const onCreateLibraryAsset = async () => {
    if (!accountId || !canEdit) { setError(t('event_060')); return; }
    setSaving(true); clearMessages();
    try {
      await createAccountLibraryAssetApi(accountId, { ...libraryForm, type: libraryForm.purpose, sizeBytes: Number(libraryForm.sizeBytes || 1) });
      setLibraryForm({ name: '', purpose: 'overlay', key: '', fileUrl: '', mimeType: 'image/png', sizeBytes: '1' });
      setOk('Recurso agregado a biblioteca');
      await loadLibraryAndResources(selectedEventId);
    } catch (err) { setError(err?.message || 'No se pudo crear recurso'); }
    finally { setSaving(false); }
  };

  const onCreateResource = async () => {
    if (!selectedEventId || !canEdit) { setError(t('event_060')); return; }
    setSaving(true); clearMessages();
    try {
      await createEventResourceApi(selectedEventId, { ...resourceForm, orderIndex: Number(resourceForm.orderIndex || 0) });
      setResourceForm((prev) => ({ ...prev, placement: '', orderIndex: '0', isActive: true }));
      setOk('Recurso asignado al evento');
      await loadLibraryAndResources(selectedEventId);
    } catch (err) { setError(err?.message || 'No se pudo asignar recurso'); }
    finally { setSaving(false); }
  };

  const onSaveBranding = async () => {
    if (!selectedEventId || !canEdit) { setError(t('event_060')); return; }
    setSaving(true); clearMessages();
    try { await updateEventBrandingApi(selectedEventId, brandingForm); setOk(t('event_065')); await loadEventDetail(selectedEventId); }
    catch (err) { setError(err?.message || t('event_066')); }
    finally { setSaving(false); }
  };

  const moveResource = async (item, direction) => {
    const ordered = [...resources].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = ordered.findIndex((resource) => resource.id === item.id);
    const target = ordered[index + direction];
    if (!target) return;
    setSaving(true);
    try {
      await updateEventResourceApi(selectedEventId, item.id, { orderIndex: target.orderIndex });
      await updateEventResourceApi(selectedEventId, target.id, { orderIndex: item.orderIndex });
      await loadLibraryAndResources(selectedEventId);
    } catch (err) { setError(err?.message || t('event_070')); }
    finally { setSaving(false); }
  };

  const selectedAccount = accounts.find((account) => String(account.id) === String(accountId));

  const renderInput = (label, value, onChangeText, props = {}) => (
    <>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={label} placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]} editable={props.editable ?? canEdit} {...props} />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HorizontalSubMenu items={eventMenu} selectedKey={section} onSelect={setSection} theme={theme} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Cuenta</Text>
          <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
            <Picker selectedValue={accountId} onValueChange={(value) => setAccountId(String(value || ''))} style={{ color: theme.textPrimary }}>
              {accounts.map((account) => <Picker.Item key={account.id} label={account.name} value={String(account.id)} />)}
            </Picker>
          </View>
          <Text style={[styles.helper, { color: theme.textSecondary }]}>{selectedAccount?.slug || '-'} · {isSuperAdmin ? 'super_admin' : roleSlug || '-'}</Text>
        </SurfaceCard>

        {error ? <Text style={[styles.feedback, { color: theme.alert }]}>{error}</Text> : null}
        {ok ? <Text style={[styles.feedback, { color: theme.secondary }]}>{ok}</Text> : null}
        {saving || loading ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('event_020')}</Text> : null}

        {section === 'list' ? (
          <View style={styles.sectionWrap}>
            {showKpi ? <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}><View style={styles.kpiRow}><Text style={[styles.kpiText, { color: theme.textPrimary }]}>Activos {stats.active}</Text><Text style={[styles.kpiText, { color: theme.textPrimary }]}>Draft {stats.draft}</Text><Text style={[styles.kpiText, { color: theme.textPrimary }]}>Archivados {stats.archived}</Text></View></SurfaceCard> : null}
            {events.length === 0 ? <Text style={{ color: theme.textSecondary }}>{t('event_022')}</Text> : null}
            <FlatList data={events} keyExtractor={(item) => item.id} scrollEnabled={false} contentContainerStyle={styles.listContent} renderItem={({ item }) => <EventListCard item={item} selected={item.id === selectedEventId} theme={theme} onPress={() => { setSelectedEventId(item.id); setSelectedEvent(item); setSection('detail'); }} />} />
          </View>
        ) : null}

        {section === 'create' || section === 'detail' ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{section === 'create' ? t('event_001') : `${t('event_002')}: ${selectedEvent?.name || ''}`}</Text>
            {renderInput(t('event_071'), eventForm.name, (name) => setEventForm((prev) => ({ ...prev, name })))}
            {renderInput(t('event_072'), eventForm.slug, (slug) => setEventForm((prev) => ({ ...prev, slug })))}
            {renderInput('Fecha inicio (YYYY-MM-DD)', eventForm.startDate, (startDate) => setEventForm((prev) => ({ ...prev, startDate })))}
            {renderInput('Fecha fin (YYYY-MM-DD)', eventForm.endDate, (endDate) => setEventForm((prev) => ({ ...prev, endDate })))}
            {renderInput('Timezone', eventForm.timezone, (timezone) => setEventForm((prev) => ({ ...prev, timezone })))}
            {renderInput(t('event_075'), eventForm.description, (description) => setEventForm((prev) => ({ ...prev, description })), { multiline: true, style: [styles.input, styles.multiline, { color: theme.textPrimary, borderColor: theme.border }] })}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_010')}</Text>
            <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
              <Picker selectedValue={eventForm.status} onValueChange={(status) => setEventForm((prev) => ({ ...prev, status }))} style={{ color: theme.textPrimary }} enabled={canEdit}>
                {EVENT_STATUS.map((status) => <Picker.Item key={status} label={status} value={status} />)}
              </Picker>
            </View>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Modos</Text>
            {modes.map((modeItem) => {
              const active = eventForm.modeSlugs.includes(modeItem.slug);
              return <Pressable key={modeItem.slug} style={styles.switchRow} onPress={() => setEventForm((prev) => ({ ...prev, modeSlugs: active ? prev.modeSlugs.filter((slug) => slug !== modeItem.slug) : [...prev.modeSlugs, modeItem.slug] }))}><Text style={{ color: theme.textPrimary }}>{modeItem.name}</Text><Switch value={active} disabled={!canEdit || section === 'detail'} /></Pressable>;
            })}
            <AppButton label={section === 'create' ? t('event_076') : t('event_077')} onPress={section === 'create' ? onCreateEvent : onUpdateEvent} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
          </SurfaceCard>
        ) : null}

        {section === 'branding' ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_003')}: {selectedEvent?.name || '-'}</Text>
            {renderInput('Logo resource ID', brandingForm.logoResourceId, (logoResourceId) => setBrandingForm((prev) => ({ ...prev, logoResourceId })))}
            {renderInput('Background resource ID', brandingForm.backgroundResourceId, (backgroundResourceId) => setBrandingForm((prev) => ({ ...prev, backgroundResourceId })))}
            {renderInput(t('event_074'), brandingForm.phone, (phone) => setBrandingForm((prev) => ({ ...prev, phone })))}
            {renderInput(t('event_080'), brandingForm.primaryColor, (primaryColor) => setBrandingForm((prev) => ({ ...prev, primaryColor })))}
            {renderInput('Intervalo', brandingForm.interval, (interval) => setBrandingForm((prev) => ({ ...prev, interval })))}
            {renderInput('Max eventos', String(brandingForm.maxEvents || ''), (maxEvents) => setBrandingForm((prev) => ({ ...prev, maxEvents })), { keyboardType: 'number-pad' })}
            {renderInput('Max GB', String(brandingForm.maxStorageGb || ''), (maxStorageGb) => setBrandingForm((prev) => ({ ...prev, maxStorageGb })), { keyboardType: 'number-pad' })}
            {renderInput('Max dispositivos', String(brandingForm.maxDevices || ''), (maxDevices) => setBrandingForm((prev) => ({ ...prev, maxDevices })), { keyboardType: 'number-pad' })}
            <AppButton label={t('event_083')} onPress={onSaveBranding} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
          </SurfaceCard>
        ) : null}

        {section === 'resources' ? (
          <View style={styles.sectionWrap}>
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Biblioteca de cuenta</Text>
              {renderInput('Nombre recurso', libraryForm.name, (name) => setLibraryForm((prev) => ({ ...prev, name })))}
              <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                <Picker selectedValue={libraryForm.purpose} onValueChange={(purpose) => setLibraryForm((prev) => ({ ...prev, purpose }))} style={{ color: theme.textPrimary }}>
                  {RESOURCE_PURPOSES.map((purpose) => <Picker.Item key={purpose} label={purpose} value={purpose} />)}
                </Picker>
              </View>
              {renderInput('R2 key', libraryForm.key, (key) => setLibraryForm((prev) => ({ ...prev, key })))}
              {renderInput('File URL', libraryForm.fileUrl, (fileUrl) => setLibraryForm((prev) => ({ ...prev, fileUrl })))}
              <AppButton label="Preparar upload R2" onPress={onPrepareLibraryUpload} backgroundColor={theme.primary} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
              <AppButton label="Crear recurso en biblioteca" onPress={onCreateLibraryAsset} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
            </SurfaceCard>

            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Asignar recurso al evento</Text>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Recurso</Text>
              <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                <Picker selectedValue={resourceForm.libraryAssetId} onValueChange={(libraryAssetId) => setResourceForm((prev) => ({ ...prev, libraryAssetId }))} style={{ color: theme.textPrimary }}>
                  {library.map((item) => <Picker.Item key={item.libraryAssetId} label={`${item.name} · ${item.type}`} value={item.libraryAssetId} />)}
                </Picker>
              </View>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Propósito</Text>
              <View style={[styles.pickerWrap, { borderColor: theme.border }]}>
                <Picker selectedValue={resourceForm.purpose} onValueChange={(purpose) => setResourceForm((prev) => ({ ...prev, purpose }))} style={{ color: theme.textPrimary }}>
                  {RESOURCE_PURPOSES.map((purpose) => <Picker.Item key={purpose} label={purpose} value={purpose} />)}
                </Picker>
              </View>
              {renderInput('Placement', resourceForm.placement, (placement) => setResourceForm((prev) => ({ ...prev, placement })))}
              {renderInput('Orden', resourceForm.orderIndex, (orderIndex) => setResourceForm((prev) => ({ ...prev, orderIndex })), { keyboardType: 'number-pad' })}
              <View style={styles.switchRow}>
                <Text style={{ color: theme.textPrimary }}>{t('event_088')}</Text>
                <Switch value={resourceForm.isActive} onValueChange={(isActive) => setResourceForm((prev) => ({ ...prev, isActive }))} />
              </View>
              <AppButton label="Asignar recurso" onPress={onCreateResource} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
            </SurfaceCard>

            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Biblioteca disponible</Text>
            {library.map((item) => (
              <SurfaceCard key={`library-${item.id}`} surfaceColor={theme.surface} borderColor={theme.border}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.name} · {item.type}</Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>owner: {item.ownerType}</Text>
                <Text numberOfLines={1} style={[styles.cardMeta, { color: theme.textSecondary }]}>{item.fileUrl}</Text>
              </SurfaceCard>
            ))}

            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Recursos del evento</Text>
            {resources.map((item) => (
              <SurfaceCard key={`resource-${item.id}`} surfaceColor={theme.surface} borderColor={theme.border}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>{item.asset?.name || item.libraryAssetId} · {item.purpose}</Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>orden: {item.orderIndex} · activo: {item.isActive ? 'si' : 'no'}</Text>
                <Text numberOfLines={1} style={[styles.cardMeta, { color: theme.textSecondary }]}>{item.asset?.fileUrl || '-'}</Text>
                <View style={styles.row}>
                  <AppButton label={t('event_093')} onPress={() => moveResource(item, -1)} backgroundColor={theme.primary} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.smallButton} />
                  <AppButton label={t('event_094')} onPress={() => moveResource(item, 1)} backgroundColor={theme.primary} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.smallButton} />
                </View>
              </SurfaceCard>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  sectionWrap: { gap: tokens.spacing.sm },
  sectionTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
  fieldLabel: { fontSize: tokens.typography.caption, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: tokens.radius.sm, padding: tokens.spacing.xs, fontSize: tokens.typography.body },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  pickerWrap: { borderWidth: 1, borderRadius: tokens.radius.sm, overflow: 'hidden' },
  helper: { fontSize: tokens.typography.caption },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },
  listContent: { gap: tokens.spacing.sm },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', gap: tokens.spacing.xs },
  kpiText: { fontSize: tokens.typography.caption, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  cardTitle: { fontSize: tokens.typography.body, fontWeight: '700' },
  cardMeta: { fontSize: tokens.typography.caption },
  row: { flexDirection: 'row', gap: tokens.spacing.xs },
  smallButton: { flex: 1 },
});
