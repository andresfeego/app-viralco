import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { FormLayout } from '../design-system/components/FormLayout';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { getTheme } from '../design-system/theme';
import { tokens } from '../design-system/tokens';
import { HorizontalSubMenu } from '../components/HorizontalSubMenu';
import { DesignAssetCarousel } from '../components/DesignAssetCarousel';
import { DesignAssetGrid } from '../components/DesignAssetGrid';
import { BackgroundColorPicker } from '../components/BackgroundColorPicker';
import { CameraLensPreview } from '../components/CameraLensPreview';
import { CaptureTimeSlider } from '../components/CaptureTimeSlider';
import { IconTextButton } from '../components/IconTextButton';
import { MirrorLayoutEditor } from '../components/MirrorLayoutEditor';
import { MirrorFrameEditor } from '../components/MirrorFrameEditor';
import { MirrorBackgroundEditor } from '../components/MirrorBackgroundEditor';
import { MirrorConfigPreview } from '../components/MirrorConfigPreview';
import { MirrorPreviewModal } from '../components/MirrorPreviewModal';
import { MirrorStickerEditor } from '../components/MirrorStickerEditor';
import { PhotoLayoutTemplateSaveModal } from '../components/PhotoLayoutTemplateSaveModal';
import { MirrorTextLayerEditor } from '../components/MirrorTextLayerEditor';
import { MirrorAnimationStageCard } from '../components/MirrorAnimationStageCard';
import { MirrorConfigurationSummary } from '../components/MirrorConfigurationSummary';
import { MirrorToggleRow } from '../components/MirrorToggleRow';
import { PrintProfileSelector, printProfileConfig } from '../components/PrintProfileSelector';
import { PaperFormInput } from '../components/PaperFormInput';
import { ResourcePicker } from '../components/ResourcePicker';
import { ResourceSelectionSummary } from '../components/ResourceSelectionSummary';
import { ResourceUploadAction } from '../components/ResourceUploadAction';
import { ResourceUploadModal } from '../components/ResourceUploadModal';
import { SelectableChipGroup } from '../components/SelectableChipGroup';
import { StatusBadge } from '../components/StatusBadge';
import { LaunchPatternGate } from '../components/LaunchPatternGate';
import { setMirrorRecoveryApi } from '../services/api/events';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../providers/ToastProvider';
import { t } from '../i18n';
import {
  addBackgroundColorLayer,
  addBackgroundResourceLayer,
  addStickerLayer,
  applyMirrorFormat,
  applyPhotoLayoutPreset,
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
} from '../domain/magicMirrorConfig';
import {
  createAccountPrintProfileApi,
  createAccountPhotoLayoutTemplateApi,
  createEventResourceApi,
  deleteEventResourceApi,
  getMagicMirrorConfigApi,
  getAccountPhotoLayoutTemplateApi,
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
import { pickResourceFromDevice } from '../services/media/resourcePicker';
import { userErrorMessage } from '../services/errorHandling';
import { normalizeMirrorValidationResult } from '../domain/magicMirrorAssessment';
import { detectPrinter, detectedPrinterProfileInput, getPrinterBinding } from '../services/printers';

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

function presetSnapshot(config) {
  const origin = config?.layout?.presetOrigin;
  return origin ? { origin: cloneValue(origin), layout: cloneValue(config.layout) } : null;
}

export function MagicMirrorConfigScreen({ event, eventMode, accountId: accountIdProp, onBack, onOpenResources = null, onHeaderChange = null }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const theme = useMemo(() => getTheme(user?.themeMode || 'dark'), [user?.themeMode]);
  const accountId = String(accountIdProp || event?.accountId || '');
  const eventId = String(event?.id || '');
  const eventModeId = String(eventMode?.id || '');
  const isSuperAdmin = (user?.globalRoles || []).some((role) => role.slug === 'super_admin');
  const canEdit = isSuperAdmin || roleForAccount(user, accountId) === 'owner' || event?.access?.roleSlug === 'admin' || (user?.events || []).some(item => String(item.eventId) === eventId && item.roleSlug === 'admin');
  const [section, setSection] = useState('design');
  const [designSection, setDesignSection] = useState('format');
  const [recoveryVisible, setRecoveryVisible] = useState(false);
  const [recoverySaving, setRecoverySaving] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [instanceSelection, setInstanceSelection] = useState({});
  const instanceCursor = useRef({});
  const addingInstance = useRef(false);
  const [instanceAdding, setInstanceAdding] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [canvasInteracting, setCanvasInteracting] = useState(false);
  const [templateSaveVisible, setTemplateSaveVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const [config, setConfig] = useState(defaultMirrorConfig());
  const [savedSnapshot, setSavedSnapshot] = useState(null);
  const configRef = useRef(config);
  configRef.current = config;
  const operationBusy = useRef(false);
  const hasUnsavedChanges = savedSnapshot !== null && JSON.stringify(config) !== savedSnapshot;
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
  const [designLibrary, setDesignLibrary] = useState({ templatesGlobal: [], templatesFavorites: [], frames: [], backgrounds: [], stickers: [], fonts: [], animations: [], printProfiles: [] });
  const [designLibraryLoading, setDesignLibraryLoading] = useState(false);
  const [designLibraryError, setDesignLibraryError] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadBusy, setUploadBusy] = useState(false);
  const uploadInFlight = useRef(false);
  const animationStage = MIRROR_ANIMATION_STAGES[0];
  const [deviceUploadPurpose, setDeviceUploadPurpose] = useState('animation');
  const [deviceUploadVisible, setDeviceUploadVisible] = useState(false);
  const [printSearch, setPrintSearch] = useState('');
  const [printerBinding, setPrinterBinding] = useState(null);
  const [printerDetecting, setPrinterDetecting] = useState(false);
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
    if (!accountId || !canEdit) return;
    setDesignLibraryLoading(true);
    setDesignLibraryError('');
    try {
      const query = (type, extra = {}) => listAccountLibraryApi(accountId, { scope: 'available', favorite: true, type, page: 1, pageSize: 100, ...extra }, eventId);
      const [templatesGlobal, templatesFavorites, frames, backgrounds, stickers, fonts, animations, printProfiles] = await Promise.all([
        listAccountLibraryApi(accountId, { scope: 'global', type: 'template', page: 1, pageSize: 100 }, eventId),
        query('template'), query('frame'), query('background'), query('sticker', { motion: 'static' }), query('font'), query('animation'), query('print_profile'),
      ]);
      setDesignLibrary({
        templatesGlobal: (templatesGlobal?.library || []).map(normalizeLibraryItem),
        templatesFavorites: (templatesFavorites?.library || []).map(normalizeLibraryItem),
        frames: (frames?.library || []).map(normalizeLibraryItem),
        backgrounds: (backgrounds?.library || []).map(normalizeLibraryItem),
        stickers: (stickers?.library || []).map(normalizeLibraryItem),
        fonts: (fonts?.library || []).map(normalizeLibraryItem),
        animations: (animations?.library || []).map(normalizeLibraryItem),
        printProfiles: (printProfiles?.library || []).map(normalizeLibraryItem),
      });
    } catch (error) {
      setDesignLibraryError(userErrorMessage(error, t('resource_028')));
    } finally {
      setDesignLibraryLoading(false);
    }
  }, [accountId, eventId, canEdit]);

  useEffect(() => { loadDesignLibrary(); }, [loadDesignLibrary]);

  useEffect(() => {
    if (!accountId) return;
    getPrinterBinding(accountId).then(setPrinterBinding).catch(() => setPrinterBinding(null));
  }, [accountId, eventId]);

  const applyLoadedDraft = useCallback((draft, revision, nextStatus = 'clean') => {
    const normalized = normalizeMirrorConfig(draft);
    layoutTemplateOrigin.current = presetSnapshot(normalized.config);
    setConfig(normalized.config);
    setSavedSnapshot(JSON.stringify(draft));
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
        layoutTemplateOrigin.current = presetSnapshot(normalized.config);
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
      const normalized = applyLoadedDraft(draft?.config, draft?.revision, draft?.status === 'published' ? 'published' : 'clean');
      setPublished(draft?.publishedVersionId ? { id: draft.publishedVersionId, version: draft.publishedVersion } : null);
      setResources((resourceResponse?.resources || []).map(normalizeEventResource));
      if (localRaw) {
        const local = JSON.parse(localRaw);
        if (Number(local.baseRevision) === Number(draft?.revision)) {
          Alert.alert(t('mirror_113'), t('mirror_011'), [
            { text: t('mirror_115'), style: 'destructive', onPress: () => AsyncStorage.removeItem(storageKey) },
            { text: t('mirror_114'), onPress: () => { const localConfig = normalizeMirrorConfig(local.config).config; layoutTemplateOrigin.current = presetSnapshot(localConfig); setConfig(localConfig); setStatus('dirty'); } },
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
    if (!canEdit || !hasUnsavedChanges || status === 'loading' || status === 'conflict') return;
    AsyncStorage.setItem(storageKey, JSON.stringify({ baseRevision: serverRevision, config, updatedAt: new Date().toISOString() })).catch(() => {});
  }, [canEdit, config, hasUnsavedChanges, serverRevision, status, storageKey]);

  const mutate = (nextConfig) => {
    if (!canEdit || operationBusy.current) return;
    configRef.current = nextConfig;
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

  const navigateToAssessmentTarget = useCallback((target) => {
    if (target?.designSection) setDesignSection(target.designSection);
    setPreviewVisible(false);
    selectSection(target?.section || 'review');
  }, [selectSection]);

  const rollbackAssignments = useCallback(async () => {
    const pending = [...pendingAssignments.current];
    await Promise.all(pending.map((item) => deleteEventResourceApi(eventId, item.createdId).catch(() => null)));
    pendingAssignments.current = [];
    replacedResourceIds.current.clear();
    const restored = assignmentBase.current || config;
    assignmentBase.current = null;
    setConfig(restored);
    layoutTemplateOrigin.current = presetSnapshot(restored) || layoutTemplateOrigin.current;
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
    if (!canEdit || operationBusy.current) return null;
    operationBusy.current = true;
    setStatus('saving'); setMessage('');
    try {
      const response = await saveMagicMirrorConfigApi(eventId, eventModeId, { expectedRevision, schemaVersion: 1, config: draftConfig });
      const saved = response?.config;
      if (Object.prototype.hasOwnProperty.call(saved || {}, 'publishedVersion')) {
        setPublished(saved.publishedVersionId ? { id: saved.publishedVersionId, version: saved.publishedVersion } : null);
      }
      const normalized = normalizeMirrorConfig(saved?.config);
      layoutTemplateOrigin.current = presetSnapshot(normalized.config) || layoutTemplateOrigin.current;
      const changedDuringSave = JSON.stringify(configRef.current) !== JSON.stringify(draftConfig);
      if (!changedDuringSave) {
        setConfig(normalized.config);
        configRef.current = normalized.config;
      }
      setSavedSnapshot(JSON.stringify(normalized.config));
      setServerRevision(Number(saved?.revision || expectedRevision));
      setStatus(changedDuringSave ? 'dirty' : saved?.status === 'published' ? 'published' : 'saved');
      setIssues([]);
      if (!changedDuringSave) await AsyncStorage.removeItem(storageKey);
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
    } finally {
      operationBusy.current = false;
    }
  }, [canEdit, config, eventId, eventModeId, finalizeAssignments, rollbackAssignments, serverRevision, storageKey]);

  const validateDraft = async (draftConfig = config, previousStatus = status) => {
    if (operationBusy.current || status === 'conflict') return null;
    operationBusy.current = true;
    setStatus('saving'); setMessage('');
    try {
      const result = normalizeMirrorValidationResult(await validateMagicMirrorConfigApi(eventId, eventModeId, { schemaVersion: 1, config: draftConfig, publish: true }));
      setIssues(result.errors);
      setStatus(previousStatus);
      setMessage(result.valid ? t('mirror_103') : t('mirror_014'));
      selectSection('review');
      return result;
    } catch (error) {
      setStatus('error'); setMessage(userErrorMessage(error, t('mirror_106')));
      return null;
    } finally {
      operationBusy.current = false;
    }
  };

  const publishDraft = async () => {
    if (!canEdit || operationBusy.current || status === 'conflict') return;
    let revision = serverRevision;
    let publishConfig = config;
    if (hasUnsavedChanges || serverRevision === 0) {
      const saved = await saveDraft();
      if (!saved) return;
      revision = Number(saved.revision);
      publishConfig = saved.config;
    }
    const validation = await validateDraft(publishConfig, hasUnsavedChanges || serverRevision === 0 ? 'saved' : status);
    if (!validation?.valid) return;
    Alert.alert(t('mirror_108'), t('mirror_109'), [
      { text: t('account_028'), style: 'cancel' },
      { text: t('mirror_102'), onPress: async () => {
        if (operationBusy.current) return;
        if (JSON.stringify(configRef.current) !== JSON.stringify(publishConfig)) {
          setStatus('dirty'); setMessage(t('mirror_011'));
          return;
        }
        operationBusy.current = true;
        setStatus('saving');
        try {
          const response = await publishMagicMirrorConfigApi(eventId, eventModeId, revision);
          setPublished(response?.version || null);
          setStatus('published'); setMessage(t('mirror_016'));
          await AsyncStorage.removeItem(storageKey);
        } catch (error) {
          if (error?.status === 409) setConflictConfig(configRef.current);
          setStatus(error?.status === 409 ? 'conflict' : 'error');
          setMessage(error?.status === 409 ? t('mirror_112') : userErrorMessage(error, t('mirror_107')));
        } finally {
          operationBusy.current = false;
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
      const response = await listAccountLibraryApi(accountId, { scope: 'available', favorite: libraryFilters.tab === 'favorites' ? true : '', type: libraryFilters.type || resourceTarget.purpose, eventType: libraryFilters.eventType, motion: libraryFilters.type === 'sticker' ? libraryFilters.motion : '', q: libraryFilters.search, page: libraryFilters.page, pageSize: 30 }, eventId);
      setLibrary((response?.library || []).map(normalizeLibraryItem));
      setPagination(response?.pagination || { page: 1, pageCount: 0, total: 0, pageSize: 30 });
    } catch (error) { setLibraryError(userErrorMessage(error, t('resource_028'))); }
    finally { setLibraryLoading(false); }
  }, [accountId, eventId, libraryFilters, resourceTarget]);

  useEffect(() => { loadLibrary(); }, [loadLibrary]);

  const assignSelectedResource = async () => {
    if (!selectedAsset || !resourceTarget || !canEdit) return;
    if (selectedAsset.asset?.type !== resourceTarget.purpose) { setMessage(t('mirror_035')); return; }
    try {
      if (resourceTarget.purpose === 'template') {
        await applyDesignTemplate(selectedAsset, selectedAsset.isFavorite ? 'favorite' : 'global');
        setSelectedAsset(null);
        setResourceTarget(null);
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

  async function applyDesignTemplate(item, source = 'global') {
    if (!item || !canEdit) return;
    const currentOrigin = config.layout.presetOrigin;
    if (String(currentOrigin?.libraryAssetId || '') === String(item.libraryAssetId) && currentOrigin?.source === source) return;
    try {
      const previousLegacyResourceId = config.resources.layoutTemplateResourceId;
      if (previousLegacyResourceId) {
        if (!assignmentBase.current) assignmentBase.current = config;
        replacedResourceIds.current.add(String(previousLegacyResourceId));
      }
      const response = await getAccountPhotoLayoutTemplateApi(accountId, item.libraryAssetId, eventId);
      const origin = {
        libraryAssetId: String(item.libraryAssetId),
        name: response?.asset?.name || item.displayName || item.asset?.name || t('mirror_preset_template'),
        source,
        contentHash: response?.template?.contentHash || null,
      };
      const nextConfig = applyPhotoLayoutPreset(config, response?.template?.config || {}, origin);
      layoutTemplateOrigin.current = presetSnapshot(nextConfig);
      mutate(nextConfig);
      showToast({ type: 'success', message: t('mirror_126') });
    } catch (error) {
      setStatus('error');
      setMessage(userErrorMessage(error, t('mirror_129')));
    }
  }

  const selectCustomLayout = () => {
    if (!canEdit) return;
    const previous = config.resources.layoutTemplateResourceId;
    if (previous) {
      if (!assignmentBase.current) assignmentBase.current = config;
      replacedResourceIds.current.add(String(previous));
    }
    layoutTemplateOrigin.current = null;
    const custom = applyMirrorFormat(config, 'personalizar-5x15');
    mutate({ ...custom, layout: { ...custom.layout, presetOrigin: null }, resources: { ...custom.resources, layoutTemplateResourceId: null } });
  };

  const customizeLayout = (nextConfig) => {
    if (!canEdit) return;
    const templateResourceId = config.resources.layoutTemplateResourceId;
    const origin = config.layout.presetOrigin;
    if (origin && !layoutTemplateOrigin.current) layoutTemplateOrigin.current = presetSnapshot(config);
    if (templateResourceId) {
      if (!assignmentBase.current) assignmentBase.current = config;
      replacedResourceIds.current.add(String(templateResourceId));
    }
    mutate(customizePhotoLayout(nextConfig));
  };

  const restoreLayout = () => {
    if (!canEdit) return;
    const origin = layoutTemplateOrigin.current;
    if (origin) {
      mutate({ ...config, layout: cloneValue(origin.layout), resources: { ...config.resources, layoutTemplateResourceId: null } });
      return;
    }
    customizeLayout(applyMirrorFormat(config, 'personalizar-5x15'));
  };

  const associateDesignAsset = async (item, purpose, layerId = '') => {
    if (!item || !canEdit || item.asset?.type !== purpose) return;
    if (addingInstance.current) return;
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
    addingInstance.current = true;
    setInstanceAdding(true);
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
        const next = addStickerLayer(configRef.current, resource.id);
        mutate(next);
        focusInstance('sticker', item, next.layout.stickerLayers.at(-1)?.id);
        return;
      }
      if (purpose === 'frame') {
        replacedResourceIds.current.delete(String(resource.id));
        const next = addFrameLayer(configRef.current, resource.id);
        mutate(next);
        focusInstance('frame', item, next.layout.frameLayers.at(-1)?.id);
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
    } finally {
      addingInstance.current = false;
      setInstanceAdding(false);
    }
  };

  const focusInstance = (purpose, item, id) => {
    instanceCursor.current[`${purpose}:${item.libraryAssetId}`] = id;
    setInstanceSelection((current) => ({ ...current, [purpose]: { id } }));
  };
  const instancesForAsset = (purpose, item) => (config.layout[`${purpose}Layers`] || []).filter((layer) => String(resourcesById[String(layer.resourceId)]?.libraryAssetId) === String(item.libraryAssetId));
  const selectAssetInstance = (purpose, item) => {
    const layers = instancesForAsset(purpose, item);
    if (!layers.length) return associateDesignAsset(item, purpose);
    const previous = instanceCursor.current[`${purpose}:${item.libraryAssetId}`];
    const index = layers.findIndex((layer) => layer.id === previous);
    focusInstance(purpose, item, layers[(index + 1) % layers.length].id);
  };

  const mutateStickerLayers = (nextConfig) => {
    if (!canEdit) return;
    const currentIds = new Set((config.layout.stickerLayers || []).map((layer) => String(layer.resourceId)));
    const nextIds = new Set((nextConfig.layout.stickerLayers || []).map((layer) => String(layer.resourceId)));
    currentIds.forEach((id) => { if (!nextIds.has(id)) replacedResourceIds.current.add(id); });
    nextIds.forEach((id) => replacedResourceIds.current.delete(id));
    mutate(nextConfig);
  };

  const mutateFrameLayers = (nextConfig) => {
    if (!canEdit) return;
    const currentIds = new Set((config.layout.frameLayers || []).map((layer) => String(layer.resourceId)));
    const nextIds = new Set((nextConfig.layout.frameLayers || []).map((layer) => String(layer.resourceId)));
    currentIds.forEach((id) => { if (!nextIds.has(id)) replacedResourceIds.current.add(id); });
    nextIds.forEach((id) => replacedResourceIds.current.delete(id));
    mutate(nextConfig);
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
      }, eventId);
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

  const uploadResource = async (purposeOverride = '', source = 'files') => {
    const purpose = purposeOverride || resourceTarget?.purpose;
    if (!purpose || !canEdit || uploadInFlight.current) return;
    uploadInFlight.current = true;
    setUploadBusy(true);
    try {
      const file = await pickResourceFromDevice(purpose, source, { staticOnly: purpose === 'sticker' });
      if (!file) return;
      const maxBytes = String(file.type || '').startsWith('video/') ? MAX_VIDEO_UPLOAD_BYTES : MAX_STANDARD_UPLOAD_BYTES;
      if (!file.fileSize || file.fileSize > maxBytes) throw new Error(t('resource_043'));
      setUploadProgress(1);
      const asset = await uploadAccountLibraryFileApi(accountId, file, purpose, setUploadProgress, eventId);
      if (asset?.id) await updateAccountLibraryFavoriteApi(accountId, asset.id, true, eventId);
      setUploadProgress(0);
      setDeviceUploadVisible(false);
      await loadDesignLibrary();
      await loadLibrary();
      showToast({ type: 'success', message: t('resource_032') });
    } catch (error) { setUploadProgress(0); showToast({ type: 'error', message: userErrorMessage(error, t('resource_033')) }); }
    finally { uploadInFlight.current = false; setUploadBusy(false); }
  };

  const openDeviceUpload = (purpose) => {
    if (!canEdit) return;
    setDeviceUploadPurpose(purpose);
    setDeviceUploadVisible(true);
  };

  const toggleFavorite = async (item) => {
    if (!canEdit) return;
    try { await updateAccountLibraryFavoriteApi(accountId, item.libraryAssetId, !item.isFavorite, eventId); await loadLibrary(); }
    catch (error) { setMessage(userErrorMessage(error, t('resource_030'))); }
  };

  const renderResourcePicker = () => resourceTarget ? (
    <SurfaceCard surfaceColor={theme.surface} borderColor={theme.primary}>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_033')}</Text>
      {uploadProgress ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_042')} {uploadProgress}%</Text> : null}
      {resourceTarget.purpose !== 'template' ? <ResourceUploadAction theme={theme} purpose={resourceTarget.purpose} onPurposeChange={(purpose) => openResource(purpose, purpose === 'animation' ? animationStage : '')} disabled={!canEdit || uploadBusy} onUpload={uploadResource} /> : null}
      <ResourceSelectionSummary item={selectedAsset} theme={theme} disabled={!selectedAsset || !canEdit} onClear={() => setSelectedAsset(null)} onConfirm={assignSelectedResource} confirmLabel={resourceTarget.purpose === 'template' ? t('mirror_131') : undefined} />
      <ResourcePicker items={library} theme={theme} canManage={canEdit} loading={libraryLoading} error={libraryError} filters={libraryFilters} eventTypes={eventTypes} onFiltersChange={setLibraryFilters} selectedId={selectedAsset?.id || ''} onSelect={setSelectedAsset} onToggleFavorite={toggleFavorite} onRetry={loadLibrary} pagination={pagination} onPageChange={(page) => setLibraryFilters((current) => ({ ...current, page }))} />
      <AppButton variant="outlined" borderColor={theme.textSecondary} label={t('account_028')} onPress={() => setResourceTarget(null)} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
    </SurfaceCard>
  ) : null;

  const renderDesignOptions = () => {
    if (designLibraryLoading) return <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('resource_022')}</Text>;
    if (designLibraryError) return <View style={styles.section}><Text style={[styles.feedback, { color: theme.alert }]}>{designLibraryError}</Text><AppButton label={t('resource_025')} onPress={loadDesignLibrary} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /></View>;
    if (designSection === 'format') {
      const presetOrigin = config.layout.presetOrigin;
      const originAssetId = String(presetOrigin?.libraryAssetId || '');
      const selectedGlobal = designLibrary.templatesGlobal.find((item) => String(item.libraryAssetId) === originAssetId);
      const selectedFavorite = designLibrary.templatesFavorites.find((item) => String(item.libraryAssetId) === originAssetId);
      const currentGlobalTemplate = presetOrigin?.source === 'global' && selectedGlobal ? [selectedGlobal] : [];
      const currentFavoriteTemplate = presetOrigin?.source === 'favorite' && selectedFavorite ? [selectedFavorite] : [];
      const customItem = { key: 'custom-layout', libraryAssetId: 'custom-layout', displayName: t('mirror_024'), icon: 'crop-simple', selected: !presetOrigin };
      const presetLabel = presetOrigin
        ? `${t('mirror_preset_template')}: ${presetOrigin.name} · ${t(presetOrigin.source === 'favorite' ? 'mirror_preset_favorite' : 'mirror_preset_global')}`
        : t('mirror_preset_custom');
      return (
        <View style={styles.section}>
          <StatusBadge label={presetLabel} flag="info" />
          <DesignAssetCarousel
            label={t('resource_045')}
            items={designLibrary.templatesGlobal}
            selectedItems={currentGlobalTemplate}
            leadingItem={customItem}
            leadingFirst
            theme={theme}
            disabled={!canEdit}
            emptyLabel={t('resource_023')}
            onSelect={(item) => item.key === 'custom-layout' ? selectCustomLayout() : applyDesignTemplate(item, 'global')}
            onRemove={currentGlobalTemplate.length ? selectCustomLayout : undefined}
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
            onSelect={(item) => applyDesignTemplate(item, 'favorite')}
            onRemove={currentFavoriteTemplate.length ? selectCustomLayout : undefined}
 />
        </View>
      );
    }
    if (designSection === 'frame') {
      const selectedFrames = Array.from(new Map((config.layout.frameLayers || []).map((layer) => {
        const item = eventResourceAsLibraryItem(layer.resourceId);
        return item ? [String(item.libraryAssetId), item] : null;
      }).filter(Boolean)).values());
      return <DesignAssetGrid label={t('resource_002')} items={designLibrary.frames} selectedItems={selectedFrames} theme={theme} disabled={!canEdit || instanceAdding} emptyLabel={t('mirror_144')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} secondaryEmptyActionLabel={t('resource_060')} onSecondaryEmptyAction={() => openDeviceUpload('frame')} onSelect={(item) => selectAssetInstance('frame', item)} instanceCounts={Object.fromEntries(selectedFrames.map((item) => [String(item.libraryAssetId), instancesForAsset('frame', item).length]))} onAddInstance={(item) => associateDesignAsset(item, 'frame')} addDisabled={config.layout.frameLayers.length >= MIRROR_MAX_FRAME_LAYERS} />;
    }
    if (designSection === 'background') {
      const selectedBackgrounds = Array.from(new Map((config.layout.backgroundLayers || []).filter((layer) => layer.kind === 'resource').map((layer) => {
        const item = eventResourceAsLibraryItem(layer.resourceId);
        return item ? [String(item.libraryAssetId), item] : null;
      }).filter(Boolean)).values());
      const selectedColors = (config.layout.backgroundLayers || []).filter((layer) => layer.kind === 'color').map((layer) => layer.color);
      return <View style={styles.section}>
        <BackgroundColorPicker theme={theme} selectedColors={selectedColors} disabled={!canEdit} onSelect={addBackgroundColor} />
        <DesignAssetGrid label={t('resource_002')} items={designLibrary.backgrounds} selectedItems={selectedBackgrounds} theme={theme} disabled={!canEdit} emptyLabel={t('mirror_144')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} secondaryEmptyActionLabel={t('resource_060')} onSecondaryEmptyAction={() => openDeviceUpload('background')} onSelect={(item) => selectedBackgrounds.some((selected) => String(selected.libraryAssetId) === String(item.libraryAssetId)) ? null : associateDesignAsset(item, 'background')} onRemove={removeBackgroundAsset} />
      </View>;
    }
    if (designSection === 'sticker') {
      const selectedStickers = Array.from(new Map((config.layout.stickerLayers || []).map((layer) => {
        const item = eventResourceAsLibraryItem(layer.resourceId);
        return item ? [String(item.libraryAssetId), item] : null;
      }).filter(Boolean)).values());
      return <DesignAssetGrid label={t('resource_002')} items={designLibrary.stickers} selectedItems={selectedStickers} theme={theme} disabled={!canEdit || instanceAdding} emptyLabel={t('mirror_139')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} secondaryEmptyActionLabel={t('resource_060')} onSecondaryEmptyAction={() => openDeviceUpload('sticker')} onSelect={(item) => selectAssetInstance('sticker', item)} instanceCounts={Object.fromEntries(selectedStickers.map((item) => [String(item.libraryAssetId), instancesForAsset('sticker', item).length]))} onAddInstance={(item) => associateDesignAsset(item, 'sticker')} addDisabled={config.layout.stickerLayers.length >= MIRROR_MAX_STICKER_LAYERS} />;
    }
    return <MirrorTextLayerEditor config={config} onChange={mutate} theme={theme} disabled={!canEdit} event={event} favoriteFonts={designLibrary.fonts} resourcesById={resourcesById} onOpenResources={onOpenResources} onUploadFont={() => openDeviceUpload('font')} onInteractionChange={setCanvasInteracting} onSelectFont={(item, layerId) => associateDesignAsset(item, 'font', layerId)} onRemoveFont={removeTextFont} onDiscardFont={(resourceId) => replacedResourceIds.current.add(String(resourceId))} />;
  };

  const renderDesignSection = () => {
    if (designSection === 'text') return <View style={styles.section}>{renderDesignOptions()}</View>;
    return (
      <View style={styles.section}>
      {designSection === 'format'
        ? <MirrorLayoutEditor config={config} onChange={customizeLayout} onRestore={restoreLayout} onSaveTemplate={() => { setTemplateError(''); setTemplateSaveVisible(true); }} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
        : designSection === 'frame'
          ? <MirrorFrameEditor config={config} selectionRequest={instanceSelection.frame} onChange={mutateFrameLayers} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
          : designSection === 'background'
            ? <MirrorBackgroundEditor config={config} onChange={mutateBackgroundLayers} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
            : designSection === 'sticker'
              ? <MirrorStickerEditor config={config} selectionRequest={instanceSelection.sticker} onChange={mutateStickerLayers} onInteractionChange={setCanvasInteracting} resourcesById={resourcesById} theme={theme} disabled={!canEdit} />
        : <MirrorConfigPreview config={config} theme={theme} resourcesById={resourcesById} showMeta={false} />}
      <View style={[styles.designSeparator, { backgroundColor: theme.border }]} />
      {renderDesignOptions()}
      </View>
    );
  };

  const selectedAnimationForStage = (stage) => {
    const configuredIds = new Set((config.resources.animationResourceIds || []).map(String));
    const resource = resources.find((item) => item.purpose === 'animation' && item.placement === stage && configuredIds.has(String(item.id)));
    return resource ? { ...eventResourceAsLibraryItem(resource.id), displayName: resource.asset?.name || `#${resource.id}` } : null;
  };

  const selectAnimationForStage = async (item, stage) => {
    if (!canEdit || !item?.libraryAssetId) return;
    try {
      if (!assignmentBase.current) assignmentBase.current = config;
      const previous = resources.find((entry) => entry.purpose === 'animation' && entry.placement === stage && (config.resources.animationResourceIds || []).map(String).includes(String(entry.id)));
      let resource = resources.find((entry) => entry.purpose === 'animation' && entry.placement === stage && String(entry.libraryAssetId) === String(item.libraryAssetId));
      if (!resource) {
        const created = await createEventResourceApi(eventId, {
          libraryAssetId: item.libraryAssetId,
          eventModeId,
          purpose: 'animation',
          placement: stage,
          orderIndex: MIRROR_ANIMATION_STAGES.indexOf(stage),
          isActive: true,
        });
        const createdAsset = created?.resource?.asset || {};
        resource = normalizeEventResource({
          ...(created?.resource || {}),
          asset: { ...(item.asset || {}), ...createdAsset, variants: createdAsset.variants || item.asset?.variants },
        });
        if (!resource.id) throw new Error(t('resource_034'));
        pendingAssignments.current.push({ createdId: resource.id });
        setResources((current) => [...current, resource]);
      }
      if (previous && String(previous.id) !== String(resource.id)) replacedResourceIds.current.add(String(previous.id));
      replacedResourceIds.current.delete(String(resource.id));
      const animationResourceIds = (config.resources.animationResourceIds || [])
        .filter((id) => !previous || String(id) !== String(previous.id));
      if (!animationResourceIds.map(String).includes(String(resource.id))) animationResourceIds.push(resource.id);
      mutate({ ...config, resources: { ...config.resources, animationResourceIds } });
    } catch (error) {
      setStatus('error');
      setMessage(userErrorMessage(error, t('resource_034')));
    }
  };

  const removeAnimationForStage = (stage) => {
    const selected = selectedAnimationForStage(stage);
    if (!selected?.eventResourceId) return;
    unlinkResource('animation', selected.eventResourceId);
  };

  const renderExperienceSection = () => {
    return (
      <View style={styles.section}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_080')}</Text>
        {MIRROR_ANIMATION_STAGES.map((stage) => (
          <MirrorAnimationStageCard
            key={stage}
            stage={stage}
            label={t(`mirror_stage_${stage}`)}
            enabled={Boolean(config.experience.animationEnabledByStage?.[stage])}
            selected={selectedAnimationForStage(stage)}
            favorites={designLibrary.animations}
            theme={theme}
            disabled={!canEdit}
            onEnabledChange={(enabled) => mutate({ ...config, experience: { ...config.experience, animationEnabledByStage: { ...config.experience.animationEnabledByStage, [stage]: enabled } } })}
            onSelect={(item) => selectAnimationForStage(item, stage)}
            onRemove={() => removeAnimationForStage(stage)}
            onOpenResources={onOpenResources}
            onUpload={() => openDeviceUpload('animation')}
 />
        ))}
      </View>
    );
  };

  const renderCaptureSection = () => (
    <View style={styles.section}>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_capture_times')}</Text>
        <View style={styles.captureStack}>
          <CaptureTimeSlider testID="capture-first-countdown" label={t('mirror_065')} value={config.capture.firstCountdownSeconds} onChange={(value) => mutate({ ...config, capture: { ...config.capture, firstCountdownSeconds: value } })} theme={theme} disabled={!canEdit} />
          <CaptureTimeSlider testID="capture-next-countdown" label={t('mirror_066')} value={config.capture.nextCountdownSeconds} onChange={(value) => mutate({ ...config, capture: { ...config.capture, nextCountdownSeconds: value } })} theme={theme} disabled={!canEdit} />
          <CaptureTimeSlider testID="capture-review" label={t('mirror_067')} value={config.capture.reviewSeconds} onChange={(value) => mutate({ ...config, capture: { ...config.capture, reviewSeconds: value } })} theme={theme} disabled={!canEdit} />
        </View>
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <SelectableChipGroup testID="mirror-capture-lens" theme={theme} backgroundColor={theme.surface} variant="outlined" label={t('mirror_071')} labelVariant="heading" options={[{ value: 'normal', label: t('mirror_073') }, { value: 'wide', label: t('mirror_074') }, { value: 'ultra-wide', label: t('mirror_075') }]} value={config.capture.lens} disabled={!canEdit} onChange={(value) => mutate({ ...config, capture: { ...config.capture, lens: value || config.capture.lens } })} />
        <Text style={[styles.description, { color: theme.textSecondary }]}>{t(`mirror_lens_${config.capture.lens}`)}</Text>
        <CameraLensPreview lens={config.capture.lens} theme={theme} />
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <SelectableChipGroup testID="mirror-capture-quality" theme={theme} backgroundColor={theme.surface} variant="outlined" label={t('mirror_072')} labelVariant="heading" options={[{ value: 'medium', label: t('mirror_076') }, { value: 'high', label: t('mirror_077') }, { value: 'superior', label: t('mirror_078') }]} value={config.capture.quality} disabled={!canEdit} onChange={(value) => mutate({ ...config, capture: { ...config.capture, quality: value || config.capture.quality } })} />
        <Text style={[styles.description, { color: theme.textSecondary }]}>{t(`mirror_quality_${config.capture.quality}`)}</Text>
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('mirror_capture_other')}</Text>
        <MirrorToggleRow label={t('mirror_068')} value={config.capture.flashEnabled} onChange={(flashEnabled) => mutate({ ...config, capture: { ...config.capture, flashEnabled } })} theme={theme} disabled={!canEdit} />
        <MirrorToggleRow label={t('mirror_069')} value={config.capture.preserveOriginals} onChange={(preserveOriginals) => mutate({ ...config, capture: { ...config.capture, preserveOriginals } })} theme={theme} disabled={!canEdit} />
      </SurfaceCard>
    </View>
  );

  const selectedPrintProfile = () => eventResourceAsLibraryItem(config.print.profileResourceId);

  const applyPrintProfileValues = (item, eventResourceId) => {
    const profile = printProfileConfig(item);
    if (!profile) throw new Error(t('print_024'));
    return {
      ...config,
      print: {
        ...config.print,
        enabled: true,
        profileResourceId: String(eventResourceId),
        paperWidthCm: Number(profile.paper.widthMm) / 10,
        paperHeightCm: Number(profile.paper.heightMm) / 10,
        orientation: profile.paper.orientation,
        dpi: Number(profile.output.dpi),
        marginCm: Number(profile.paper.safeMarginMm || 0) / 10,
        copies: Number(profile.output.defaultCopies || 1),
        fit: profile.output.fit,
        twoPerPage: Boolean(profile.output.supportsTwoPerPage && config.print.twoPerPage),
      },
      delivery: { ...config.delivery, print: true },
    };
  };

  const selectPrintProfile = async (item) => {
    if (!canEdit || !item?.libraryAssetId) return;
    try {
      if (!assignmentBase.current) assignmentBase.current = config;
      const previousId = config.print.profileResourceId;
      let resource = resources.find((entry) => entry.purpose === 'print_profile' && String(entry.libraryAssetId) === String(item.libraryAssetId));
      if (!resource) {
        const created = await createEventResourceApi(eventId, { libraryAssetId: item.libraryAssetId, eventModeId, purpose: 'print_profile', placement: 'primary', orderIndex: 0, isActive: true });
        resource = normalizeEventResource({ ...(created?.resource || {}), asset: { ...(item.asset || {}), ...(created?.resource?.asset || {}) } });
        if (!resource.id) throw new Error(t('resource_034'));
        pendingAssignments.current.push({ createdId: resource.id });
        setResources((current) => [...current, resource]);
      }
      if (previousId && String(previousId) !== String(resource.id)) replacedResourceIds.current.add(String(previousId));
      replacedResourceIds.current.delete(String(resource.id));
      mutate(applyPrintProfileValues({ ...item, asset: { ...(item.asset || {}), ...(resource.asset || {}) } }, resource.id));
    } catch (error) {
      setStatus('error');
      setMessage(userErrorMessage(error, t('resource_034')));
    }
  };

  const removePrintProfile = () => {
    if (!canEdit || !config.print.profileResourceId) return;
    replacedResourceIds.current.add(String(config.print.profileResourceId));
    mutate({ ...config, print: { ...config.print, enabled: false, profileResourceId: null }, delivery: { ...config.delivery, print: false } });
  };

  const detectAndAddPrinter = async () => {
    if (!canEdit || printerDetecting) return;
    setPrinterDetecting(true);
    try {
      const binding = await detectPrinter(accountId);
      if (!binding) return;
      setPrinterBinding(binding);
      const available = await listAccountLibraryApi(accountId, { scope: 'available', type: 'print_profile', page: 1, pageSize: 100 }, eventId);
      const matching = (available?.library || []).map(normalizeLibraryItem).find((item) => {
        const profile = printProfileConfig(item);
        return profile && String(binding.name).toLowerCase().includes(String(profile.model || '').toLowerCase());
      });
      let item = matching;
      if (item) {
        const response = await updateAccountLibraryFavoriteApi(accountId, item.libraryAssetId, true, eventId);
        item = normalizeLibraryItem(response?.library || { ...item, isFavorite: true });
      } else {
        const response = await createAccountPrintProfileApi(accountId, detectedPrinterProfileInput(binding), eventId);
        item = normalizeLibraryItem({ libraryAssetId: response?.asset?.id, isFavorite: true, asset: response?.asset });
      }
      await loadDesignLibrary();
      await selectPrintProfile(item);
      showToast({ type: 'success', message: t('print_023') });
    } catch (error) {
      setMessage(userErrorMessage(error, t('print_024')));
      setStatus('error');
    } finally {
      setPrinterDetecting(false);
    }
  };

  const updatePrintNumber = (key, value) => {
    const parsed = Number(String(value).replace(',', '.'));
    mutate({ ...config, print: { ...config.print, [key]: Number.isFinite(parsed) ? parsed : 0 } });
  };

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
        {canEdit ? <AppButton variant="outlined" borderColor={theme.textSecondary} label={t('pattern_recovery')} onPress={() => { setRecoveryError(''); setRecoveryVisible(true); }} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.primary} /> : null}
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{t('print_009')}</Text>
        <PrintProfileSelector
          items={designLibrary.printProfiles}
          selected={selectedPrintProfile()}
          search={printSearch}
          binding={printerBinding}
          theme={theme}
          disabled={!canEdit || printerDetecting}
          onSearchChange={setPrintSearch}
          onSelect={selectPrintProfile}
          onRemove={removePrintProfile}
          onOpenResources={onOpenResources}
          onDetect={detectAndAddPrinter}
 />
        <MirrorToggleRow label={t('print_010')} value={config.print.enabled} onChange={(enabled) => mutate({ ...config, print: { ...config.print, enabled }, delivery: { ...config.delivery, print: enabled } })} theme={theme} disabled={!canEdit || !config.print.profileResourceId} />
        {config.print.profileResourceId ? <View style={styles.printSettingsStack}>
          <View style={styles.printInputGrid}>
            <View style={styles.printInputCell}><PaperFormInput theme={theme} label={t('print_011')} value={String(config.print.paperWidthCm)} onChangeText={(value) => updatePrintNumber('paperWidthCm', value)} keyboardType="decimal-pad" editable={canEdit} /></View>
            <View style={styles.printInputCell}><PaperFormInput theme={theme} label={t('print_012')} value={String(config.print.paperHeightCm)} onChangeText={(value) => updatePrintNumber('paperHeightCm', value)} keyboardType="decimal-pad" editable={canEdit} /></View>
            <View style={styles.printInputCell}><PaperFormInput theme={theme} label={t('print_013')} value={String(config.print.marginCm)} onChangeText={(value) => updatePrintNumber('marginCm', value)} keyboardType="decimal-pad" editable={canEdit} /></View>
            <View style={styles.printInputCell}><PaperFormInput theme={theme} label={t('print_014')} value={String(config.print.copies)} onChangeText={(value) => updatePrintNumber('copies', value)} keyboardType="number-pad" editable={canEdit} /></View>
            <View style={styles.printInputCell}><PaperFormInput theme={theme} label={t('print_021')} value={String(config.print.dpi)} onChangeText={(value) => updatePrintNumber('dpi', value)} keyboardType="number-pad" editable={canEdit} /></View>
          </View>
          <SelectableChipGroup testID="mirror-print-orientation" theme={theme} backgroundColor={theme.surface} variant="outlined" label={t('print_015')} options={[{ value: 'portrait', label: t('print_016') }, { value: 'landscape', label: t('print_017') }]} value={config.print.orientation} onChange={(orientation) => mutate({ ...config, print: { ...config.print, orientation } })} disabled={!canEdit} />
          <SelectableChipGroup testID="mirror-print-fit" theme={theme} backgroundColor={theme.surface} variant="outlined" label={t('print_018')} options={[{ value: 'contain', label: t('print_019') }, { value: 'cover', label: t('print_020') }]} value={config.print.fit} onChange={(fit) => mutate({ ...config, print: { ...config.print, fit } })} disabled={!canEdit} />
          <MirrorToggleRow label={t('print_022')} value={config.print.twoPerPage} onChange={(twoPerPage) => mutate({ ...config, print: { ...config.print, twoPerPage } })} theme={theme} disabled={!canEdit} />
        </View> : <Text style={[styles.meta, { color: theme.textSecondary }]}>{t('print_025')}</Text>}
      </SurfaceCard>
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>GIF · {t('mirror_098')}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]}>Background removal · {t('mirror_098')}</Text>
      </SurfaceCard>
    </View>
  );

  const renderReviewSection = () => (
    <FormLayout testID="mirror-review-form" actions={canEdit ? <>
      <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} testID="mirror-save" label={t('mirror_100')} onPress={() => saveDraft()} disabled={status === 'saving'} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
      <AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} testID="mirror-validate" label={t('mirror_101')} onPress={() => validateDraft()} disabled={status === 'saving'} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} />
      <AppButton testID="mirror-publish" label={t('mirror_102')} onPress={publishDraft} disabled={status === 'saving' || status === 'conflict'} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} />
    </> : null}>
      {!canEdit ? <Text style={[styles.feedback, { color: theme.textSecondary }]}>{t('mirror_116')}</Text> : null}
      <View testID="mirror-publication-status" style={styles.publicationStatus}>
        <StatusBadge flag="info" label={published?.version ? `${t('mirror_publication')} ${published.version}` : t('mirror_unpublished')} />
      </View>
      <MirrorConfigurationSummary config={config} issues={issues} resourcesById={resourcesById} theme={theme} onNavigate={navigateToAssessmentTarget} />
      {status === 'conflict' ? <SurfaceCard surfaceColor={theme.surface} borderColor={theme.secondary}><FormLayout testID="mirror-conflict-form" actions={<><AppButton variant="outlined" borderColor={theme.buttonSecondaryBorder} label={t('mirror_110')} onPress={loadServerAfterConflict} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} /><AppButton label={t('mirror_111')} onPress={keepLocalAfterConflict} backgroundColor={theme.buttonBg} pressedColor={theme.buttonBgPressed} textColor={theme.buttonText} /></>}><Text style={[styles.feedback, { color: theme.textPrimary }]}>{t('mirror_112')}</Text></FormLayout></SurfaceCard> : null}
    </FormLayout>
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
      {previewVisible ? <MirrorPreviewModal visible config={config} theme={theme} resourcesById={resourcesById} issues={issues} onNavigate={navigateToAssessmentTarget} onClose={() => setPreviewVisible(false)} /> : null}
      {recoveryVisible && canEdit ? <LaunchPatternGate theme={theme} title={t('pattern_recovery')} feedback={recoveryError} disabled={recoverySaving} onClose={() => { if (!recoverySaving) setRecoveryVisible(false); }} onReady={async (value) => {
        setRecoverySaving(true);
        setRecoveryError('');
        try {
          await setMirrorRecoveryApi(eventId, eventModeId, value);
          setRecoveryVisible(false);
          showToast({ type: 'success', message: t('pattern_recovery_saved') });
        } catch (error) {
          setRecoveryError(t('pattern_recovery_error'));
          showToast({ type: 'error', message: t('pattern_recovery_error') });
          throw error;
        } finally { setRecoverySaving(false); }
      }} /> : null}
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
      <ResourceUploadModal
        visible={deviceUploadVisible}
        theme={theme}
        purpose={deviceUploadPurpose}
        fixedPurpose
        progress={uploadProgress}
        disabled={uploadBusy}
        onPurposeChange={setDeviceUploadPurpose}
        onUpload={uploadResource}
        onClose={() => { if (!uploadInFlight.current) setDeviceUploadVisible(false); }}
 />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: tokens.spacing.md },
  content: { padding: tokens.spacing.md, paddingBottom: tokens.spacing.xl * 3, gap: tokens.spacing.md },
  section: { gap: tokens.spacing.md },
  publicationStatus: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0, gap: tokens.spacing.xs },
  title: { fontSize: tokens.typography.heading, fontWeight: '700' },
  meta: { fontSize: tokens.typography.caption },
  feedback: { fontSize: tokens.typography.caption, fontWeight: '700' },


  captureStack: { gap: tokens.spacing.md },
  printSettingsStack: { gap: tokens.spacing.sm },
  printInputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  printInputCell: { flexGrow: 1, flexBasis: tokens.spacing.xl * 5, minWidth: 0 },
  description: { fontSize: tokens.typography.caption, lineHeight: tokens.typography.body + tokens.spacing.xxs },
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
