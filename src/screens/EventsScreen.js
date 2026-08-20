import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { AccountLogoPreview } from '../components/AccountLogoPreview';
import { EventHeroHeader } from '../components/EventHeroHeader';
import { EventListCard } from '../components/EventListCard';
import { IconTextButton } from '../components/IconTextButton';
import { PaperDateInput } from '../components/PaperDateInput';
import { PaperFormInput } from '../components/PaperFormInput';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { useToast } from '../providers/ToastProvider';
import { listAccountsApi } from '../services/api/accounts';
import {
  createAccountLibraryAssetApi,
  createEventApi,
  createEventResourceApi,
  getEventDetailApi,
  listAccountLibraryApi,
  listEventResourcesApi,
  listEventsApi,
  listEventModesApi,
  listEventTypesApi,
  prepareAccountLibraryUploadApi,
  updateEventBrandingApi,
  updateEventResourceApi,
} from '../services/api/events';

const RESOURCE_PURPOSES = ['frame', 'overlay', 'intro', 'outro', 'music', 'logo', 'background', 'template', 'branding', 'other'];
const MENU_BAR_HEIGHT = tokens.spacing.xl + tokens.spacing.xs + tokens.spacing.xxs / 2;
const EMPTY_EVENT_FORM = { name: '', eventTypeSlug: '', startDate: '', status: 'draft', timezone: 'America/Bogota', description: '', modeSlugs: [] };

