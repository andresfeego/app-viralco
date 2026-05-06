import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Linking, Pressable, ScrollView, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { useAuth } from '../hooks/useAuth';
import { t } from '../i18n';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { EventListCard } from '../components/EventListCard';
import { EventQuickActions } from '../components/EventQuickActions';
import { CopyActionButton } from '../components/CopyActionButton';
import { ShareMenuButton } from '../components/ShareMenuButton';
import {
  createEventApi,
  createEventOverlayApi,
  getEventDetailApi,
  listEventOverlaysApi,
  listEventsApi,
  updateEventApi,
  updateEventBrandingApi,
  updateEventOverlayApi,
} from '../services/api/events';

const EVENT_STATUS = ['draft', 'active', 'archived'];
const OVERLAY_TYPES = ['frame', 'overlay', 'background', 'logo', 'other'];
const VISIBLE_MODES = ['video_360', 'photo_collage', 'video_message', 'gif'];
const EVENT_TYPE_OPTIONS = [
  'Baby Shower',
  'Bar/Bat Mitzvah',
  'Birthday Party',
  'Bridal Shower',
  'Corporate',
  'Engagement',
  'Holiday Party',
  'Other',
  'School Event',
  'Sweet 16',
  'Wedding',
];
function normalizeEvent(item) {
  if (!item) {
    return null;
  }
  return {
    id: item.id,
    name: String(item.name || ''),
    slug: String(item.slug || item.publicKey || ''),
    eventDate: String(item.eventDate || ''),
    status: String(item.status || 'draft'),
    description: String(item.description || ''),
    phone: String(item.phone || ''),
    branding: {
      logoUrl: String(item.branding?.logoUrl || ''),
      backgroundUrl: String(item.branding?.backgroundUrl || ''),
      primaryColor: String(item.branding?.primaryColor || ''),
      secondaryColor: String(item.branding?.secondaryColor || ''),
      textColor: String(item.branding?.textColor || ''),
    },
  };
}

function normalizeOverlay(item) {
  return {
    id: item.id,
    eventId: item.eventId,
    name: String(item.name || ''),
    fileUrl: String(item.fileUrl || ''),
    type: String(item.type || 'overlay'),
    layerOrder: Number(item.layerOrder || 0),
    isActive: Boolean(item.isActive ?? true),
  };
}

function isValidHttpUrl(value) {
  if (!value) {
    return true;
  }
  return /^https?:\/\/.+/i.test(value);
}

function isValidHexColor(value) {
  if (!value) {
    return true;
  }
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(String(value).trim());
}

