import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { MirrorConfigPreview } from '../components/MirrorConfigPreview';
import { MirrorFormatSelector } from '../components/MirrorFormatSelector';
import { MirrorLayoutEditor } from '../components/MirrorLayoutEditor';
import { MirrorTextLayerEditor } from '../components/MirrorTextLayerEditor';
import { MirrorToggleRow } from '../components/MirrorToggleRow';
import { ResourcePicker } from '../components/ResourcePicker';
import { ResourceSelectionSummary } from '../components/ResourceSelectionSummary';
import { ResourceUploadAction } from '../components/ResourceUploadAction';
import { SelectableChipGroup } from '../components/SelectableChipGroup';
import { StatusBadge } from '../components/StatusBadge';
import { ValueStepper } from '../components/ValueStepper';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';
import {
  applyCapturePreset,
  applyMirrorFormat,
  configResourceIds,
  defaultMirrorConfig,
  MIRROR_ANIMATION_STAGES,
  normalizeMirrorConfig,
} from '../domain/magicMirrorConfig';
import {
  createEventResourceApi,
  deleteEventResourceApi,
  getMagicMirrorConfigApi,
  getPublishedMagicMirrorConfigApi,
  listAccountLibraryApi,
  listEventTypesApi,
  listEventResourcesApi,
  publishMagicMirrorConfigApi,
  saveMagicMirrorConfigApi,
  updateAccountLibraryFavoriteApi,
  uploadAccountLibraryFileApi,
  validateMagicMirrorConfigApi,
} from '../services/api/events';
import { pickLibraryResourceFile } from '../services/media/documentPicker';

const SECTIONS = [
  { key: 'event', labelKey: 'mirror_002' }, { key: 'design', labelKey: 'mirror_003' },
  { key: 'experience', labelKey: 'mirror_004' }, { key: 'capture', labelKey: 'mirror_005' },
  { key: 'operation', labelKey: 'mirror_006' }, { key: 'review', labelKey: 'mirror_007' },
];
const RESOURCE_FIELDS = { template: 'templateResourceId', frame: 'frameResourceId', background: 'backgroundResourceId', font: 'fontResourceId', sticker: 'gifOverlayResourceId' };
const STATUS_KEYS = { clean: 'mirror_010', dirty: 'mirror_011', saving: 'mirror_012', saved: 'mirror_013', invalid: 'mirror_014', conflict: 'mirror_015', published: 'mirror_016', error: 'mirror_017' };
const STATUS_FLAGS = { clean: 'info', dirty: 'warn', saving: 'info', saved: 'success', invalid: 'error', conflict: 'warn', published: 'success', error: 'error' };
const MAX_STANDARD_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024;

function roleForAccount(user, accountId) {
  return (user?.accounts || []).find((item) => String(item.account?.id) === String(accountId) && item.status === 'active')?.role?.slug || '';
}

function normalizeLibraryItem(item) {
  return { ...item, id: String(item?.id || ''), libraryAssetId: String(item?.libraryAssetId || item?.asset?.id || ''), isFavorite: Boolean(item?.isFavorite) };
}

function normalizeEventResource(item) {
  return { ...item, id: String(item?.id || ''), libraryAssetId: String(item?.libraryAssetId || ''), purpose: String(item?.purpose || ''), placement: String(item?.placement || '') };
}

function resourceMap(items) {
  return Object.fromEntries((items || []).map((item) => [String(item.id), normalizeEventResource(item)]));
}

function localKey(accountId, eventId, eventModeId) {
  return `mirror-config-draft:v1:${accountId}:${eventId}:${eventModeId}`;
}

function sectionForIssue(path) {
  if (path.startsWith('layout')) return 'design';
  if (path.startsWith('resources') || path.startsWith('experience')) return 'experience';
  if (path.startsWith('capture')) return 'capture';
  if (path.startsWith('delivery') || path.startsWith('runtime') || path.startsWith('print')) return 'operation';
  return 'review';
}