function normalizeEvent(item) {
  if (!item) return null;
  return {
    id: String(item.id || ''),
    accountId: String(item.accountId || ''),
    name: String(item.name || ''),
    slug: String(item.slug || ''),
    eventTypeId: String(item.eventTypeId || ''),
    eventType: item.eventType || null,
    eventTypeSlug: String(item.eventType?.slug || ''),
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

function accountLogoPreviewUrl(account) {
  return account?.logoAsset?.variants?.thumb?.fileUrl || account?.logoAsset?.previewUrl || account?.logoAsset?.fileUrl || '';
}

function resourcePreviewUrl(resource) {
  const asset = resource?.asset;
  return asset?.variants?.card?.fileUrl || asset?.variants?.full?.fileUrl || asset?.fileUrl || '';
}

function isValidDateYmd(value) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
}

function isValidTimezone(value) {
  return /^[A-Za-z_]+\/[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)?$|^UTC$/.test(String(value || '').trim());
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
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const normalizedSections = allowedSections.filter((key) => ['list', 'create', 'detail', 'branding', 'resources', 'overlays'].includes(key)).map((key) => (key === 'overlays' ? 'resources' : key));
  const [section, setSection] = useState(normalizedSections.includes(initialSection) ? initialSection : normalizedSections[0] || 'list');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [isAccountModalVisible, setAccountModalVisible] = useState(false);
  const [eventTypes, setEventTypes] = useState([]);
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
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [eventFormErrors, setEventFormErrors] = useState({});
  const [brandingForm, setBrandingForm] = useState({ logoResourceId: '', backgroundResourceId: '', phone: '', primaryColor: '', interval: '', maxEvents: '', maxStorageGb: '', maxDevices: '' });
  const [libraryForm, setLibraryForm] = useState({ name: '', purpose: 'overlay', key: '', fileUrl: '', mimeType: 'image/png', sizeBytes: '1' });
  const [resourceForm, setResourceForm] = useState({ libraryAssetId: '', purpose: 'overlay', placement: '', orderIndex: '0', isActive: true });

  const roleSlug = activeAccountRole(user, accountId);
  const canEdit = isSuperAdmin || ['owner', 'admin'].includes(roleSlug);
  const eventMenu = [
    { key: 'list', label: t('event_000') },
    { key: 'create', label: t('event_001') },
    { key: 'branding', label: t('event_003') },
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
      setAccountId((current) => {
        if (rows.some((account) => String(account.id) === String(current))) return current;
        return String(rows[0]?.id || '');
      });
    } catch (err) { setError(err?.message || t('account_006')); }
  }, []);

  const loadEventTypes = useCallback(async () => {
    try {
      const payload = await listEventTypesApi();
      const rows = Array.isArray(payload?.types) ? payload.types : [];
      setEventTypes(rows.filter((item) => item.isActive !== false));
    } catch (err) { setError(err?.message || t('event_105')); }
  }, []);

  const loadModes = useCallback(async () => {
    try {
      const payload = await listEventModesApi();
      const rows = Array.isArray(payload?.modes) ? payload.modes : [];
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
        name: event?.name || '', eventTypeSlug: event?.eventTypeSlug || '', startDate: event?.startDate || '',
        status: event?.status || 'draft', timezone: event?.timezone || 'America/Bogota', description: event?.description || '',
        modeSlugs: event?.modes?.map((item) => item.mode?.slug).filter(Boolean) || [],
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

  useEffect(() => { loadAccounts(); loadEventTypes(); loadModes(); }, [loadAccounts, loadEventTypes, loadModes]);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  useEffect(() => {
    if (selectedEventId && ['detail', 'branding', 'resources'].includes(section)) loadEventDetail(selectedEventId);
    if (['branding', 'resources'].includes(section)) loadLibraryAndResources(selectedEventId);
  }, [loadEventDetail, loadLibraryAndResources, section, selectedEventId]);

  useEffect(() => {
    if (!onHeaderChange) return;
    if (section === 'resources') {
      onHeaderChange({ title: t('menu_004'), subtitle: selectedEvent?.name || '', iconName: 'images', onBack: null, backLabel: 'Volver' });
      return;
    }
    if (section === 'detail') {
      onHeaderChange({ title: t('event_002'), subtitle: selectedEvent?.name || '', iconName: 'calendar-check', onBack: () => setSection('list'), backLabel: t('event_109') });
      return;
    }
    onHeaderChange({ title: t('menu_002'), subtitle: '', iconName: 'champagne-glasses', onBack: null, backLabel: 'Volver' });
  }, [onHeaderChange, section, selectedEvent]);

  const clearEventFormError = (field) => {
    setEventFormErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const updateEventFormField = (field, value) => {
    clearEventFormError(field);
    setEventForm((current) => ({ ...current, [field]: value }));
  };

  const validateEvent = () => {
    const nextErrors = {};
    if (!accountId) nextErrors.accountId = t('event_097');
    if (!String(eventForm.eventTypeSlug || '').trim()) nextErrors.eventTypeSlug = t('event_106');
    if (!String(eventForm.name || '').trim()) nextErrors.name = t('event_050');
    if (!String(eventForm.startDate || '').trim()) nextErrors.startDate = t('event_051');
    else if (!isValidDateYmd(eventForm.startDate)) nextErrors.startDate = t('event_098');
    if (!String(eventForm.timezone || '').trim()) nextErrors.timezone = t('event_099');
    else if (!isValidTimezone(eventForm.timezone)) nextErrors.timezone = t('event_100');
    setEventFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onCreateEvent = async () => {
    if (!validateEvent()) {
      setError(t('account_070'));
      showToast({ message: t('account_070'), type: 'error' });
      return;
    }
    if (!canEdit) { setError(t('event_060')); showToast({ message: t('event_060'), type: 'error' }); return; }
    setSaving(true); clearMessages();
    try {
      const payload = await createEventApi(accountId, { ...eventForm, status: 'draft', endDate: null });
      const event = normalizeEvent(payload?.event || payload);
      setOk(t('event_061'));
      setEventForm(EMPTY_EVENT_FORM);
      setEventFormErrors({});
      await loadEvents();
      if (event?.id) { setSelectedEventId(event.id); setSection('detail'); }
    } catch (err) {
      const message = err?.message || t('event_062');
      setError(message);
      showToast({ message, type: 'error' });
    }
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

  const selectAccount = (nextAccountId) => {
    setAccountId(String(nextAccountId || ''));
    setSelectedEventId('');
    setSelectedEvent(null);
    setEvents([]);
    setAccountModalVisible(false);
    setSection('list');
  };

  const renderInput = (label, value, onChangeText, props = {}) => (
    <PaperFormInput
      theme={theme}
      label={label}
      value={value}
      onChangeText={onChangeText}
      editable={props.editable ?? canEdit}
      multiline={Boolean(props.multiline)}
      keyboardType={props.keyboardType || 'default'}
      inputStyle={props.inputStyle || null}
    />
  );

  const renderEventInput = ({ testID, label, field, value, multiline = false, keyboardType = 'default', autoCapitalize = 'sentences' }) => (
    <PaperFormInput
      testID={testID}
      theme={theme}
      label={label}
      value={value}
      onChangeText={(text) => updateEventFormField(field, text)}
      errorText={eventFormErrors[field]}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      multiline={multiline}
      editable={canEdit}
    />
  );

  const renderAccountSelector = () => {
    if (accounts.length <= 1) return null;
    return (
      <View style={[styles.accountSelectorRow, { borderBottomColor: theme.border }]}>
        <AccountLogoPreview theme={theme} imageUri={accountLogoPreviewUrl(selectedAccount)} size="bar" borderless />
        <View style={styles.accountSelectorData}>
          <Text numberOfLines={1} style={[styles.accountSelectorName, { color: theme.textPrimary }]}>
            {selectedAccount?.name || '-'}
          </Text>
          <Text numberOfLines={1} style={[styles.helper, { color: theme.textSecondary }]}>
            {selectedAccount?.slug || '-'} - {isSuperAdmin ? 'super_admin' : roleSlug || '-'}
          </Text>
        </View>
        <IconTextButton
          theme={theme}
          label={t('event_095')}
          icon="shuffle"
          order="text-first"
          variant="ghost"
          onPress={() => setAccountModalVisible(true)}
          style={styles.changeAccountButton}
        />
      </View>
    );
  };

  const renderAccountModal = () => (
    <Modal visible={isAccountModalVisible} animationType="slide" transparent onRequestClose={() => setAccountModalVisible(false)}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_096')}</Text>
          <ScrollView contentContainerStyle={styles.modalList}>
            {accounts.map((account) => {
              const isSelected = String(account.id) === String(accountId);
              return (
                <Pressable key={account.id} onPress={() => selectAccount(account.id)} style={styles.pressableCard}>
                  <SurfaceCard surfaceColor={theme.surface} borderColor={isSelected ? theme.primary : theme.border}>
                    <View style={styles.accountOptionRow}>
                      <View style={styles.accountSelectorData}>
                        <Text numberOfLines={1} style={[styles.accountSelectorName, { color: theme.textPrimary }]}>
                          {account.name || '-'}
                        </Text>
                        <Text numberOfLines={1} style={[styles.helper, { color: theme.textSecondary }]}>
                          {account.slug || '-'}
                        </Text>
                      </View>
                      <AccountLogoPreview theme={theme} imageUri={accountLogoPreviewUrl(account)} size="md" />
                    </View>
                  </SurfaceCard>
                </Pressable>
              );
            })}
          </ScrollView>
          <AppButton
            label={t('account_028')}
            onPress={() => setAccountModalVisible(false)}
            backgroundColor={theme.surface}
            pressedColor={theme.surface}
            textColor={theme.textPrimary}
          />
        </View>
      </View>
    </Modal>
  );

  const renderEventTypePicker = () => (
    <>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_105')}</Text>
      <View style={[styles.pickerWrap, { borderColor: eventFormErrors.eventTypeSlug ? theme.alert : theme.border }]}>
        <Picker
          testID="event-type-picker"
          selectedValue={eventForm.eventTypeSlug}
          onValueChange={(eventTypeSlug) => updateEventFormField('eventTypeSlug', eventTypeSlug)}
          style={{ color: theme.textPrimary }}
          enabled={canEdit}
        >
          <Picker.Item label={t('event_107')} value="" />
          {eventTypes.map((type) => <Picker.Item key={type.slug} label={type.name} value={type.slug} />)}
        </Picker>
      </View>
      {eventFormErrors.eventTypeSlug ? <Text style={[styles.feedback, { color: theme.alert }]}>{eventFormErrors.eventTypeSlug}</Text> : null}
    </>
  );

  const renderEventDetail = () => {
    const event = selectedEvent;
    const branding = event?.branding || {};
    const logoUrl = resourcePreviewUrl(branding.logoResource);
    const backgroundUrl = resourcePreviewUrl(branding.backgroundResource);
    return (
      <View style={styles.sectionWrap}>
        <EventHeroHeader
          theme={theme}
          title={event?.name || t('event_002')}
          subtitle={event?.eventType?.name || event?.eventDate || ''}
          backgroundImageUrl={backgroundUrl}
          logoImageUrl={logoUrl}
        />
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_108')}</Text>
          <View style={styles.detailRows}>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{t('event_105')}: {event?.eventType?.name || '-'}</Text>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{t('event_073')}: {event?.eventDate || '-'}</Text>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{t('event_010')}: {event?.status || '-'}</Text>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{t('event_103')}: {event?.timezone || '-'}</Text>
            <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>Slug: {event?.slug || '-'}</Text>
            {event?.description ? <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>{event.description}</Text> : null}
          </View>
        </SurfaceCard>
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Modos</Text>
          {event?.modes?.length ? event.modes.map((item) => (
            <Text key={item.id || item.mode?.slug} style={[styles.cardMeta, { color: theme.textSecondary }]}>
              {item.mode?.name || item.mode?.slug || '-'}
            </Text>
          )) : <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>-</Text>}
        </SurfaceCard>
        {canEdit ? <AppButton label={t('event_003')} onPress={() => setSection('branding')} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /> : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {eventMenu.length > 1 ? <HorizontalSubMenu items={eventMenu} selectedKey={section} onSelect={setSection} theme={theme} /> : null}
      {renderAccountSelector()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {accounts.length === 0 ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>Aun no tienes cuentas. Crea una cuenta desde la seccion Cuenta para activar eventos.</Text> : null}
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

        {section === 'create' ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_001')}</Text>
            {eventFormErrors.accountId ? <Text style={[styles.feedback, { color: theme.alert }]}>{eventFormErrors.accountId}</Text> : null}
            {renderEventTypePicker()}
            {renderEventInput({ testID: 'event-name-input', label: t('event_071'), field: 'name', value: eventForm.name })}
            <PaperDateInput
              testID="event-date-input"
              theme={theme}
              label={t('event_073')}
              value={eventForm.startDate}
              errorText={eventFormErrors.startDate}
              disabled={!canEdit}
              helperLabel={t('event_104')}
              onChangeDate={(startDate) => updateEventFormField('startDate', startDate)}
            />
            {renderEventInput({ testID: 'event-timezone-input', label: t('event_103'), field: 'timezone', value: eventForm.timezone, autoCapitalize: 'none' })}
            {renderEventInput({ testID: 'event-description-input', label: t('event_075'), field: 'description', value: eventForm.description, multiline: true })}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Modos</Text>
            {modes.map((modeItem) => {
              const active = eventForm.modeSlugs.includes(modeItem.slug);
              const disabled = !canEdit;
              return <Pressable key={modeItem.slug} style={styles.switchRow} disabled={disabled} onPress={() => setEventForm((prev) => ({ ...prev, modeSlugs: active ? prev.modeSlugs.filter((slug) => slug !== modeItem.slug) : [...prev.modeSlugs, modeItem.slug] }))}><Text style={{ color: theme.textPrimary }}>{modeItem.name}</Text><Switch value={active} disabled={disabled} /></Pressable>;
            })}
            {accounts.length > 0 ? <AppButton testID="event-create-save" label={t('event_076')} onPress={onCreateEvent} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /> : null}
          </SurfaceCard>
        ) : null}

        {section === 'detail' ? renderEventDetail() : null}

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
      {renderAccountModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  sectionWrap: { gap: tokens.spacing.sm },
  sectionTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
  accountSelectorRow: { height: MENU_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm, borderBottomWidth: 1 },
  accountOptionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  accountSelectorData: { flex: 1, minWidth: 0 },
  accountSelectorName: { fontSize: tokens.typography.caption, fontWeight: '700' },
  changeAccountButton: { minWidth: 0, paddingRight: tokens.spacing.md },
  pressableCard: { width: '100%' },
  fieldLabel: { fontSize: tokens.typography.caption, fontWeight: '700' },
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
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { flex: 1, marginTop: tokens.spacing.xl, borderTopWidth: 1, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg, padding: tokens.spacing.md, gap: tokens.spacing.sm },
  modalList: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.md },
});