function isValidDateYmd(value) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return false;
  }
  const [year, month, day] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export function EventsScreen({
  initialSection = 'list',
  allowedSections = ['list', 'create', 'detail', 'branding', 'overlays'],
  showKpi = true,
  onHeaderChange = null,
}) {
  const { user } = useAuth();
  const mode = user?.themeMode || 'dark';
  const theme = useMemo(() => getTheme(mode), [mode]);

  const normalizedAllowedSections = useMemo(
    () => allowedSections.filter((key) => ['list', 'create', 'detail', 'branding', 'overlays'].includes(key)),
    [allowedSections]
  );
  const [section, setSection] = useState(
    normalizedAllowedSections.includes(initialSection) ? initialSection : normalizedAllowedSections[0] || 'list'
  );
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [openedEventId, setOpenedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [overlays, setOverlays] = useState([]);

  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [eventTypeOpen, setEventTypeOpen] = useState(false);
  const [activeAction, setActiveAction] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [linkSharingEnabled, setLinkSharingEnabled] = useState(true);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  const [eventForm, setEventForm] = useState({
    name: '',
    eventDate: '',
    status: 'draft',
    eventType: '',
    imageUrl: '',
    phone: '',
    description: '',
  });
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    backgroundUrl: '',
    primaryColor: '',
    secondaryColor: '',
    textColor: '',
  });
  const [overlayForm, setOverlayForm] = useState({
    name: '',
    fileUrl: '',
    type: 'overlay',
    layerOrder: '0',
    isActive: true,
  });

  const isAdmin = useMemo(() => {
    const slugs = (user?.roles || []).map((role) => String(role.slug || ''));
    return slugs.includes('super_admin') || slugs.includes('admin');
  }, [user]);

  const canEdit = isAdmin;

  const eventMenu = [
    { key: 'list', label: t('event_000') },
    { key: 'create', label: t('event_001') },
    { key: 'detail', label: t('event_002') },
    { key: 'branding', label: t('event_003') },
    { key: 'overlays', label: t('event_004') },
  ].filter((item) => normalizedAllowedSections.includes(item.key));

  useEffect(() => {
    if (!normalizedAllowedSections.includes(section)) {
      setSection(normalizedAllowedSections[0] || 'list');
    }
  }, [normalizedAllowedSections, section]);

  const selectedEventName = useMemo(() => {
    if (!selectedEvent) {
      return t('event_030');
    }
    return selectedEvent.name || t('event_030');
  }, [selectedEvent]);
  const openedEvent = useMemo(
    () => events.find((item) => item.id === openedEventId) || selectedEvent || null,
    [events, openedEventId, selectedEvent]
  );

  const openedEventCategory = useMemo(() => {
    const raw = String(openedEvent?.description || '').replace(/^Tipo:\s*/i, '').toLowerCase();
    if (raw.includes('boda') || raw.includes('matrimonio')) {
      return 'heart';
    }
    if (raw.includes('cumple') || raw.includes('fiesta')) {
      return 'cake-candles';
    }
    if (raw.includes('concierto') || raw.includes('festival')) {
      return 'music';
    }
    if (raw.includes('expo') || raw.includes('feria')) {
      return 'store';
    }
    if (raw.includes('marca') || raw.includes('lanzamiento')) {
      return 'bullhorn';
    }
    return 'calendar-check';
  }, [openedEvent?.description]);

  useEffect(() => {
    if (!onHeaderChange) {
      return;
    }
    if (openedEvent) {
      onHeaderChange({
        title: openedEvent.name || t('menu_002'),
        subtitle: openedEvent.eventDate || '',
        iconName: openedEventCategory,
        onBack: () => setOpenedEventId(null),
        backLabel: 'Volver al listado',
      });
      return;
    }
    onHeaderChange({
      title: t('menu_002'),
      subtitle: '',
      iconName: 'champagne-glasses',
      onBack: null,
      backLabel: 'Volver al listado',
    });
  }, [onHeaderChange, openedEvent, openedEventCategory]);

  const eventStats = useMemo(() => {
    const draft = events.filter((item) => item.status === 'draft').length;
    const active = events.filter((item) => item.status === 'active').length;
    const archived = events.filter((item) => item.status === 'archived').length;
    return { draft, active, archived };
  }, [events]);

  const clearMessages = () => {
    setError('');
    setOk('');
  };

  const loadEvents = useCallback(async () => {
    setLoadingList(true);
    clearMessages();
    try {
      const payload = await listEventsApi();
      const rows = Array.isArray(payload?.events) ? payload.events : Array.isArray(payload) ? payload : [];
      const normalized = rows.map(normalizeEvent).filter(Boolean);
      setEvents(normalized);
      if (normalized.length > 0 && !selectedEventId) {
        setSelectedEventId(normalized[0].id);
      }
    } catch (err) {
      setError(err?.message || t('event_040'));
    } finally {
      setLoadingList(false);
    }
  }, [selectedEventId]);

  const loadEventDetail = useCallback(async (eventId) => {
    if (!eventId) {
      return;
    }
    setLoadingDetail(true);
    clearMessages();
    try {
      const payload = await getEventDetailApi(eventId);
      const eventData = normalizeEvent(payload?.event || payload);
      setSelectedEvent(eventData);
      setEventForm({
        name: eventData?.name || '',
        eventDate: eventData?.eventDate || '',
        status: eventData?.status || 'draft',
        eventType: String(eventData?.description || '').replace(/^Tipo:\s*/i, ''),
        imageUrl: eventData?.branding?.backgroundUrl || '',
        phone: eventData?.phone || '',
        description: eventData?.description || '',
      });
      setBrandingForm({
        logoUrl: eventData?.branding?.logoUrl || '',
        backgroundUrl: eventData?.branding?.backgroundUrl || '',
        primaryColor: eventData?.branding?.primaryColor || '',
        secondaryColor: eventData?.branding?.secondaryColor || '',
        textColor: eventData?.branding?.textColor || '',
      });
    } catch (err) {
      setError(err?.message || t('event_041'));
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const loadOverlays = useCallback(async (eventId) => {
    if (!eventId) {
      return;
    }
    clearMessages();
    try {
      const payload = await listEventOverlaysApi(eventId);
      const rows = Array.isArray(payload?.overlays) ? payload.overlays : Array.isArray(payload) ? payload : [];
      const normalized = rows.map(normalizeOverlay).sort((a, b) => a.layerOrder - b.layerOrder);
      setOverlays(normalized);
    } catch (err) {
      setError(err?.message || t('event_042'));
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (!selectedEventId) {
      return;
    }
    if (!['detail', 'branding', 'overlays'].includes(section)) {
      return;
    }
    loadEventDetail(selectedEventId);
    loadOverlays(selectedEventId);
  }, [loadEventDetail, loadOverlays, section, selectedEventId]);

  useEffect(() => {
    setError('');
    setOk('');
    setFieldErrors({});
  }, [section]);

  const validateEventForm = (form, formMode = 'create') => {
    const nextErrors = {};
    const name = String(form.name || '').trim();
    const eventDate = String(form.eventDate || '').trim();
    const status = String(form.status || '').trim().toLowerCase();
    const eventType = String(form.eventType || '').trim();
    const imageUrl = String(form.imageUrl || '').trim();

    if (!name) {
      nextErrors.name = t('event_050');
    }
    if (!eventDate) {
      nextErrors.eventDate = t('event_051');
    } else if (!isValidDateYmd(eventDate)) {
      nextErrors.eventDate = 'La fecha debe ser valida y tener formato YYYY-MM-DD.';
    }
    if (formMode === 'create' && !eventType) {
      nextErrors.eventType = 'El tipo de evento es requerido.';
    }
    if (eventType && !EVENT_TYPE_OPTIONS.includes(eventType)) {
      nextErrors.eventType = 'Selecciona un tipo de evento de la lista.';
    }
    if (imageUrl && !isValidHttpUrl(imageUrl)) {
      nextErrors.imageUrl = 'La imagen debe ser una URL valida (http/https).';
    }
    if (status && !EVENT_STATUS.includes(status)) {
      nextErrors.status = `Estado invalido. Usa: ${EVENT_STATUS.join(', ')}.`;
    }

    return nextErrors;
  };

  const validateBrandingForm = (form) => {
    const nextErrors = {};
    if (!isValidHttpUrl(form.logoUrl)) {
      nextErrors.logoUrl = t('event_053');
    }
    if (!isValidHttpUrl(form.backgroundUrl)) {
      nextErrors.backgroundUrl = t('event_053');
    }
    if (!isValidHexColor(form.primaryColor)) {
      nextErrors.primaryColor = 'Color invalido. Usa formato HEX, por ejemplo #1D4ED8.';
    }
    if (!isValidHexColor(form.secondaryColor)) {
      nextErrors.secondaryColor = 'Color invalido. Usa formato HEX, por ejemplo #0EA5E9.';
    }
    if (!isValidHexColor(form.textColor)) {
      nextErrors.textColor = 'Color invalido. Usa formato HEX, por ejemplo #F8FAFC.';
    }
    return nextErrors;
  };

  const validateOverlayForm = (form) => {
    const nextErrors = {};
    if (!String(form.name || '').trim()) {
      nextErrors.overlayName = t('event_054');
    }
    if (!String(form.fileUrl || '').trim()) {
      nextErrors.fileUrl = t('event_055');
    } else if (!isValidHttpUrl(form.fileUrl)) {
      nextErrors.fileUrl = t('event_055');
    }
    const numericOrder = Number(form.layerOrder);
    if (Number.isNaN(numericOrder) || !Number.isInteger(numericOrder) || numericOrder < 0) {
      nextErrors.layerOrder = t('event_056');
    }
    if (!OVERLAY_TYPES.includes(String(form.type || '').trim())) {
      nextErrors.type = `Tipo invalido. Usa: ${OVERLAY_TYPES.join(', ')}.`;
    }
    return nextErrors;
  };

  const onCreateEvent = async () => {
    if (!canEdit) {
      setError(t('event_060'));
      return;
    }
    const nextErrors = validateEventForm(eventForm, 'create');
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError('Revisa los campos del formulario.');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    clearMessages();
    try {
      const payload = await createEventApi({
        name: eventForm.name,
        eventDate: eventForm.eventDate,
        status: eventForm.status || 'draft',
        description: `Tipo: ${eventForm.eventType}`,
        phone: '',
        branding: { backgroundUrl: eventForm.imageUrl || '' },
        visibleModes: VISIBLE_MODES,
      });
      const created = normalizeEvent(payload?.event || payload);
      setOk(t('event_061'));
      await loadEvents();
      if (created?.id) {
        setSelectedEventId(created.id);
      }
      setSection('detail');
    } catch (err) {
      setError(err?.message || t('event_062'));
    } finally {
      setSaving(false);
    }
  };

  const onUpdateEvent = async () => {
    if (!selectedEventId) {
      return;
    }
    if (!canEdit) {
      setError(t('event_060'));
      return;
    }
    const nextErrors = validateEventForm(eventForm, 'update');
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError('Revisa los campos del formulario.');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    clearMessages();
    try {
      await updateEventApi(selectedEventId, {
        name: eventForm.name,
        eventDate: eventForm.eventDate,
        status: eventForm.status,
        phone: eventForm.phone || '',
        description: eventForm.description || '',
      });
      setOk(t('event_063'));
      await loadEventDetail(selectedEventId);
      await loadEvents();
    } catch (err) {
      setError(err?.message || t('event_064'));
    } finally {
      setSaving(false);
    }
  };

  const onSaveBranding = async () => {
    if (!selectedEventId) {
      return;
    }
    if (!canEdit) {
      setError(t('event_060'));
      return;
    }
    const nextErrors = validateBrandingForm(brandingForm);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError('Revisa los campos de branding.');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    clearMessages();
    try {
      await updateEventBrandingApi(selectedEventId, brandingForm);
      setOk(t('event_065'));
      await loadEventDetail(selectedEventId);
    } catch (err) {
      setError(err?.message || t('event_066'));
    } finally {
      setSaving(false);
    }
  };

  const onCreateOverlay = async () => {
    if (!selectedEventId) {
      return;
    }
    if (!canEdit) {
      setError(t('event_060'));
      return;
    }
    const nextErrors = validateOverlayForm(overlayForm);
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setError('Revisa los campos de overlays.');
      return;
    }
    setFieldErrors({});
    setSaving(true);
    clearMessages();
    try {
      await createEventOverlayApi(selectedEventId, {
        ...overlayForm,
        layerOrder: Number(overlayForm.layerOrder),
      });
      setOverlayForm({
        name: '',
        fileUrl: '',
        type: 'overlay',
        layerOrder: '0',
        isActive: true,
      });
      setOk(t('event_067'));
      await loadOverlays(selectedEventId);
    } catch (err) {
      setError(err?.message || t('event_068'));
    } finally {
      setSaving(false);
    }
  };

  const moveOverlay = async (overlay, direction) => {
    if (!selectedEventId || !canEdit) {
      return;
    }
    const ordered = [...overlays].sort((a, b) => a.layerOrder - b.layerOrder);
    const index = ordered.findIndex((item) => item.id === overlay.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) {
      return;
    }

    const current = ordered[index];
    const target = ordered[nextIndex];

    setSaving(true);
    clearMessages();
    try {
      await updateEventOverlayApi(selectedEventId, current.id, { layerOrder: target.layerOrder });
      await updateEventOverlayApi(selectedEventId, target.id, { layerOrder: current.layerOrder });
      setOk(t('event_069'));
      await loadOverlays(selectedEventId);
    } catch (err) {
      setError(err?.message || t('event_070'));
    } finally {
      setSaving(false);
    }
  };

  const renderEventCard = ({ item }) => (
    <EventListCard
      item={item}
      selected={item.id === selectedEventId}
      theme={theme}
      onPress={() => {
        setSelectedEventId(item.id);
        setOpenedEventId(item.id);
      }}
      dateLabel={t('event_011')}
    />
  );

  const renderFieldError = (keyName) =>
    fieldErrors[keyName] ? <Text style={[styles.fieldError, { color: theme.alert }]}>{fieldErrors[keyName]}</Text> : null;

  const onQuickAction = (key) => {
    setActiveAction(key);
    setOk('');
    setError('');
  };

  const sharingUrl = `https://fotoshare.co/e/${openedEvent?.slug || 'evento'}`;

  const onCopySharingUrl = async () => {
    if (!linkSharingEnabled) {
      setError('Activa Link Sharing para copiar el enlace.');
      return;
    }
    try {
      await Share.share({ message: sharingUrl });
      setOk('Se abrio compartir para copiar o enviar el enlace.');
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 1400);
      setError('');
    } catch {
      setError('No se pudo copiar el enlace.');
    }
  };

  const onShareSharingUrl = () => {
    if (!linkSharingEnabled) {
      setError('Activa Link Sharing para compartir el enlace.');
      return;
    }
    setShareMenuOpen((prev) => !prev);
    setError('');
  };

  const onShareToChannel = async (channel) => {
    if (!linkSharingEnabled) {
      return;
    }
    const encodedUrl = encodeURIComponent(sharingUrl);
    const encodedText = encodeURIComponent(`Mira este evento: ${sharingUrl}`);
    const destinations = {
      email: [
        `mailto:?subject=${encodeURIComponent('Link del evento')}&body=${encodedText}`,
      ],
      whatsapp: [
        `whatsapp://send?text=${encodedText}`,
        `https://wa.me/?text=${encodedText}`,
      ],
      x: [
        `twitter://post?message=${encodedText}`,
        `https://x.com/intent/tweet?text=${encodedText}`,
      ],
      facebook: [
        `fb://facewebmodal/f?href=${encodeURIComponent(`https://www.facebook.com/sharer/sharer.php?u=${sharingUrl}`)}`,
        `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      ],
    };

    const urls = destinations[channel] || [];
    try {
      let opened = false;
      for (const url of urls) {
        const can = await Linking.canOpenURL(url);
        if (can) {
          await Linking.openURL(url);
          opened = true;
          break;
        }
      }
      if (!opened) {
        await Share.share({ message: sharingUrl, url: sharingUrl });
      }
      setOk('Abriendo opciones de compartir.');
      setError('');
    } catch {
      setError('No se pudo compartir el enlace.');
    } finally {
      setShareMenuOpen(false);
    }
  };

  const onOpenSharingUrl = async () => {
    if (!linkSharingEnabled) {
      setError('Activa Link Sharing para abrir el enlace.');
      return;
    }
    try {
      await Linking.openURL(sharingUrl);
    } catch {
      setError('No se pudo abrir el enlace.');
    }
  };

  const onDeleteEventLocal = () => {
    if (!openedEvent?.id) {
      return;
    }
    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR') {
      setError('Escribe ELIMINAR para confirmar.');
      return;
    }
    const remaining = events.filter((item) => item.id !== openedEvent.id);
    setEvents(remaining);
    setDeleteConfirmText('');
    setActiveAction('');
    setOpenedEventId(null);
    setSelectedEventId(remaining[0]?.id || null);
    setOk('Evento eliminado localmente.');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {openedEventId ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <View style={styles.metricRow3}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Sesiones</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Imagenes</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Videos</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
            </View>
            <Text style={[styles.metricLink, { color: theme.primary }]}>Analiticas</Text>
          </SurfaceCard>

          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <View style={styles.metricRow4}>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Subidas</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Email</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>SMS</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>WhatsApp</Text>
                <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
              </View>
            </View>
            <Text style={[styles.metricSubText, { color: theme.textSecondary }]}>0 compartidos totales</Text>
          </SurfaceCard>

          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <View style={styles.linkHead}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Link Sharing</Text>
              <View style={styles.linkToggleWrap}>
                <Switch
                  value={linkSharingEnabled}
                  onValueChange={setLinkSharingEnabled}
                  trackColor={{
                    false: '#8b949e',
                    true: '#e13b80',
                  }}
                  thumbColor="#f6f8fa"
                />
                <Text style={[styles.linkStatusText, { color: theme.textPrimary }]}>
                  {linkSharingEnabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
            <View style={styles.linkActionsRow}>
              <Pressable
                style={[styles.linkRow, { borderColor: theme.border, backgroundColor: theme.background }]}
                onPress={onOpenSharingUrl}
              >
                <Icon
                  name="link"
                  iconStyle="solid"
                  size={14}
                  color={linkSharingEnabled ? theme.textSecondary : theme.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.linkText, { color: linkSharingEnabled ? theme.textSecondary : theme.textSecondary }]}
                >
                  {linkSharingEnabled ? sharingUrl : 'Event link is disabled.'}
                </Text>
              </Pressable>
              <CopyActionButton
                theme={theme}
                disabled={!linkSharingEnabled}
                copied={copyDone}
                onPress={onCopySharingUrl}
              />
              <ShareMenuButton
                theme={theme}
                disabled={!linkSharingEnabled}
                isOpen={shareMenuOpen}
                onToggle={onShareSharingUrl}
                onRequestClose={() => setShareMenuOpen(false)}
                onSelect={onShareToChannel}
              />
            </View>
          </SurfaceCard>

          <EventQuickActions theme={theme} onAction={onQuickAction} />

          {activeAction === 'download' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Descargar contenido</Text>
              <Text style={[styles.helper, { color: theme.textSecondary }]}>
                Prepara un ZIP con fotos y videos del evento.
              </Text>
              <AppButton
                label="Iniciar descarga"
                onPress={() => setOk('Descarga iniciada (demo).')}
                backgroundColor={theme.buttonBg}
                pressedColor={theme.buttonBgPressed}
                textColor={theme.buttonText}
              />
            </SurfaceCard>
          ) : null}

          {activeAction === 'upload' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Subir archivos</Text>
              <Text style={[styles.helper, { color: theme.textSecondary }]}>
                Arrastra o elige archivos para subir al evento.
              </Text>
              <View style={[styles.uploadBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={{ color: theme.textSecondary }}>Maximo 50 MB por archivo</Text>
              </View>
              <AppButton
                label="Seleccionar archivos"
                onPress={() => setOk('Selector de archivos pendiente de integracion nativa.')}
                backgroundColor={theme.buttonBg}
                pressedColor={theme.buttonBgPressed}
                textColor={theme.buttonText}
              />
            </SurfaceCard>
          ) : null}

          {activeAction === 'embed' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Codigo embebido</Text>
              <View style={[styles.embedBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={{ color: theme.textSecondary }} numberOfLines={2}>
                  {`<iframe src=\"https://fotoshare.co/e/${openedEvent?.slug || 'evento'}\" />`}
                </Text>
              </View>
              <AppButton
                label="Copiar codigo"
                onPress={() => setOk('Codigo copiado (demo).')}
                backgroundColor={theme.buttonBg}
                pressedColor={theme.buttonBgPressed}
                textColor={theme.buttonText}
              />
            </SurfaceCard>
          ) : null}

          {activeAction === 'analytics' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Analiticas del evento</Text>
              <Text style={[styles.helper, { color: theme.textSecondary }]}>Ultimos 30 dias</Text>
              <View style={styles.metricRow3}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Vistas</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Sesiones</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
                </View>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Compartidos</Text>
                  <Text style={[styles.metricValue, { color: theme.textPrimary }]}>0</Text>
                </View>
              </View>
            </SurfaceCard>
          ) : null}

          {activeAction === 'shares' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Compartidos</Text>
              <View style={styles.row}>
                <AppButton
                  label="Descargar CSV"
                  onPress={() => setOk('Exportacion CSV iniciada (demo).')}
                  backgroundColor={theme.surface}
                  pressedColor={theme.background}
                  textColor={theme.textPrimary}
                  style={[styles.smallButton, { borderWidth: 1, borderColor: theme.border }]}
                />
                <AppButton
                  label="Descargar PDF"
                  onPress={() => setOk('Exportacion PDF iniciada (demo).')}
                  backgroundColor={theme.surface}
                  pressedColor={theme.background}
                  textColor={theme.textPrimary}
                  style={[styles.smallButton, { borderWidth: 1, borderColor: theme.border }]}
                />
              </View>
              <View style={[styles.embedBox, { borderColor: theme.border, backgroundColor: theme.background }]}>
                <Text style={{ color: theme.textSecondary }}>No se encontraron compartidos para este evento.</Text>
              </View>
            </SurfaceCard>
          ) : null}

          {activeAction === 'slideshow' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Presentacion</Text>
              <Text style={[styles.helper, { color: theme.textSecondary }]}>
                Reproducir galeria automaticamente en pantalla completa.
              </Text>
              <AppButton
                label="Iniciar presentacion"
                onPress={() => setOk('Presentacion iniciada (demo).')}
                backgroundColor={theme.buttonBg}
                pressedColor={theme.buttonBgPressed}
                textColor={theme.buttonText}
              />
            </SurfaceCard>
          ) : null}

          {activeAction === 'delete' ? (
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.alert }]}>Eliminar evento</Text>
              <Text style={[styles.helper, { color: theme.textSecondary }]}>
                Esta accion no se puede deshacer. Escribe ELIMINAR para confirmar.
              </Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="ELIMINAR"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              />
              <AppButton
                label="Eliminar evento"
                onPress={onDeleteEventLocal}
                backgroundColor={theme.alert}
                pressedColor={theme.alert}
                textColor="#fff"
              />
            </SurfaceCard>
          ) : null}
        </ScrollView>
      ) : (
        <>
      <HorizontalSubMenu items={eventMenu} selectedKey={section} onSelect={setSection} theme={theme} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {showKpi ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <View style={styles.kpiRow}>
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: theme.textPrimary }]}>{eventStats.active}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Activos</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: theme.textPrimary }]}>{eventStats.draft}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Draft</Text>
              </View>
              <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />
              <View style={styles.kpiItem}>
                <Text style={[styles.kpiNumber, { color: theme.textPrimary }]}>{eventStats.archived}</Text>
                <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Archivados</Text>
              </View>
            </View>
          </SurfaceCard>
        ) : null}

        {error && (section !== 'list' || events.length === 0) ? (
          <Text style={[styles.feedback, { color: theme.alert }]}>{error}</Text>
        ) : null}
        {ok ? <Text style={[styles.feedback, { color: theme.secondary }]}>{ok}</Text> : null}
        {saving ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('event_020')}</Text> : null}

        {section === 'list' ? (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_000')}</Text>
            {loadingList ? <Text style={{ color: theme.textSecondary }}>{t('event_021')}</Text> : null}
            {!loadingList && events.length === 0 ? (
              <Text style={{ color: theme.textSecondary }}>{t('event_022')}</Text>
            ) : null}
            <FlatList
              key="events-list-1col"
              data={events}
              keyExtractor={(item) => String(item.id)}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              numColumns={1}
              renderItem={renderEventCard}
            />
          </View>
        ) : null}

        {section === 'create' ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_001')}</Text>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_071')}</Text>
            <TextInput
              value={eventForm.name}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, name: value }))}
              placeholder={t('event_071')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
            />
            {renderFieldError('name')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_073')}</Text>
            <TextInput
              value={eventForm.eventDate}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, eventDate: value }))}
              placeholder={t('event_073')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
            />
            {renderFieldError('eventDate')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Tipo de evento</Text>
            <Pressable
              onPress={() => setEventTypeOpen((prev) => !prev)}
              style={[styles.selectInput, { borderColor: theme.border, backgroundColor: theme.surface }]}
            >
              <Text style={{ color: eventForm.eventType ? theme.textPrimary : theme.textSecondary, fontSize: tokens.typography.body }}>
                {eventForm.eventType || 'Select type'}
              </Text>
              <Text style={{ color: theme.textSecondary, fontSize: tokens.typography.body }}>{eventTypeOpen ? '˄' : '˅'}</Text>
            </Pressable>
            {eventTypeOpen ? (
              <View style={[styles.selectDropdown, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const active = eventForm.eventType === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        setEventForm((prev) => ({ ...prev, eventType: option }));
                        setEventTypeOpen(false);
                      }}
                      style={[styles.selectOption, active ? { backgroundColor: theme.background } : null]}
                    >
                      <Text style={[styles.selectOptionText, active ? styles.selectOptionTextActive : null, { color: theme.textPrimary }]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            {renderFieldError('eventType')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Imagen del evento (URL opcional)</Text>
            <TextInput
              value={eventForm.imageUrl}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, imageUrl: value }))}
              placeholder="https://..."
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
            />
            {renderFieldError('imageUrl')}
            <AppButton
              label={t('event_076')}
              onPress={onCreateEvent}
              backgroundColor={theme.buttonBg}
              pressedColor={theme.buttonBgPressed}
              textColor={theme.buttonText}
            />
          </SurfaceCard>
        ) : null}

        {section === 'detail' ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('event_002')}: {selectedEventName}
            </Text>
            {!selectedEventId ? <Text style={{ color: theme.textSecondary }}>{t('event_023')}</Text> : null}
            {loadingDetail ? <Text style={{ color: theme.textSecondary }}>{t('event_024')}</Text> : null}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_071')}</Text>
            <TextInput
              value={eventForm.name}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, name: value }))}
              placeholder={t('event_071')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('name')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_010')}</Text>
            <TextInput
              value={eventForm.status}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, status: value }))}
              placeholder={t('event_010')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('status')}
            <Text style={[styles.helper, { color: theme.textSecondary }]}>
              {t('event_025')}: {EVENT_STATUS.join(', ')}
            </Text>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_073')}</Text>
            <TextInput
              value={eventForm.eventDate}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, eventDate: value }))}
              placeholder={t('event_073')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('eventDate')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_074')}</Text>
            <TextInput
              value={eventForm.phone}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, phone: value }))}
              placeholder={t('event_074')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('phone')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_075')}</Text>
            <TextInput
              value={eventForm.description}
              onChangeText={(value) => setEventForm((prev) => ({ ...prev, description: value }))}
              placeholder={t('event_075')}
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, styles.multiline, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            <AppButton
              label={t('event_077')}
              onPress={onUpdateEvent}
              backgroundColor={theme.buttonBg}
              pressedColor={theme.buttonBgPressed}
              textColor={theme.buttonText}
            />
          </SurfaceCard>
        ) : null}

        {section === 'branding' ? (
          <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {t('event_003')}: {selectedEventName}
            </Text>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_078')}</Text>
            <TextInput
              value={brandingForm.logoUrl}
              onChangeText={(value) => setBrandingForm((prev) => ({ ...prev, logoUrl: value }))}
              placeholder={t('event_078')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('logoUrl')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_079')}</Text>
            <TextInput
              value={brandingForm.backgroundUrl}
              onChangeText={(value) => setBrandingForm((prev) => ({ ...prev, backgroundUrl: value }))}
              placeholder={t('event_079')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('backgroundUrl')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_080')}</Text>
            <TextInput
              value={brandingForm.primaryColor}
              onChangeText={(value) => setBrandingForm((prev) => ({ ...prev, primaryColor: value }))}
              placeholder={t('event_080')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('primaryColor')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_081')}</Text>
            <TextInput
              value={brandingForm.secondaryColor}
              onChangeText={(value) => setBrandingForm((prev) => ({ ...prev, secondaryColor: value }))}
              placeholder={t('event_081')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('secondaryColor')}
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{t('event_082')}</Text>
            <TextInput
              value={brandingForm.textColor}
              onChangeText={(value) => setBrandingForm((prev) => ({ ...prev, textColor: value }))}
              placeholder={t('event_082')}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
              editable={canEdit}
            />
            {renderFieldError('textColor')}
            <AppButton
              label={t('event_083')}
              onPress={onSaveBranding}
              backgroundColor={theme.buttonBg}
              pressedColor={theme.buttonBgPressed}
              textColor={theme.buttonText}
            />
          </SurfaceCard>
        ) : null}

        {section === 'overlays' ? (
          <View style={styles.sectionWrap}>
            <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                {t('event_004')}: {selectedEventName}
              </Text>
              <TextInput
                value={overlayForm.name}
                onChangeText={(value) => setOverlayForm((prev) => ({ ...prev, name: value }))}
                placeholder={t('event_084')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                editable={canEdit}
              />
              {renderFieldError('overlayName')}
              <TextInput
                value={overlayForm.fileUrl}
                onChangeText={(value) => setOverlayForm((prev) => ({ ...prev, fileUrl: value }))}
                placeholder={t('event_085')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                editable={canEdit}
              />
              {renderFieldError('fileUrl')}
              <TextInput
                value={overlayForm.type}
                onChangeText={(value) => setOverlayForm((prev) => ({ ...prev, type: value }))}
                placeholder={t('event_086')}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                editable={canEdit}
              />
              {renderFieldError('type')}
              <Text style={[styles.helper, { color: theme.textSecondary }]}>
                {t('event_026')}: {OVERLAY_TYPES.join(', ')}
              </Text>
              <TextInput
                value={overlayForm.layerOrder}
                onChangeText={(value) => setOverlayForm((prev) => ({ ...prev, layerOrder: value }))}
                placeholder={t('event_087')}
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
                style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                editable={canEdit}
              />
              {renderFieldError('layerOrder')}
              <View style={styles.switchRow}>
                <Text style={{ color: theme.textPrimary }}>{t('event_088')}</Text>
                <Switch
                  value={overlayForm.isActive}
                  onValueChange={(value) => setOverlayForm((prev) => ({ ...prev, isActive: value }))}
                />
              </View>
              <AppButton
                label={t('event_089')}
                onPress={onCreateOverlay}
                backgroundColor={theme.buttonBg}
                pressedColor={theme.buttonBgPressed}
                textColor={theme.buttonText}
              />
            </SurfaceCard>

            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>{t('event_090')}</Text>
            {overlays.length === 0 ? <Text style={{ color: theme.textSecondary }}>{t('event_027')}</Text> : null}
            {overlays.map((item) => (
              <SurfaceCard key={String(item.id)} surfaceColor={theme.surface} borderColor={theme.border}>
                <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                  {item.name} ({item.type})
                </Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                  {t('event_028')}: {item.layerOrder}
                </Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>
                  {t('event_029')}: {item.isActive ? t('event_091') : t('event_092')}
                </Text>
                <View style={styles.row}>
                  <AppButton
                    label={t('event_093')}
                    onPress={() => moveOverlay(item, -1)}
                    backgroundColor={theme.primary}
                    pressedColor={theme.buttonBgPressed}
                    textColor={theme.buttonText}
                    style={styles.smallButton}
                  />
                  <AppButton
                    label={t('event_094')}
                    onPress={() => moveOverlay(item, 1)}
                    backgroundColor={theme.primary}
                    pressedColor={theme.buttonBgPressed}
                    textColor={theme.buttonText}
                    style={styles.smallButton}
                  />
                </View>
              </SurfaceCard>
            ))}
          </View>
        ) : null}
      </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  sectionWrap: {
    gap: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  feedback: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
  },
  listContent: {
    gap: tokens.spacing.sm,
  },
  gridRow: {
    gap: tokens.spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xxs,
  },
  kpiNumber: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  kpiDivider: {
    width: 1,
  },
  cardMeta: {
    fontSize: tokens.typography.caption,
  },
  fieldLabel: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.body,
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectDropdown: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
  },
  selectOption: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.sm,
  },
  selectOptionText: {
    fontWeight: '500',
  },
  selectOptionTextActive: {
    fontWeight: '700',
  },
  multiline: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  helper: {
    fontSize: tokens.typography.caption,
  },
  fieldError: {
    fontSize: tokens.typography.caption,
    fontWeight: '600',
    marginTop: -2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
  },
  smallButton: {
    minWidth: 100,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  uploadBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.md,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.sm,
  },
  embedBox: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    minHeight: 64,
    padding: tokens.spacing.sm,
    justifyContent: 'center',
  },
  metricRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricRow4: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
  },
  metricLabel: {
    fontSize: tokens.typography.caption,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: tokens.typography.heading,
    fontWeight: '700',
  },
  metricLink: {
    marginTop: tokens.spacing.sm,
    alignSelf: 'flex-end',
    fontWeight: '700',
  },
  metricSubText: {
    marginTop: tokens.spacing.sm,
    fontWeight: '600',
  },
  linkHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  linkToggleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  linkStatusText: {
    fontWeight: '700',
  },
  linkActionsRow: {
    marginTop: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  linkRow: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.sm,
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    alignItems: 'center',
    flex: 1,
  },
  linkText: {
    fontSize: tokens.typography.caption,
    flex: 1,
  },
});
