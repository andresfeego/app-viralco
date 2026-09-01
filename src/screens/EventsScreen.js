import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { AccountRequiredEmptyState } from '../components/AccountRequiredEmptyState';
import { CompactAccountSelector } from '../components/CompactAccountSelector';
import { EventHeroHeader } from '../components/EventHeroHeader';
import { EventListCard } from '../components/EventListCard';
import { IconTextButton } from '../components/IconTextButton';
import { PaperDateInput } from '../components/PaperDateInput';
import { PaperFormInput } from '../components/PaperFormInput';
import { SelectableChipGroup } from '../components/SelectableChipGroup';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { useToast } from '../providers/ToastProvider';
import { listAccountsApi } from '../services/api/accounts';
import {
  createAccountLibraryAssetApi,
  createEventApi,
  createEventResourceApi,
  createProcessedAccountImageAssetApi,
  getEventDetailApi,
  listAccountLibraryApi,
  listEventResourcesApi,
  listEventsApi,
  listEventModesApi,
  listEventTypesApi,
  prepareAccountLibraryUploadApi,
  updateEventApi,
  updateEventBrandingApi,
  updateEventResourceApi,
} from '../services/api/events';
import { pickEventResourceImage } from '../services/media/imagePicker';

const RESOURCE_PURPOSES = ['frame', 'overlay', 'intro', 'outro', 'music', 'logo', 'background', 'template', 'branding', 'other'];
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
      logoResource: item.branding?.logoResource || null,
      backgroundResource: item.branding?.backgroundResource || null,
      isActive: item.branding?.isActive === undefined ? true : Boolean(item.branding.isActive),
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

function resourcePreviewUrl(resource) {
  const asset = resource?.asset;
  return asset?.variants?.card?.signedUrl
    || asset?.variants?.card?.fileUrl
    || asset?.variants?.full?.signedUrl
    || asset?.variants?.full?.fileUrl
    || asset?.fileSignedUrl
    || asset?.fileUrl
    || '';
}

function activeAccountRole(user, accountId) {
  const membership = (user?.accounts || []).find((item) => String(item.account?.id) === String(accountId));
  return membership?.status === 'active' ? membership?.role?.slug : null;
}

function accountContractedModeSlugs(account) {
  return (account?.subscription?.modes || []).map((item) => item.mode?.slug).filter(Boolean);
}

