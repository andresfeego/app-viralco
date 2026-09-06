import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { DesignAssetCarousel } from '../components/DesignAssetCarousel';
import { DesignAssetGrid } from '../components/DesignAssetGrid';
import { BackgroundColorPicker } from '../components/BackgroundColorPicker';
import { IconTextButton } from '../components/IconTextButton';
import { MirrorLayoutEditor } from '../components/MirrorLayoutEditor';
import { MirrorFrameEditor } from '../components/MirrorFrameEditor';
import { MirrorBackgroundEditor } from '../components/MirrorBackgroundEditor';
import { MirrorConfigPreview } from '../components/MirrorConfigPreview';
import { MirrorPreviewModal } from '../components/MirrorPreviewModal';
import { MirrorStickerEditor } from '../components/MirrorStickerEditor';
import { PhotoLayoutTemplateSaveModal } from '../components/PhotoLayoutTemplateSaveModal';
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
  addBackgroundColorLayer,
  addBackgroundResourceLayer,
  addStickerLayer,
  applyMirrorFormat,
  addFrameLayer,
  cloneValue,
  configResourceIds,
  customizePhotoLayout,
  defaultMirrorConfig,
  MIRROR_ANIMATION_STAGES,
  MIRROR_MAX_FRAME_LAYERS,
  MIRROR_MAX_BACKGROUND_LAYERS,
  MIRROR_MAX_STICKER_LAYERS,
  normalizeMirrorConfig,
  removeBackgroundResourceLayers,
  removeFrameResourceLayers,
  removeStickerResourceLayers,
} from '../domain/magicMirrorConfig';
import {
  applyPhotoLayoutTemplateApi,
  createAccountPhotoLayoutTemplateApi,
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
import { userErrorMessage } from '../services/errorHandling';

const SECTIONS = [
  { key: 'design', labelKey: 'mirror_003' },
  { key: 'experience', labelKey: 'mirror_004' }, { key: 'capture', labelKey: 'mirror_005' },
  { key: 'operation', labelKey: 'mirror_006' }, { key: 'review', labelKey: 'mirror_007' },
];
const DESIGN_SECTIONS = [
  { key: 'format', labelKey: 'mirror_031' },
  { key: 'frame', labelKey: 'resource_008' },
  { key: 'background', labelKey: 'resource_012' },
  { key: 'text', labelKey: 'mirror_137' },
  { key: 'sticker', labelKey: 'resource_053' },
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

export function MagicMirrorConfigScreen({ event, eventMode, accountId: accountIdProp, onBack, onOpenResources = null, onHeaderChange = null }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const accountId = String(accountIdProp || event?.accountId || '');
  const eventId = String(event?.id || '');
  const eventModeId = String(eventMode?.id || '');
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const canEdit = isSuperAdmin || ['owner', 'admin'].includes(roleForAccount(user, accountId));
  const [section, setSection] = useState('design');
  const [designSection, setDesignSection] = useState('format');
  const [previewVisible, setPreviewVisible] = useState(false);
  const [canvasInteracting, setCanvasInteracting] = useState(false);
  const [templateSaveVisible, setTemplateSaveVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState('');
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
  const [designLibrary, setDesignLibrary] = useState({ templatesGlobal: [], templatesFavorites: [], frames: [], backgrounds: [], stickers: [], fonts: [] });
  const [designLibraryLoading, setDesignLibraryLoading] = useState(false);
  const [designLibraryError, setDesignLibraryError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [animationStage, setAnimationStage] = useState(MIRROR_ANIMATION_STAGES[0]);
  const [conflictConfig, setConflictConfig] = useState(null);
  const pendingAssignments = useRef([]);
  const replacedResourceIds = useRef(new Set());
  const assignmentBase = useRef(null);
  const layoutTemplateOrigin = useRef(null);
  const contentScrollRef = useRef(null);
  const sectionContentY = useRef(0);
  const storageKey = localKey(accountId, eventId, eventModeId);
  const resourcesById = useMemo(() => resourceMap(resources), [resources]);

  const eventResourceAsLibraryItem = useCallback((resourceId) => {
    const resource = resourcesById[String(resourceId || '')];
    return resource ? { id: resource.id, eventResourceId: resource.id, libraryAssetId: resource.libraryAssetId, asset: resource.asset } : null;
  }, [resourcesById]);

  useEffect(() => {
    onHeaderChange?.({ title: event?.name || t('mirror_000'), subtitle: t('mirror_000'), iconName: 'wand-magic-sparkles', onBack, backLabel: t('mirror_001') });
  }, [event?.name, onBack, onHeaderChange]);

  useEffect(() => {
    listEventTypesApi()
      .then((response) => setEventTypes(Array.isArray(response?.types) ? response.types : []))
      .catch(() => setEventTypes([]));
  }, []);

  const loadDesignLibrary = useCallback(async () => {
    if (!accountId) return;
    setDesignLibraryLoading(true);
    setDesignLibraryError('');
    try {
      const query = (type, extra = {}) => listAccountLibraryApi(accountId, { scope: 'available', favorite: true, type, page: 1, pageSize: 100, ...extra });
      const [templatesGlobal, templatesFavorites, frames, backgrounds, stickers, fonts] = await Promise.all([
        listAccountLibraryApi(accountId, { scope: 'global', type: 'template', page: 1, pageSize: 100 }),
        query('template'), query('frame'), query('background'), query('sticker', { motion: 'static' }), query('font'),
      ]);
      setDesignLibrary({
        templatesGlobal: (templatesGlobal?.library || []).map(normalizeLibraryItem),
        templatesFavorites: (templatesFavorites?.library || []).map(normalizeLibraryItem),
        frames: (frames?.library || []).map(normalizeLibraryItem),
        backgrounds: (backgrounds?.library || []).map(normalizeLibraryItem),
        stickers: (stickers?.library || []).map(normalizeLibraryItem),
        fonts: (fonts?.library || []).map(normalizeLibraryItem),
      });
    } catch (error) {
      setDesignLibraryError(userErrorMessage(error, t('resource_028')));
    } finally {
      setDesignLibraryLoading(false);
    }
  }, [accountId]);

  useEffect(() => { loadDesignLibrary(); }, [loadDesignLibrary]);

  const applyLoadedDraft = useCallback((draft, revision, nextStatus = 'clean') => {
    const normalized = normalizeMirrorConfig(draft);
    const templateResourceId = normalized.config.resources.layoutTemplateResourceId;
    layoutTemplateOrigin.current = templateResourceId ? { resourceId: String(templateResourceId), layout: cloneValue(normalized.config.layout) } : null;
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
        const templateResourceId = normalized.config.resources.layoutTemplateResourceId;
        layoutTemplateOrigin.current = templateResourceId ? { resourceId: String(templateResourceId), layout: cloneValue(normalized.config.layout) } : null;
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
      setMessage(error?.status === 404 && !canEdit ? t('mirror_118') : userErrorMessage(error, t('mirror_104')));
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
    const restoredTemplateId = restored.resources.layoutTemplateResourceId;
    layoutTemplateOrigin.current = restoredTemplateId ? { resourceId: String(restoredTemplateId), layout: cloneValue(restored.layout) } : null;
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
    if (!savedConfig.resources.layoutTemplateResourceId) layoutTemplateOrigin.current = null;
  }, [eventId]);

  const saveDraft = useCallback(async (draftConfig = config, expectedRevision = serverRevision) => {
    if (!canEdit) return null;
    setStatus('saving'); setMessage('');
    try {
      const response = await saveMagicMirrorConfigApi(eventId, eventModeId, { expectedRevision, schemaVersion: 1, config: draftConfig });
      const saved = response?.config;
      const normalized = normalizeMirrorConfig(saved?.config);
      const templateResourceId = normalized.config.resources.layoutTemplateResourceId;
      layoutTemplateOrigin.current = templateResourceId ? { resourceId: String(templateResourceId), layout: cloneValue(normalized.config.layout) } : null;
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
        setMessage(userErrorMessage(error, t('mirror_105')));
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
      setStatus('error'); setMessage(userErrorMessage(error, t('mirror_106')));
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
          setMessage(error?.status === 409 ? t('mirror_112') : userErrorMessage(error, t('mirror_107')));
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
      setStatus('error'); setMessage(userErrorMessage(error, t('mirror_105')));
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
    } catch (error) { setLibraryError(userErrorMessage(error, t('resource_028'))); }
    finally { setLibraryLoading(false); }
  }, [accountId, libraryFilters, resourceTarget]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const assignSelectedResource = async () => {
    if (!selectedAsset || !resourceTarget || !canEdit) return;
    if (selectedAsset.asset?.type !== resourceTarget.purpose) { setMessage(t('mirror_035')); return; }
    try {
      if (resourceTarget.purpose === 'template') {
        let revision = serverRevision;
        if (status === 'dirty' || status === 'invalid') {
          const savedCurrent = await saveDraft();
          if (!savedCurrent) return;
          revision = Number(savedCurrent.revision);
        }
        setStatus('saving');
        const response = await applyPhotoLayoutTemplateApi(eventId, eventModeId, selectedAsset.libraryAssetId, revision);
        const saved = response?.config;
        const normalized = normalizeMirrorConfig(saved?.config);
        setConfig(normalized.config);
        setServerRevision(Number(saved?.revision || revision));
        setStatus('saved');
        setIssues([]);
        await AsyncStorage.removeItem(storageKey);
        const resourceResponse = await listEventResourcesApi(eventId);
        setResources((resourceResponse?.resources || []).map(normalizeEventResource));
        setSelectedAsset(null);
        setResourceTarget(null);
        showToast({ type: 'success', message: t('mirror_126') });
        return;
      }
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
    } catch (error) {
      if (error?.status === 409) {
        setConflictConfig(config);
        setStatus('conflict');
        setMessage(t('mirror_112'));
      } else {
        setMessage(userErrorMessage(error, resourceTarget.purpose === 'template' ? t('mirror_129') : t('resource_034')));
        setStatus('error');
      }
    }
  };

  const applyDesignTemplate = async (item) => {
    if (!item || !canEdit) return;
    const currentTemplate = resourcesById[String(config.resources.layoutTemplateResourceId || '')];
    if (String(currentTemplate?.libraryAssetId || '') === String(item.libraryAssetId)) return;
    try {
      let revision = serverRevision;
      if (status === 'dirty' || status === 'invalid') {
        const savedCurrent = await saveDraft();
        if (!savedCurrent) return;
        revision = Number(savedCurrent.revision);
      }
      setStatus('saving');
      const response = await applyPhotoLayoutTemplateApi(eventId, eventModeId, item.libraryAssetId, revision);
      const saved = response?.config;
      const normalized = normalizeMirrorConfig(saved?.config);
      const templateResourceId = normalized.config.resources.layoutTemplateResourceId;
      layoutTemplateOrigin.current = templateResourceId ? { resourceId: String(templateResourceId), layout: cloneValue(normalized.config.layout) } : null;
      setConfig(normalized.config);
      setServerRevision(Number(saved?.revision || revision));
      setStatus('saved');
      setIssues([]);
      await AsyncStorage.removeItem(storageKey);
      const resourceResponse = await listEventResourcesApi(eventId);
      setResources((resourceResponse?.resources || []).map(normalizeEventResource));
      showToast({ type: 'success', message: t('mirror_126') });
    } catch (error) {
      setStatus(error?.status === 409 ? 'conflict' : 'error');
      setMessage(error?.status === 409 ? t('mirror_112') : userErrorMessage(error, t('mirror_129')));
    }
  };

  const selectCustomLayout = () => {
    if (!canEdit) return;
    const previous = config.resources.layoutTemplateResourceId;
    if (previous) {
      if (!assignmentBase.current) assignmentBase.current = config;
      replacedResourceIds.current.add(String(previous));
    }
    layoutTemplateOrigin.current = null;
    const custom = applyMirrorFormat(config, 'personalizar-5x15');
    mutate({ ...custom, resources: { ...custom.resources, layoutTemplateResourceId: null } });
  };

  const customizeLayout = (nextConfig) => {
    if (!canEdit) return;
    const templateResourceId = config.resources.layoutTemplateResourceId;
    if (templateResourceId) {
      if (!assignmentBase.current) assignmentBase.current = config;
      if (!layoutTemplateOrigin.current) layoutTemplateOrigin.current = { resourceId: String(templateResourceId), layout: cloneValue(config.layout) };
      replacedResourceIds.current.add(String(templateResourceId));
    }
    mutate(customizePhotoLayout(nextConfig));
  };

  const restoreLayout = () => {
    if (!canEdit) return;
    const origin = layoutTemplateOrigin.current;
    if (origin) {
      replacedResourceIds.current.delete(String(origin.resourceId));
      mutate({ ...config, layout: cloneValue(origin.layout), resources: { ...config.resources, layoutTemplateResourceId: origin.resourceId } });
      return;
    }
    customizeLayout(applyMirrorFormat(config, 'personalizar-5x15'));
  };

  const associateDesignAsset = async (item, purpose, layerId = '') => {
    if (!item || !canEdit || item.asset?.type !== purpose) return;
    if (purpose === 'background' && (config.layout.backgroundLayers || []).length >= MIRROR_MAX_BACKGROUND_LAYERS) {
      setMessage(t('mirror_background_limit'));
      return;
    }
    if (purpose === 'frame' && (config.layout.frameLayers || []).length >= MIRROR_MAX_FRAME_LAYERS) {
      setMessage(t('mirror_frame_limit'));
      return;
    }
    if (purpose === 'sticker' && item.asset?.motionType !== 'static') {
      setMessage(t('mirror_140'));
      return;
    }
    if (purpose === 'sticker' && (config.layout.stickerLayers || []).length >= MIRROR_MAX_STICKER_LAYERS) {
      setMessage(t('mirror_141'));
      return;
    }
    try {
      if (!assignmentBase.current) assignmentBase.current = config;
      let resource = purpose === 'font' || purpose === 'frame' || purpose === 'background' || purpose === 'sticker'
        ? resources.find((entry) => entry.purpose === purpose && String(entry.libraryAssetId) === String(item.libraryAssetId))
        : null;
      if (!resource) {
        const created = await createEventResourceApi(eventId, {
          libraryAssetId: item.libraryAssetId,
          eventModeId,
          purpose,
          placement: 'design',
          orderIndex: resources.filter((entry) => entry.purpose === purpose).length,
          isActive: true,
        });
        // The association endpoint may return the event resource without every
        // preview variant. Keep the already loaded library asset so the new
        // layer can render immediately instead of waiting for a full reload.
        const createdAsset = created?.resource?.asset || {};
        resource = normalizeEventResource({
          ...(created?.resource || {}),
          asset: {
            ...(item.asset || {}),
            ...createdAsset,
            variants: createdAsset.variants || item.asset?.variants,
          },
        });
        if (!resource.id) throw new Error(t('resource_034'));
        pendingAssignments.current.push({ createdId: resource.id });
        setResources((current) => [...current, resource]);
      }
      if (purpose === 'sticker') {
        replacedResourceIds.current.delete(String(resource.id));
        mutate(addStickerLayer(config, resource.id));
        return;
      }
      if (purpose === 'frame') {
        replacedResourceIds.current.delete(String(resource.id));
        mutate(addFrameLayer(config, resource.id));
        return;
      }
      if (purpose === 'background') {
        replacedResourceIds.current.delete(String(resource.id));
        mutate(addBackgroundResourceLayer(config, resource.id));
        return;
      }
      if (purpose === 'font') {
        const currentLayer = (config.layout.textLayers || []).find((layer) => layer.id === layerId);
        if (!currentLayer) return;
        if (currentLayer.fontResourceId && String(currentLayer.fontResourceId) !== String(resource.id)) replacedResourceIds.current.add(String(currentLayer.fontResourceId));
        mutate({ ...config, layout: { ...config.layout, textLayers: config.layout.textLayers.map((layer) => layer.id === layerId ? { ...layer, font: 'resource', fontResourceId: resource.id } : layer) } });
        return;
      }
      const field = RESOURCE_FIELDS[purpose];
      const previous = config.resources[field];
      if (previous && String(previous) !== String(resource.id)) replacedResourceIds.current.add(String(previous));
      mutate({ ...config, resources: { ...config.resources, [field]: resource.id } });
    } catch (error) {
      setStatus('error');
      setMessage(userErrorMessage(error, t('resource_034')));
    }
  };

  const mutateStickerLayers = (nextConfig) => {
    if (!canEdit) return;
    const currentIds = new Set((config.layout.stickerLayers || []).map((layer) => String(layer.resourceId)));
    const nextIds = new Set((nextConfig.layout.stickerLayers || []).map((layer) => String(layer.resourceId)));
    currentIds.forEach((id) => { if (!nextIds.has(id)) replacedResourceIds.current.add(id); });
    nextIds.forEach((id) => replacedResourceIds.current.delete(id));
    mutate(nextConfig);
  };

  const removeStickerAsset = (item) => {
    const resourceIds = resources.filter((entry) => entry.purpose === 'sticker' && String(entry.libraryAssetId) === String(item.libraryAssetId)).map((entry) => String(entry.id));
    mutateStickerLayers(removeStickerResourceLayers(config, resourceIds));
  };

  const mutateFrameLayers = (nextConfig) => {
    if (!canEdit) return;
    const currentIds = new Set((config.layout.frameLayers || []).map((layer) => String(layer.resourceId)));
    const nextIds = new Set((nextConfig.layout.frameLayers || []).map((layer) => String(layer.resourceId)));
    currentIds.forEach((id) => { if (!nextIds.has(id)) replacedResourceIds.current.add(id); });
    nextIds.forEach((id) => replacedResourceIds.current.delete(id));
    mutate(nextConfig);
  };

  const removeFrameAsset = (item) => {
    const resourceIds = resources.filter((entry) => entry.purpose === 'frame' && String(entry.libraryAssetId) === String(item.libraryAssetId)).map((entry) => String(entry.id));
    mutateFrameLayers(removeFrameResourceLayers(config, resourceIds));
  };

  const mutateBackgroundLayers = (nextConfig) => {
    if (!canEdit) return;
    const currentIds = new Set((config.layout.backgroundLayers || []).filter((layer) => layer.kind === 'resource').map((layer) => String(layer.resourceId)));
    const nextIds = new Set((nextConfig.layout.backgroundLayers || []).filter((layer) => layer.kind === 'resource').map((layer) => String(layer.resourceId)));
    currentIds.forEach((id) => { if (!nextIds.has(id)) replacedResourceIds.current.add(id); });
    nextIds.forEach((id) => replacedResourceIds.current.delete(id));
    mutate(nextConfig);
  };

  const removeBackgroundAsset = (item) => {
    const resourceIds = resources.filter((entry) => entry.purpose === 'background' && String(entry.libraryAssetId) === String(item.libraryAssetId)).map((entry) => String(entry.id));
    mutateBackgroundLayers(removeBackgroundResourceLayers(config, resourceIds));
  };

  const addBackgroundColor = (color) => {
    if (!canEdit) return;
    if ((config.layout.backgroundLayers || []).length >= MIRROR_MAX_BACKGROUND_LAYERS) {
      setMessage(t('mirror_background_limit'));
      return;
    }
    mutateBackgroundLayers(addBackgroundColorLayer(config, color));
  };

  const removeTextFont = (layerId, resourceId) => {
    if (!canEdit) return;
    if (resourceId) replacedResourceIds.current.add(String(resourceId));
    mutate({ ...config, layout: { ...config.layout, textLayers: (config.layout.textLayers || []).map((layer) => layer.id === layerId ? { ...layer, font: 'arial', fontResourceId: null } : layer) } });
  };

  const saveLayoutTemplate = async () => {
    const name = templateName.trim();
    if (!name || !canEdit) return;
    setTemplateSaving(true);
    setTemplateError('');
    try {
      await createAccountPhotoLayoutTemplateApi(accountId, {
        name,
        layout: customizePhotoLayout(config).layout,
        appliesToAllEventTypes: true,
        metadata: { source: 'magic-mirror-editor' },
      });
      setTemplateSaveVisible(false);
      setTemplateName('');
      await loadDesignLibrary();
      showToast({ type: 'success', message: t('mirror_127') });
      await loadDesignLibrary();
      if (resourceTarget?.purpose === 'template') await loadLibrary();
    } catch (error) {
      setTemplateError(userErrorMessage(error, t('mirror_128')));
    } finally {
      setTemplateSaving(false);
    }
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
    } catch (error) { setUploadProgress(0); setMessage(userErrorMessage(error, t('resource_033'))); }
  };

  const toggleFavorite = async (item) => {
    if (!canEdit) return;
    try { await updateAccountLibraryFavoriteApi(accountId, item.libraryAssetId, !item.isFavorite); await loadLibrary(); }
    catch (error) { setMessage(userErrorMessage(error, t('resource_030'))); }
  };

  const renderResourcePicker = () => resourceTarget ? (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.primary}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_033')}</Text>
      {uploadProgress ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_042')} {uploadProgress}%</Text> : null}
      {resourceTarget.purpose !== 'template' ? <ResourceUploadAction theme={theme} purpose={resourceTarget.purpose} onPurposeChange={(purpose) => openResource(purpose, purpose === 'animation' ? animationStage : '')} disabled={!canEdit || Boolean(uploadProgress)} onUpload={uploadResource} /> : null}
      <ResourceSelectionSummary item={selectedAsset} theme={theme} disabled={!selectedAsset || !canEdit} onClear={() => setSelectedAsset(null)} onConfirm={assignSelectedResource} confirmLabel={resourceTarget.purpose === 'template' ? t('mirror_131') : undefined} />
      <ResourcePicker items={library} theme={theme} canManage={canEdit} loading={libraryLoading} error={libraryError} filters={libraryFilters} eventTypes={eventTypes} onFiltersChange={setLibraryFilters} selectedId={selectedAsset?.id || ''} onSelect={setSelectedAsset} onToggleFavorite={toggleFavorite} onRetry={loadLibrary} pagination={pagination} onPageChange={(page) => setLibraryFilters((current) => ({ ...current, page }))} />
      <AppButton label={t('account_028')} onPress={() => setResourceTarget(null)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
    </SurfaceCard>
  ) : null;

  const renderDesignOptions = () => {
    if (designLibraryLoading) return <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_022')}</Text>;
    if (designLibraryError) return <View style={styles.section}><Text style={[styles.feedback, { color: theme.alert }]}>{designLibraryError}</Text><AppButton label={t('resource_025')} onPress={loadDesignLibrary} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /></View>;
    if (designSection === 'format') {
      const currentTemplate = eventResourceAsLibraryItem(config.resources.layoutTemplateResourceId);
      const currentGlobalTemplate = currentTemplate?.asset?.ownerType === 'viralco' ? [currentTemplate] : [];
      const currentFavoriteTemplate = currentTemplate && designLibrary.templatesFavorites.some((item) => String(item.libraryAssetId) === String(currentTemplate.libraryAssetId)) ? [currentTemplate] : [];
      const customItem = { key: 'custom-layout', libraryAssetId: 'custom-layout', displayName: t('mirror_024'), icon: 'crop-simple', selected: !config.resources.layoutTemplateResourceId && config.layout.format === 'personalizar-5x15' };
      return (
        <View style={styles.section}>
          <DesignAssetCarousel
            label={t('resource_045')}
            items={designLibrary.templatesGlobal}
            selectedItems={currentGlobalTemplate}
            leadingItem={customItem}
            leadingFirst
            theme={theme}
            disabled={!canEdit}
            emptyLabel={t('resource_023')}
            onSelect={(item) => item.key === 'custom-layout' ? selectCustomLayout() : applyDesignTemplate(item)}
            onRemove={currentTemplate ? selectCustomLayout : undefined}
          />
          <DesignAssetGrid
            label={t('resource_002')}
            items={designLibrary.templatesFavorites}
            selectedItems={currentFavoriteTemplate}
            theme={theme}
            disabled={!canEdit}
            emptyLabel={t('mirror_143')}
            emptyActionLabel={t('mirror_148')}
            onEmptyAction={onOpenResources}
            onSelect={applyDesignTemplate}
            onRemove={currentTemplate ? selectCustomLayout : undefined}
          />
        </View>
      );
    }
    if (designSection === 'frame') {
      const selectedFrames = Array.from(new Map((config.layout.frameLayers || []).map((layer) => {
        const item = eventResourceAsLibraryItem(layer.resourceId);
        return item ? [String(item.libraryAssetId), item] : null;
      }).filter(Boolean)).values());
      return <DesignAssetGrid label={t('resource_002')} items={designLibrary.frames} selectedItems={selectedFrames} theme={theme} disabled={!canEdit} emptyLabel={t('mirror_144')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} onSelect={(item) => selectedFrames.some((selected) => String(selected.libraryAssetId) === String(item.libraryAssetId)) ? null : associateDesignAsset(item, 'frame')} onRemove={removeFrameAsset} />;
    }
    if (designSection === 'background') {
      const selectedBackgrounds = Array.from(new Map((config.layout.backgroundLayers || []).filter((layer) => layer.kind === 'resource').map((layer) => {
        const item = eventResourceAsLibraryItem(layer.resourceId);
        return item ? [String(item.libraryAssetId), item] : null;
      }).filter(Boolean)).values());
      const selectedColors = (config.layout.backgroundLayers || []).filter((layer) => layer.kind === 'color').map((layer) => layer.color);
      return <View style={styles.section}>
        <BackgroundColorPicker theme={theme} selectedColors={selectedColors} disabled={!canEdit} onSelect={addBackgroundColor} />
        <DesignAssetGrid label={t('resource_002')} items={designLibrary.backgrounds} selectedItems={selectedBackgrounds} theme={theme} disabled={!canEdit} emptyLabel={t('mirror_144')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} onSelect={(item) => selectedBackgrounds.some((selected) => String(selected.libraryAssetId) === String(item.libraryAssetId)) ? null : associateDesignAsset(item, 'background')} onRemove={removeBackgroundAsset} />
      </View>;
    }
    if (designSection === 'sticker') {
      const selectedStickers = Array.from(new Map((config.layout.stickerLayers || []).map((layer) => {
        const item = eventResourceAsLibraryItem(layer.resourceId);
        return item ? [String(item.libraryAssetId), item] : null;
      }).filter(Boolean)).values());
      return <DesignAssetGrid label={t('resource_002')} items={designLibrary.stickers} selectedItems={selectedStickers} theme={theme} disabled={!canEdit} emptyLabel={t('mirror_139')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} onSelect={(item) => selectedStickers.some((selected) => String(selected.libraryAssetId) === String(item.libraryAssetId)) ? null : associateDesignAsset(item, 'sticker')} onRemove={removeStickerAsset} />;
    }
    return <MirrorTextLayerEditor config={config} onChange={mutate} theme={theme} disabled={!canEdit} event={event} favoriteFonts={designLibrary.fonts} resourcesById={resourcesById} onOpenResources={onOpenResources} onInteractionChange={setCanvasInteracting} onSelectFont={(item, layerId) => associateDesignAsset(item, 'font', layerId)} onRemoveFont={removeTextFont} />;
  };

  const renderDesignSection = () => (
    <View style={styles.section}>
      {designSection === 'format'
        ? <MirrorLayoutEditor config={config} onChange={customizeLayout} onRestore={restoreLayout} onSaveTemplate={() => { setTemplateError(''); setTemplateSaveVisible(true); }} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
        : designSection === 'frame'
          ? <MirrorFrameEditor config={config} onChange={mutateFrameLayers} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
          : designSection === 'background'
            ? <MirrorBackgroundEditor config={config} onChange={mutateBackgroundLayers} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
            : designSection === 'sticker'
              ? <MirrorStickerEditor config={config} onChange={mutateStickerLayers} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
        : <MirrorConfigPreview config={config} theme={theme} resourcesById={resourcesById} showMeta={false} />}
      <View style={[styles.designSeparator, { backgroundColor: theme.border }]} />
      {renderDesignOptions()}
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
      {section === 'design' ? <HorizontalSubMenu items={DESIGN_SECTIONS.map((item) => ({ key: item.key, label: t(item.labelKey) }))} selectedKey={designSection} onSelect={setDesignSection} theme={theme} /> : null}
      <ScrollView ref={contentScrollRef} scrollEnabled={!canvasInteracting} contentContainerStyle={styles.content}>
        {message ? <Text style={[styles.feedback, { color: status === 'error' || status === 'invalid' ? theme.alert : theme.textSecondary }]}>{message}</Text> : null}
        <View
          key={section}
          onLayout={(layoutEvent) => {
            sectionContentY.current = layoutEvent.nativeEvent.layout.y;
          }}
        >
          {section === 'design' ? renderDesignSection() : null}
          {section === 'experience' ? renderExperienceSection() : null}
          {section === 'capture' ? renderCaptureSection() : null}
          {section === 'operation' ? renderOperationSection() : null}
          {section === 'review' ? renderReviewSection() : null}
        </View>
      </ScrollView>
      <View testID="mirror-floating-controls" style={styles.floatingControls}>
        <View testID="mirror-config-status">
          <StatusBadge label={t(STATUS_KEYS[status] || 'mirror_017')} flag={STATUS_FLAGS[status] || 'error'} />
        </View>
        <IconTextButton
          testID="mirror-preview-open"
          theme={theme}
          icon="eye"
          iconSize={tokens.typography.body}
          accessibilityLabel={t('mirror_121')}
          backgroundColor={theme.buttonBg}
          pressedBackgroundColor={theme.buttonBgPressed}
          iconColor={theme.buttonText}
          onPress={() => setPreviewVisible(true)}
        />
      </View>
      {previewVisible ? <MirrorPreviewModal visible config={config} theme={theme} resourcesById={resourcesById} onClose={() => setPreviewVisible(false)} /> : null}
      <PhotoLayoutTemplateSaveModal
        visible={templateSaveVisible}
        config={config}
        theme={theme}
        name={templateName}
        onNameChange={setTemplateName}
        saving={templateSaving}
        error={templateError}
        onCancel={() => { if (!templateSaving) { setTemplateSaveVisible(false); setTemplateError(''); } }}
        onSave={saveLayoutTemplate}
      />
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  flexButton: { flex: 1, minWidth: tokens.spacing.xl * 4 },
  stepperGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  resourceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.spacing.sm },
  rowButton: { minWidth: tokens.spacing.xl * 3 },
  designSeparator: { height: StyleSheet.hairlineWidth },
  floatingControls: {
    position: 'absolute',
    right: tokens.spacing.md,
    bottom: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
});