export function MagicMirrorConfigScreen({ event, eventMode, accountId: accountIdProp, onBack, onHeaderChange = null }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const accountId = String(accountIdProp || event?.accountId || '');
  const eventId = String(event?.id || '');
  const eventModeId = String(eventMode?.id || '');
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const canEdit = isSuperAdmin || ['owner', 'admin'].includes(roleForAccount(user, accountId));
  const [section, setSection] = useState('event');
  const [config, setConfig] = useState(defaultMirrorConfig());
  const [serverRevision, setServerRevision] = useState(0);
  const [status, setStatus] = useState('loading');
  const [issues, setIssues] = useState([]);
  const [message, setMessage] = useState('');
  const [published, setPublished] = useState(null);
  const [resources, setResources] = useState([]);
  const [resourceTarget, setResourceTarget] = useState(null);
  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [libraryFilters, setLibraryFilters] = useState({ tab: 'pool', search: '', type: '', eventType: '', motion: '', page: 1 });
  const [eventTypes, setEventTypes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 30, pageCount: 0, total: 0 });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [animationStage, setAnimationStage] = useState(MIRROR_ANIMATION_STAGES[0]);
  const [conflictConfig, setConflictConfig] = useState(null);
  const pendingAssignments = useRef([]);
  const replacedResourceIds = useRef(new Set());
  const assignmentBase = useRef(null);
  const contentScrollRef = useRef(null);
  const sectionContentY = useRef(0);
  const storageKey = localKey(accountId, eventId, eventModeId);
  const resourcesById = useMemo(() => resourceMap(resources), [resources]);

  useEffect(() => {
    onHeaderChange?.({ title: t('mirror_000'), subtitle: event?.name || '', iconName: 'wand-magic-sparkles', onBack, backLabel: t('mirror_001') });
  }, [event?.name, onBack, onHeaderChange]);

  useEffect(() => {
    listEventTypesApi()
      .then((response) => setEventTypes(Array.isArray(response?.eventTypes) ? response.eventTypes : []))
      .catch(() => setEventTypes([]));
  }, []);

  const applyLoadedDraft = useCallback((draft, revision, nextStatus = 'clean') => {
    const normalized = normalizeMirrorConfig(draft);
    setConfig(normalized.config);
    setServerRevision(Number(revision || 0));
    setStatus(normalized.migrated ? 'dirty' : nextStatus);
    return normalized;
  }, []);

  const load = useCallback(async () => {
    if (!eventId || !eventModeId) return;
    setStatus('loading'); setMessage(''); setIssues([]);
    try {
      if (!canEdit) {
        const response = await getPublishedMagicMirrorConfigApi(eventId, eventModeId);
        const normalized = normalizeMirrorConfig(response?.version?.config);
        setConfig(normalized.config);
        setPublished(response?.version || null);
        setResources((response?.manifest || []).map((item) => normalizeEventResource({ ...item, id: item.eventResourceId })));
        setStatus('published');
        return;
      }
      const [response, resourceResponse, localRaw] = await Promise.all([
        getMagicMirrorConfigApi(eventId, eventModeId),
        listEventResourcesApi(eventId),
        AsyncStorage.getItem(storageKey),
      ]);
      const draft = response?.config;
      const normalized = applyLoadedDraft(draft?.config, draft?.revision, draft?.publishedVersionId ? 'published' : 'clean');
      setPublished(draft?.publishedVersionId ? { id: draft.publishedVersionId } : null);
      setResources((resourceResponse?.resources || []).map(normalizeEventResource));
      if (localRaw) {
        const local = JSON.parse(localRaw);
        if (Number(local.baseRevision) === Number(draft?.revision)) {
          Alert.alert(t('mirror_113'), t('mirror_011'), [
            { text: t('mirror_115'), style: 'destructive', onPress: () => AsyncStorage.removeItem(storageKey) },
            { text: t('mirror_114'), onPress: () => { setConfig(normalizeMirrorConfig(local.config).config); setStatus('dirty'); } },
          ]);
        } else {
          setConflictConfig(normalizeMirrorConfig(local.config).config);
          setStatus('conflict');
        }
      } else if (normalized.migrated) {
        setMessage(t('mirror_011'));
      }
    } catch (error) {
      setStatus('error');
      setMessage(error?.status === 404 && !canEdit ? t('mirror_118') : error?.message || t('mirror_104'));
    }
  }, [applyLoadedDraft, canEdit, eventId, eventModeId, storageKey]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canEdit || status !== 'dirty') return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ baseRevision: serverRevision, config, updatedAt: new Date().toISOString() })).catch(() => {});
  }, [canEdit, config, serverRevision, status, storageKey]);

  const mutate = (nextConfig) => {
    if (!canEdit) return;
    setConfig(nextConfig);
    setStatus('dirty');
    setIssues([]);
    setMessage('');
  };

  const selectSection = useCallback((nextSection) => {
    setSection(nextSection);
    requestAnimationFrame(() => {
      contentScrollRef.current?.scrollTo({
        y: Math.max(0, sectionContentY.current - tokens.spacing.sm),
        animated: true,
      });
    });
  }, []);

  const rollbackAssignments = useCallback(async () => {
    const pending = [...pendingAssignments.current];
    await Promise.all(pending.map((item) => deleteEventResourceApi(eventId, item.createdId).catch(() => null)));
    pendingAssignments.current = [];
    replacedResourceIds.current.clear();
    const restored = assignmentBase.current || config;
    assignmentBase.current = null;
    setConfig(restored);
    setResources((current) => current.filter((item) => !pending.some((pendingItem) => pendingItem.createdId === String(item.id))));
    return restored;
  }, [config, eventId]);

  const finalizeAssignments = useCallback(async (savedConfig) => {
    const activeIds = new Set(configResourceIds(savedConfig));
    const removable = [...replacedResourceIds.current].filter((id) => !activeIds.has(String(id)));
    await Promise.all(removable.map((id) => deleteEventResourceApi(eventId, id).catch(() => null)));
    setResources((current) => current.filter((item) => !removable.includes(String(item.id))));
    pendingAssignments.current = [];
    replacedResourceIds.current.clear();
    assignmentBase.current = null;
  }, [eventId]);

  const saveDraft = useCallback(async (draftConfig = config, expectedRevision = serverRevision) => {
    if (!canEdit) return null;
    setStatus('saving'); setMessage('');
    try {
      const response = await saveMagicMirrorConfigApi(eventId, eventModeId, { expectedRevision, schemaVersion: 1, config: draftConfig });
      const saved = response?.config;
      const normalized = normalizeMirrorConfig(saved?.config);
      setConfig(normalized.config);
      setServerRevision(Number(saved?.revision || expectedRevision));
      setStatus('saved');
      setIssues([]);
      await AsyncStorage.removeItem(storageKey);
      await finalizeAssignments(normalized.config);
      return { ...saved, config: normalized.config };
    } catch (error) {
      const validationErrors = error?.payload?.details?.errors || [];
      if (error?.status === 409 || error?.payload?.error === 'CONFIG_REVISION_CONFLICT') {
        const restored = await rollbackAssignments();
        setConflictConfig(restored);
        setStatus('conflict');
        setMessage(t('mirror_112'));
      } else {
        await rollbackAssignments();
        setIssues(validationErrors);
        setStatus(validationErrors.length ? 'invalid' : 'error');
        setMessage(error?.message || t('mirror_105'));
      }
      return null;
    }
  }, [canEdit, config, eventId, eventModeId, finalizeAssignments, rollbackAssignments, serverRevision, storageKey]);

  const validateDraft = async (draftConfig = config) => {
    setStatus('saving'); setMessage('');
    try {
      const result = await validateMagicMirrorConfigApi(eventId, eventModeId, { schemaVersion: 1, config: draftConfig, publish: true });
      setIssues(result?.errors || []);
      setStatus(result?.valid ? 'saved' : 'invalid');
      setMessage(result?.valid ? t('mirror_103') : t('mirror_014'));
      if (!result?.valid && result?.errors?.length) setSection(sectionForIssue(result.errors[0].path || ''));
      return result;
    } catch (error) {
      setStatus('error'); setMessage(error?.message || t('mirror_106'));
      return null;
    }
  };

  const publishDraft = async () => {
    let revision = serverRevision;
    let publishConfig = config;
    if (status === 'dirty' || status === 'invalid') {
      const saved = await saveDraft();
      if (!saved) return;
      revision = Number(saved.revision);
      publishConfig = saved.config;
    }
    const validation = await validateDraft(publishConfig);
    if (!validation?.valid) return;
    Alert.alert(t('mirror_108'), t('mirror_109'), [
      { text: t('account_028'), style: 'cancel' },
      { text: t('mirror_102'), onPress: async () => {
        setStatus('saving');
        try {
          const response = await publishMagicMirrorConfigApi(eventId, eventModeId, revision);
          setPublished(response?.version || null);
          setStatus('published'); setMessage(t('mirror_016'));
          await AsyncStorage.removeItem(storageKey);
        } catch (error) {
          setStatus(error?.status === 409 ? 'conflict' : 'error');
          setMessage(error?.status === 409 ? t('mirror_112') : error?.message || t('mirror_107'));
        }
      } },
    ]);
  };

  const loadServerAfterConflict = async () => {
    await AsyncStorage.removeItem(storageKey);
    setConflictConfig(null);
    await load();
  };

  const keepLocalAfterConflict = async () => {
    if (!conflictConfig) return;
    try {
      const response = await getMagicMirrorConfigApi(eventId, eventModeId);
      const revision = Number(response?.config?.revision || 0);
      setServerRevision(revision);
      setConfig(conflictConfig);
      setStatus('dirty');
      setConflictConfig(null);
      await saveDraft(conflictConfig, revision);
    } catch (error) {
      setStatus('error'); setMessage(error?.message || t('mirror_105'));
    }
  };

  const openResource = (purpose, stage = '') => {
    setResourceTarget({ purpose, field: RESOURCE_FIELDS[purpose] || '', stage });
    setSelectedAsset(null);
    setLibraryFilters({ tab: 'pool', search: '', type: purpose, eventType: '', motion: '', page: 1 });
  };

  const loadLibrary = useCallback(async () => {
    if (!resourceTarget || !accountId) return;
    setLibraryLoading(true); setLibraryError('');
    try {
      const response = await listAccountLibraryApi(accountId, { scope: 'available', favorite: libraryFilters.tab === 'favorites' ? true : '', type: libraryFilters.type || resourceTarget.purpose, eventType: libraryFilters.eventType, motion: libraryFilters.type === 'sticker' ? libraryFilters.motion : '', q: libraryFilters.search, page: libraryFilters.page, pageSize: 30 });
      setLibrary((response?.library || []).map(normalizeLibraryItem));
      setPagination(response?.pagination || { page: 1, pageCount: 0, total: 0, pageSize: 30 });
    } catch (error) { setLibraryError(error?.message || t('resource_028')); }
    finally { setLibraryLoading(false); }
  }, [accountId, libraryFilters, resourceTarget]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const assignSelectedResource = async () => {
    if (!selectedAsset || !resourceTarget || !canEdit) return;
    if (selectedAsset.asset?.type !== resourceTarget.purpose) { setMessage(t('mirror_035')); return; }
    try {
      if (!assignmentBase.current) assignmentBase.current = config;
      const created = await createEventResourceApi(eventId, { libraryAssetId: selectedAsset.libraryAssetId, eventModeId, purpose: resourceTarget.purpose, placement: resourceTarget.stage || null, orderIndex: resources.filter((item) => item.purpose === resourceTarget.purpose).length, isActive: true });
      const resource = normalizeEventResource(created?.resource || {});
      if (!resource.id) throw new Error(t('resource_034'));
      pendingAssignments.current.push({ createdId: resource.id });
      let nextResources = { ...config.resources };
      if (resourceTarget.purpose === 'animation') nextResources.animationResourceIds = [...new Set([...(nextResources.animationResourceIds || []).map(String), resource.id])];
      else {
        const previous = nextResources[resourceTarget.field];
        if (previous) replacedResourceIds.current.add(String(previous));
        nextResources[resourceTarget.field] = resource.id;
      }
      setResources((current) => [...current, resource]);
      mutate({ ...config, resources: nextResources });
      setSelectedAsset(null); setResourceTarget(null);
      showToast({ type: 'success', message: t('mirror_036') });
    } catch (error) { setMessage(error?.message || t('resource_034')); setStatus('error'); }
  };

  const unlinkResource = (purpose, resourceId) => {
    if (!canEdit || !resourceId) return;
    replacedResourceIds.current.add(String(resourceId));
    const nextResources = { ...config.resources };
    if (purpose === 'animation') nextResources.animationResourceIds = (nextResources.animationResourceIds || []).filter((id) => String(id) !== String(resourceId));
    else nextResources[RESOURCE_FIELDS[purpose]] = null;
    mutate({ ...config, resources: nextResources });
  };

  const uploadResource = async () => {
    if (!resourceTarget || !canEdit) return;
    try {
      const file = await pickLibraryResourceFile();
      if (!file) return;
      const maxBytes = String(file.type || '').startsWith('video/') ? MAX_VIDEO_UPLOAD_BYTES : MAX_STANDARD_UPLOAD_BYTES;
      if (!file.fileSize || file.fileSize > maxBytes) throw new Error(t('resource_043'));
      setUploadProgress(1);
      await uploadAccountLibraryFileApi(accountId, file, resourceTarget.purpose, setUploadProgress);
      setUploadProgress(0);
      await loadLibrary();
    } catch (error) { setUploadProgress(0); setMessage(error?.message || t('resource_033')); }
  };

  const toggleFavorite = async (item) => {
    if (!canEdit) return;
    try { await updateAccountLibraryFavoriteApi(accountId, item.libraryAssetId, !item.isFavorite); await loadLibrary(); }
    catch (error) { setMessage(error?.message || t('resource_030')); }
  };

  const renderResourcePicker = () => resourceTarget ? (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.primary}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_033')}</Text>
      {uploadProgress ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_042')} {uploadProgress}%</Text> : null}
      <ResourceUploadAction theme={theme} purpose={resourceTarget.purpose} onPurposeChange={(purpose) => openResource(purpose, purpose === 'animation' ? animationStage : '')} disabled={!canEdit || Boolean(uploadProgress)} onUpload={uploadResource} />
      <ResourceSelectionSummary item={selectedAsset} theme={theme} disabled={!selectedAsset || !canEdit} onClear={() => setSelectedAsset(null)} onConfirm={assignSelectedResource} />
      <ResourcePicker items={library} theme={theme} canManage={canEdit} loading={libraryLoading} error={libraryError} filters={libraryFilters} eventTypes={eventTypes} onFiltersChange={setLibraryFilters} selectedId={selectedAsset?.id || ''} onSelect={setSelectedAsset} onToggleFavorite={toggleFavorite} onRetry={loadLibrary} pagination={pagination} onPageChange={(page) => setLibraryFilters((current) => ({ ...current, page }))} />
      <AppButton label={t('account_028')} onPress={() => setResourceTarget(null)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
    </SurfaceCard>
  ) : null;

  const resourceAction = (purpose, labelKey, stage = '') => {
    const field = RESOURCE_FIELDS[purpose];
    const currentId = field ? config.resources[field] : null;
    return (
      <SurfaceCard key={`${purpose}-${stage}`} surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t(labelKey)}</Text>
        {currentId ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{resourcesById[String(currentId)]?.asset?.name || `#${currentId}`}</Text> : null}
        <View style={styles.actions}>
          <AppButton label={t('mirror_033')} onPress={() => openResource(purpose, stage)} disabled={!canEdit} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.flexButton} />
          {currentId ? <AppButton label={t('mirror_034')} onPress={() => unlinkResource(purpose, currentId)} disabled={!canEdit} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.flexButton} /> : null}
        </View>
      </SurfaceCard>
    );
  };

  const renderEventSection = () => (
    <View style={styles.section}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_031')}</Text>
        <MirrorFormatSelector value={config.layout.format} onChange={(format) => mutate(applyMirrorFormat(config, format))} theme={theme} disabled={!canEdit} />
      </SurfaceCard>
      {resourceAction('template', 'resource_007')}
      {resourceAction('frame', 'resource_008')}
      {resourceAction('background', 'resource_012')}
      {renderResourcePicker()}
    </View>
  );

  const renderDesignSection = () => (
    <View style={styles.section}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}><MirrorLayoutEditor config={config} onChange={mutate} theme={theme} disabled={!canEdit} /></SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}><MirrorTextLayerEditor config={config} onChange={mutate} theme={theme} disabled={!canEdit} event={event} /></SurfaceCard>
      {resourceAction('font', 'resource_011')}
      {renderResourcePicker()}
    </View>
  );

  const renderExperienceSection = () => {
    const stageResources = resources.filter((item) => item.purpose === 'animation' && item.placement === animationStage && (config.resources.animationResourceIds || []).map(String).includes(String(item.id)));
    return (
      <View style={styles.section}>
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_080')}</Text>
          <MirrorToggleRow label={t('mirror_081')} value={config.experience.virtualAssistantEnabled} onChange={(virtualAssistantEnabled) => mutate({ ...config, experience: { ...config.experience, virtualAssistantEnabled } })} theme={theme} disabled={!canEdit} />
          <SelectableChipGroup theme={theme} label={t('mirror_082')} options={[{ value: 'video-vertical', label: t('mirror_083') }, { value: 'minimal', label: t('mirror_084') }, { value: 'party', label: t('mirror_085') }]} value={config.experience.style} disabled={!canEdit} onChange={(value) => mutate({ ...config, experience: { ...config.experience, style: value || config.experience.style } })} />
        </SurfaceCard>
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
          <SelectableChipGroup theme={theme} label={t('mirror_086')} options={MIRROR_ANIMATION_STAGES.map((stage) => ({ value: stage, label: t(`mirror_stage_${stage}`) }))} value={animationStage} onChange={(value) => setAnimationStage(value || animationStage)} />
          <MirrorToggleRow label={t('mirror_087')} value={Boolean(config.experience.randomByStage?.[animationStage])} onChange={(enabled) => mutate({ ...config, experience: { ...config.experience, randomByStage: { ...config.experience.randomByStage, [animationStage]: enabled } } })} theme={theme} disabled={!canEdit} />
          <AppButton label={t('mirror_033')} onPress={() => openResource('animation', animationStage)} disabled={!canEdit} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
          <Text style={[styles.meta, { color: theme.textSecondary }]}>{t('mirror_088')}: {stageResources.length}</Text>
          {stageResources.map((resource) => <View key={resource.id} style={styles.resourceRow}><Text style={[styles.meta, { color: theme.textPrimary }]}>{resource.asset?.name || `#${resource.id}`}</Text><AppButton label={t('mirror_034')} onPress={() => unlinkResource('animation', resource.id)} disabled={!canEdit} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.rowButton} /></View>)}
        </SurfaceCard>
        {renderResourcePicker()}
      </View>
    );
  };

  const renderCaptureSection = () => (
    <View style={styles.section}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <SelectableChipGroup theme={theme} label={t('mirror_060')} options={[{ value: 'soft', label: t('mirror_061') }, { value: 'fast', label: t('mirror_062') }, { value: 'party', label: t('mirror_063') }, { value: 'event', label: t('mirror_064') }]} value="" disabled={!canEdit} onChange={(value) => mutate(applyCapturePreset(config, value))} />
        <View style={styles.stepperGrid}>
          <ValueStepper label={t('mirror_065')} value={config.capture.firstCountdownSeconds} onChange={(value) => mutate({ ...config, capture: { ...config.capture, firstCountdownSeconds: value } })} min={1} max={30} theme={theme} disabled={!canEdit} />
          <ValueStepper label={t('mirror_066')} value={config.capture.nextCountdownSeconds} onChange={(value) => mutate({ ...config, capture: { ...config.capture, nextCountdownSeconds: value } })} min={1} max={30} theme={theme} disabled={!canEdit} />
          <ValueStepper label={t('mirror_067')} value={config.capture.reviewSeconds} onChange={(value) => mutate({ ...config, capture: { ...config.capture, reviewSeconds: value } })} min={1} max={30} theme={theme} disabled={!canEdit} />
        </View>
        <SelectableChipGroup theme={theme} label={t('mirror_071')} options={[{ value: 'normal', label: t('mirror_073') }, { value: 'wide', label: t('mirror_074') }, { value: 'ultra-wide', label: t('mirror_075') }]} value={config.capture.lens} disabled={!canEdit} onChange={(value) => mutate({ ...config, capture: { ...config.capture, lens: value || config.capture.lens } })} />
        <SelectableChipGroup theme={theme} label={t('mirror_072')} options={[{ value: 'medium', label: t('mirror_076') }, { value: 'high', label: t('mirror_077') }, { value: 'superior', label: t('mirror_078') }]} value={config.capture.quality} disabled={!canEdit} onChange={(value) => mutate({ ...config, capture: { ...config.capture, quality: value || config.capture.quality } })} />
        <MirrorToggleRow label={t('mirror_068')} value={config.capture.flashEnabled} onChange={(flashEnabled) => mutate({ ...config, capture: { ...config.capture, flashEnabled } })} theme={theme} disabled={!canEdit} />
        <MirrorToggleRow label={t('mirror_069')} value={config.capture.preserveOriginals} onChange={(preserveOriginals) => mutate({ ...config, capture: { ...config.capture, preserveOriginals } })} theme={theme} disabled={!canEdit} />
        <MirrorToggleRow label={t('mirror_070')} value={config.capture.roamingMode} onChange={(roamingMode) => mutate({ ...config, capture: { ...config.capture, roamingMode } })} theme={theme} disabled={!canEdit} />
      </SurfaceCard>
    </View>
  );

  const renderOperationSection = () => (
    <View style={styles.section}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_090')}</Text>
        <MirrorToggleRow label={t('mirror_091')} value={config.delivery.qr} onChange={(qr) => mutate({ ...config, delivery: { ...config.delivery, qr } })} theme={theme} disabled={!canEdit} />
        <MirrorToggleRow label={t('mirror_092')} value={config.delivery.share} onChange={(share) => mutate({ ...config, delivery: { ...config.delivery, share } })} theme={theme} disabled={!canEdit} />
        <MirrorToggleRow label={t('mirror_093')} value={config.delivery.download} onChange={(download) => mutate({ ...config, delivery: { ...config.delivery, download } })} theme={theme} disabled={!canEdit} />
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <MirrorToggleRow label={t('mirror_094')} value={config.runtime.operatorMenuEnabled} onChange={(operatorMenuEnabled) => mutate({ ...config, runtime: { ...config.runtime, operatorMenuEnabled } })} theme={theme} disabled={!canEdit} />
        <ValueStepper label={`${t('mirror_095')} (s)`} value={config.runtime.autoResetSeconds} onChange={(autoResetSeconds) => mutate({ ...config, runtime: { ...config.runtime, autoResetSeconds } })} min={5} max={300} step={5} theme={theme} disabled={!canEdit} />
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_096')}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>{t('mirror_097')}</Text>
        <StatusBadge label={t('mirror_098')} flag="warn" />
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>GIF · {t('mirror_098')}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>Background removal · {t('mirror_098')}</Text>
      </SurfaceCard>
    </View>
  );

  const renderReviewSection = () => (
    <View style={styles.section}>
      {!canEdit ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('mirror_116')}</Text> : null}
      {published ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('mirror_117')}: {published.version || published.id}</Text> : null}
      {issues.length ? <SurfaceCard surfaceColor={theme.surface} borderColor={theme.alert}>{issues.map((entry, index) => <Text key={`${entry.path}-${index}`} style={[styles.feedback, { color: theme.alert }]}>{entry.path}: {entry.message}</Text>)}</SurfaceCard> : null}
      {status === 'conflict' ? <SurfaceCard surfaceColor={theme.surface} borderColor={theme.secondary}><Text style={[styles.feedback, { color: theme.textPrimary }]}>{t('mirror_112')}</Text><View style={styles.actions}><AppButton label={t('mirror_110')} onPress={loadServerAfterConflict} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.flexButton} /><AppButton label={t('mirror_111')} onPress={keepLocalAfterConflict} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} style={styles.flexButton} /></View></SurfaceCard> : null}
      {canEdit ? <View style={styles.section}><AppButton testID="mirror-save" label={t('mirror_100')} onPress={() => saveDraft()} disabled={status === 'saving'} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} /><AppButton testID="mirror-validate" label={t('mirror_101')} onPress={() => validateDraft()} disabled={status === 'saving'} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} /><AppButton testID="mirror-publish" label={t('mirror_102')} onPress={publishDraft} disabled={status === 'saving' || status === 'conflict'} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /></View> : null}
    </View>
  );

  if (status === 'loading') return <View style={[styles.loading, { backgroundColor: theme.background }]}><Text style={{ color: theme.textSecondary }}>{t('mirror_009')}</Text></View>;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HorizontalSubMenu items={SECTIONS.map((item) => ({ key: item.key, label: t(item.labelKey) }))} selectedKey={section} onSelect={selectSection} theme={theme} />
      <ScrollView ref={contentScrollRef} contentContainerStyle={styles.content}>
        <View style={styles.statusRow}><StatusBadge label={t(STATUS_KEYS[status] || 'mirror_017')} flag={STATUS_FLAGS[status] || 'error'} /><Text style={[styles.meta, { color: theme.textSecondary }]}>r{serverRevision}</Text></View>
        {message ? <Text style={[styles.feedback, { color: status === 'error' || status === 'invalid' ? theme.alert : theme.textSecondary }]}>{message}</Text> : null}
        <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}><Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_030')}</Text><MirrorConfigPreview config={config} theme={theme} resourcesById={resourcesById} compact /></SurfaceCard>
        <View
          key={section}
          onLayout={(layoutEvent) => {
            sectionContentY.current = layoutEvent.nativeEvent.layout.y;
          }}
        >
          {section === 'event' ? renderEventSection() : null}
          {section === 'design' ? renderDesignSection() : null}
          {section === 'experience' ? renderExperienceSection() : null}
          {section === 'capture' ? renderCaptureSection() : null}
          {section === 'operation' ? renderOperationSection() : null}
          {section === 'review' ? renderReviewSection() : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.md },
  content: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl * 3, gap: tokens.spacing.md },
  section: { gap: tokens.spacing.md },
  title: { fontSize: tokens.typography.body, fontWeight: '700' },
  meta: { fontSize: tokens.typography.caption },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  flexButton: { flex: 1, minWidth: tokens.spacing.xl * 4 },
  stepperGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  resourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  rowButton: { minWidth: tokens.spacing.xl * 3 },
});