export function EventsScreen({
  initialSection = 'list',
  initialEventId = '',
  allowedSections = ['list', 'create', 'detail', 'branding', 'resources'],
  showKpi = true,
  onHeaderChange = null,
  onConfigureMirror = null,
  onCreateAccount = () => {},
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const normalizedSections = allowedSections.filter((key) => ['list', 'create', 'detail', 'resources', 'overlays'].includes(key)).map((key) => (key === 'overlays' ? 'resources' : key));
  const [section, setSection] = useState(normalizedSections.includes(initialSection) ? initialSection : normalizedSections[0] || 'list');
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState('');
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [eventTypes, setEventTypes] = useState([]);
  const [modes, setModes] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(String(initialEventId || ''));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [library, setLibrary] = useState([]);
  const [resources, setResources] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM);
  const [eventFormErrors, setEventFormErrors] = useState({});
  const [editEventVisible, setEditEventVisible] = useState(false);
  const [editModesVisible, setEditModesVisible] = useState(false);
  const [visualMenuPurpose, setVisualMenuPurpose] = useState('');
  const [libraryForm, setLibraryForm] = useState({ name: '', purpose: 'overlay', key: '', fileUrl: '', mimeType: 'image/png', sizeBytes: '1' });
  const [resourceForm, setResourceForm] = useState({ libraryAssetId: '', purpose: 'overlay', placement: '', orderIndex: '0', isActive: true });

  const roleSlug = activeAccountRole(user, accountId);
  const canEdit = isSuperAdmin || ['owner', 'admin'].includes(roleSlug);
  const activeAccount = accounts.find((account) => String(account.id) === String(accountId)) || null;
  const contractedModeSlugs = useMemo(() => accountContractedModeSlugs(activeAccount), [activeAccount]);
  const availableModes = useMemo(
    () => (contractedModeSlugs.length ? modes.filter((mode) => contractedModeSlugs.includes(mode.slug)) : modes),
    [contractedModeSlugs, modes]
  );
  const eventMenu = [
    { key: 'list', label: t('event_000') },
    { key: 'create', label: t('event_001') },
  ].filter((item) => normalizedSections.includes(item.key));

  const stats = useMemo(() => ({
    active: events.filter((event) => event.status === 'active').length,
    draft: events.filter((event) => event.status === 'draft').length,
    archived: events.filter((event) => event.status === 'archived').length,
  }), [events]);

  const clearMessages = () => { setError(''); setOk(''); };

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const payload = await listAccountsApi();
      const rows = Array.isArray(payload?.accounts) ? payload.accounts : [];
      setAccounts(rows);
      setAccountId((current) => {
        if (rows.some((account) => String(account.id) === String(current))) return current;
        return String(rows[0]?.id || '');
      });
    } catch (err) { setError(err?.message || t('account_006')); }
    finally { setAccountsLoading(false); }
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
      const requested = normalized.find((item) => String(item.id) === String(initialEventId));
      if (requested) {
        setSelectedEventId(requested.id);
        setSelectedEvent(requested);
        setSection('detail');
      } else if (!selectedEventId && normalized[0]?.id) setSelectedEventId(normalized[0].id);
    } catch (err) { setError(err?.message || t('event_040')); }
    finally { setLoading(false); }
  }, [accountId, initialEventId, selectedEventId]);

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
    } catch (err) { setError(err?.message || t('event_041')); }
  }, []);

  const loadLibraryAndResources = useCallback(async (eventId) => {
    if (!accountId) return;
    try {
      const [libraryPayload, resourcePayload] = await Promise.all([
        listAccountLibraryApi(accountId, { scope: 'available' }),
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
    if (!availableModes.length) return;
    setEventForm((prev) => {
      const allowed = new Set(availableModes.map((mode) => mode.slug));
      const nextModeSlugs = prev.modeSlugs.filter((slug) => allowed.has(slug));
      if (nextModeSlugs.length) return nextModeSlugs.length === prev.modeSlugs.length ? prev : { ...prev, modeSlugs: nextModeSlugs };
      return { ...prev, modeSlugs: [availableModes[0].slug] };
    });
  }, [accountId, availableModes]);
  useEffect(() => {
    if (selectedEventId && ['detail', 'resources'].includes(section)) loadEventDetail(selectedEventId);
    if (section === 'resources') loadLibraryAndResources(selectedEventId);
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
    if (!eventForm.modeSlugs.length) nextErrors.modeSlugs = t('event_110');
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
      const payload = await createEventApi(accountId, {
        eventTypeSlug: eventForm.eventTypeSlug,
        name: eventForm.name,
        modeSlugs: eventForm.modeSlugs,
        status: 'draft',
      });
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

  const onSaveEventDetails = async () => {
    if (!selectedEventId || !canEdit) { setError(t('event_060')); return; }
    setSaving(true); clearMessages();
    try {
      await updateEventApi(selectedEventId, {
        eventTypeSlug: eventForm.eventTypeSlug,
        name: eventForm.name,
        startDate: eventForm.startDate || null,
        endDate: eventForm.endDate || null,
        timezone: eventForm.timezone || 'America/Bogota',
        description: eventForm.description || null,
        status: eventForm.status || 'draft',
      });
      setEditEventVisible(false);
      setOk(t('event_065'));
      await loadEventDetail(selectedEventId);
      await loadEvents();
    } catch (err) {
      const message = err?.message || t('event_066');
      setError(message);
      showToast({ message, type: 'error' });
    } finally { setSaving(false); }
  };

  const onSaveEventModes = async () => {
    if (!selectedEventId || !canEdit) { setError(t('event_060')); return; }
    if (!eventForm.modeSlugs.length) {
      showToast({ message: t('event_110'), type: 'error' });
      return;
    }
    setSaving(true); clearMessages();
    try {
      await updateEventApi(selectedEventId, { modeSlugs: eventForm.modeSlugs });
      setEditModesVisible(false);
      setOk(t('event_065'));
      await loadEventDetail(selectedEventId);
    } catch (err) {
      const message = err?.message || t('event_066');
      setError(message);
      showToast({ message, type: 'error' });
    } finally { setSaving(false); }
  };

  const onPickEventVisualResource = async (purpose, source) => {
    if (!selectedEventId || !accountId || !canEdit) { setError(t('event_060')); return; }
    setVisualMenuPurpose('');
    setSaving(true); clearMessages();
    try {
      const image = await pickEventResourceImage({ source, purpose });
      if (!image) return;
      const asset = await createProcessedAccountImageAssetApi(accountId, image, purpose);
      if (!asset?.id) throw new Error(t('event_114'));
      const payload = await createEventResourceApi(selectedEventId, { libraryAssetId: asset.id, purpose, orderIndex: 0, isActive: true });
      const resourceId = payload?.resource?.id;
      if (!resourceId) throw new Error(t('event_114'));
      await updateEventBrandingApi(selectedEventId, purpose === 'logo' ? { logoResourceId: resourceId } : { backgroundResourceId: resourceId });
      setOk(t('event_065'));
      await loadEventDetail(selectedEventId);
      await loadLibraryAndResources(selectedEventId);
    } catch (err) {
      const message = err?.message || t('event_114');
      setError(message);
      showToast({ message, type: 'error' });
    } finally { setSaving(false); }
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

  const selectAccount = (nextAccountId) => {
    setAccountId(String(nextAccountId || ''));
    setSelectedEventId('');
    setSelectedEvent(null);
    setEvents([]);
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

  const renderEventTypePicker = () => (
    <SelectableChipGroup
      testID="event-type-selector"
      theme={theme}
      label={t('event_105')}
      options={eventTypes.map((type) => ({ label: type.name, value: type.slug }))}
      value={eventForm.eventTypeSlug}
      disabled={!canEdit}
      errorText={eventFormErrors.eventTypeSlug}
      onChange={(eventTypeSlug) => updateEventFormField('eventTypeSlug', eventTypeSlug)}
    />
  );

  const renderVisualResourceMenu = (purpose) => (
    <Menu
      visible={visualMenuPurpose === purpose}
      onDismiss={() => setVisualMenuPurpose('')}
      anchor={(
        <IconTextButton
          theme={theme}
          icon="pencil"
          variant="ghost"
          onPress={() => setVisualMenuPurpose(purpose)}
          testID={`event-${purpose}-edit`}
        />
      )}
    >
      <Menu.Item onPress={() => onPickEventVisualResource(purpose, 'camera')} title={t('event_115')} />
      <Menu.Item onPress={() => onPickEventVisualResource(purpose, 'gallery')} title={t('event_116')} />
    </Menu>
  );

  const renderEditEventModal = () => (
    <Modal visible={editEventVisible} animationType="slide" transparent onRequestClose={() => setEditEventVisible(false)}>
      <SafeAreaView edges={['top']} style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ScrollView contentContainerStyle={[styles.modalList, styles.editModalList]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_117')}</Text>
            {renderEventTypePicker()}
            {renderEventInput({ testID: 'event-edit-name-input', label: t('event_071'), field: 'name', value: eventForm.name })}
            <PaperDateInput
              testID="event-edit-date-input"
              theme={theme}
              label={t('event_073')}
              value={eventForm.startDate}
              disabled={!canEdit}
              helperLabel={t('event_104')}
              onChangeDate={(startDate) => updateEventFormField('startDate', startDate)}
            />
            {renderEventInput({ testID: 'event-edit-timezone-input', label: t('event_103'), field: 'timezone', value: eventForm.timezone, autoCapitalize: 'none' })}
            {renderEventInput({ testID: 'event-edit-description-input', label: t('event_075'), field: 'description', value: eventForm.description, multiline: true })}
            <View style={styles.row}>
              <AppButton label={t('account_028')} onPress={() => setEditEventVisible(false)} backgroundColor={theme.surface} pressedColor={theme.surface} textColor={theme.textPrimary} style={styles.smallButton} />
              <AppButton label={t('event_119')} onPress={onSaveEventDetails} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.smallButton} />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderEditModesModal = () => (
    <Modal visible={editModesVisible} animationType="slide" transparent onRequestClose={() => setEditModesVisible(false)}>
      <SafeAreaView edges={['top']} style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <ScrollView contentContainerStyle={styles.modalList}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_118')}</Text>
            <SelectableChipGroup
              testID="event-edit-mode-selector"
              theme={theme}
              label={t('event_111')}
              options={availableModes.map((mode) => ({ label: mode.name, value: mode.slug }))}
              values={eventForm.modeSlugs}
              multiple
              disabled={!canEdit}
              errorText={eventFormErrors.modeSlugs}
              onChange={(modeSlugs) => updateEventFormField('modeSlugs', modeSlugs)}
            />
            <View style={styles.row}>
              <AppButton label={t('account_028')} onPress={() => setEditModesVisible(false)} backgroundColor={theme.surface} pressedColor={theme.surface} textColor={theme.textPrimary} style={styles.smallButton} />
              <AppButton label={t('event_119')} onPress={onSaveEventModes} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.smallButton} />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
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
          backgroundAction={canEdit ? renderVisualResourceMenu('background') : null}
          logoAction={canEdit ? renderVisualResourceMenu('logo') : null}
        />
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_108')}</Text>
            {canEdit ? <IconTextButton theme={theme} icon="pencil" variant="ghost" onPress={() => setEditEventVisible(true)} testID="event-details-edit" /> : null}
          </View>
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
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_111')}</Text>
            {canEdit ? <IconTextButton theme={theme} icon="pencil" variant="ghost" onPress={() => setEditModesVisible(true)} testID="event-modes-edit" /> : null}
          </View>
          {event?.modes?.length ? event.modes.map((item) => (
            <View key={item.id || item.mode?.slug} style={styles.modeRow}>
              <Text style={[styles.cardMeta, styles.modeName, { color: theme.textSecondary }]}>{item.mode?.name || item.mode?.slug || '-'}</Text>
              {item.mode?.slug === 'espejo' && item.isActive !== false && onConfigureMirror ? (
                <AppButton
                  testID="event-configure-mirror"
                  label={t('mirror_008')}
                  onPress={() => onConfigureMirror({ event, eventMode: item, accountId, canEdit })}
                  backgroundColor={theme.buttonBg}
                  pressedColor={theme.buttonBgPressed}
                  textColor={theme.buttonText}
                  style={styles.modeButton}
                />
              ) : null}
            </View>
          )) : <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>-</Text>}
        </SurfaceCard>
      </View>
    );
  };

  if (accountsLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {eventMenu.length > 1 ? <HorizontalSubMenu items={eventMenu} selectedKey={section} onSelect={setSection} theme={theme} /> : null}
      <CompactAccountSelector
        accounts={accounts}
        value={accountId}
        onChange={selectAccount}
        theme={theme}
        roleLabel={isSuperAdmin ? 'super_admin' : roleSlug || ''}
      />
      {section === 'create' && accounts.length === 0 ? (
        <AccountRequiredEmptyState theme={theme} onCreateAccount={onCreateAccount} testID="events-account-required" />
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
            <SelectableChipGroup
              testID="event-mode-selector"
              theme={theme}
              label={t('event_111')}
              options={availableModes.map((mode) => ({ label: mode.name, value: mode.slug }))}
              values={eventForm.modeSlugs}
              multiple
              disabled={!canEdit}
              errorText={eventFormErrors.modeSlugs}
              onChange={(modeSlugs) => updateEventFormField('modeSlugs', modeSlugs)}
            />
            {accounts.length > 0 ? <AppButton testID="event-create-save" label={t('event_076')} onPress={onCreateEvent} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /> : null}
          </SurfaceCard>
        ) : null}

        {section === 'detail' ? renderEventDetail() : null}

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
      )}
      {renderEditEventModal()}
      {renderEditModesModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: tokens.spacing.md, gap: tokens.spacing.md },
  sectionWrap: { gap: tokens.spacing.sm },
  sectionTitle: { fontSize: tokens.typography.heading, fontWeight: '700' },
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
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  modeName: { flex: 1 },
  modeButton: { minWidth: tokens.spacing.xl * 3 },
  row: { flexDirection: 'row', gap: tokens.spacing.xs },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  smallButton: { flex: 1 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { flex: 1, marginTop: tokens.spacing.xl, borderTopWidth: 1, borderTopLeftRadius: tokens.radius.lg, borderTopRightRadius: tokens.radius.lg, padding: tokens.spacing.md, gap: tokens.spacing.sm },
  modalList: { gap: tokens.spacing.sm, paddingBottom: tokens.spacing.md },
  editModalList: { paddingTop: tokens.spacing.lg },
});
