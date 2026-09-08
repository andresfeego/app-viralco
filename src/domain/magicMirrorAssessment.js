import { formatDefinition, MIRROR_ANIMATION_STAGES } from './magicMirrorConfig';

const MISSING_CODES = new Set([
  'ANIMATION_STAGE_RESOURCE_REQUIRED',
  'FONT_RESOURCE_REQUIRED',
  'PRINT_PROFILE_REQUIRED',
]);

const RESOURCE_TARGETS = {
  template: { section: 'design', designSection: 'format' },
  frame: { section: 'design', designSection: 'frame' },
  background: { section: 'design', designSection: 'background' },
  sticker: { section: 'design', designSection: 'sticker' },
  font: { section: 'design', designSection: 'text' },
  animation: { section: 'experience' },
  print_profile: { section: 'operation' },
};

function resourceFromIssue(issue, resourcesById) {
  const id = String(issue?.path || '').split('.').reverse().find((part) => /^\d+$/.test(part));
  return id ? resourcesById?.[id] : null;
}

function configuredPurposeForIssue(issue, config) {
  const id = String(issue?.path || '').split('.').reverse().find((part) => /^\d+$/.test(part));
  if (!id) return null;
  const resources = config?.resources || {};
  if ([resources.layoutTemplateResourceId, resources.templateResourceId].map(String).includes(id)) return 'template';
  if ([resources.frameResourceId, ...(config?.layout?.frameLayers || []).map((layer) => layer.resourceId)].map(String).includes(id)) return 'frame';
  if ([resources.backgroundResourceId, ...(config?.layout?.backgroundLayers || []).map((layer) => layer.resourceId)].map(String).includes(id)) return 'background';
  if ([resources.gifOverlayResourceId, ...(config?.layout?.stickerLayers || []).map((layer) => layer.resourceId)].map(String).includes(id)) return 'sticker';
  if ([resources.fontResourceId, ...(config?.layout?.textLayers || []).map((layer) => layer.fontResourceId)].map(String).includes(id)) return 'font';
  if (String(config?.print?.profileResourceId || '') === id) return 'print_profile';
  if ((resources.animationResourceIds || []).map(String).includes(id)) return 'animation';
  return null;
}

export function mirrorIssueTarget(issue, resourcesById = {}, config = {}) {
  const path = String(issue?.path || '');
  const code = String(issue?.code || '');
  if (code === 'FONT_RESOURCE_REQUIRED' || path.includes('textLayers') || path.includes('fontResource')) return { section: 'design', designSection: 'text' };
  if (path.includes('frameLayers') || path.includes('frameResource')) return { section: 'design', designSection: 'frame' };
  if (path.includes('backgroundLayers') || path.includes('backgroundResource')) return { section: 'design', designSection: 'background' };
  if (path.includes('stickerLayers') || path.includes('gifOverlay')) return { section: 'design', designSection: 'sticker' };
  if (path.startsWith('layout')) return { section: 'design', designSection: 'format' };
  if (path.startsWith('resources.')) {
    const resource = resourceFromIssue(issue, resourcesById);
    return RESOURCE_TARGETS[resource?.purpose || configuredPurposeForIssue(issue, config)] || { section: 'review' };
  }
  if (path.startsWith('experience')) return { section: 'experience' };
  if (path.startsWith('capture')) return { section: 'capture' };
  if (path.startsWith('delivery') || path.startsWith('runtime') || path.startsWith('print')) return { section: 'operation' };
  return { section: 'review' };
}

function issueCopy(issue, translate) {
  const code = String(issue?.code || '');
  if (code === 'ANIMATION_STAGE_RESOURCE_REQUIRED') return { title: translate('mirror_summary_missing_animation'), reason: translate('mirror_summary_reason_animation'), advice: translate('mirror_summary_advice_animation') };
  if (code === 'FONT_RESOURCE_REQUIRED') return { title: translate('mirror_summary_missing_font'), reason: translate('mirror_summary_reason_font'), advice: translate('mirror_summary_advice_font') };
  if (code === 'PRINT_PROFILE_REQUIRED') return { title: translate('mirror_summary_missing_print'), reason: translate('mirror_summary_reason_print'), advice: translate('mirror_summary_advice_print') };
  if (code.startsWith('RESOURCE_') || code === 'ANIMATION_PLACEMENT_INVALID') return { title: translate('mirror_summary_invalid_resource'), reason: translate('mirror_summary_reason_resource'), advice: translate('mirror_summary_advice_resource') };
  if (code.includes('BOUNDS')) return { title: translate('mirror_summary_invalid_bounds'), reason: translate('mirror_summary_reason_bounds'), advice: translate('mirror_summary_advice_bounds') };
  if (code.includes('ORDER') || code.includes('DUPLICATE') || code.includes('_ID_INVALID') || code.includes('COUNT_INVALID')) return { title: translate('mirror_summary_invalid_layout'), reason: translate('mirror_summary_reason_layout'), advice: translate('mirror_summary_advice_layout') };
  if (code.startsWith('CAPTURE_') || code === 'LENS_INVALID' || code === 'QUALITY_INVALID') return { title: translate('mirror_summary_invalid_capture'), reason: translate('mirror_summary_reason_capture'), advice: translate('mirror_summary_advice_capture') };
  if (code.startsWith('PRINT_')) return { title: translate('mirror_summary_invalid_print'), reason: translate('mirror_summary_reason_print_invalid'), advice: translate('mirror_summary_advice_print_invalid') };
  return { title: translate('mirror_summary_invalid_config'), reason: translate('mirror_summary_reason_generic'), advice: translate('mirror_summary_advice_generic') };
}

function configuredAnimationForStage(config, resourcesById, stage) {
  const configured = new Set((config?.resources?.animationResourceIds || []).map(String));
  return Object.values(resourcesById || {}).find((resource) => (
    configured.has(String(resource?.id))
    && resource?.purpose === 'animation'
    && resource?.placement === stage
  ));
}

function localMissingIssues(config, resourcesById) {
  const missing = [];
  const resources = config?.resources || {};
  const layout = config?.layout || {};
  MIRROR_ANIMATION_STAGES.forEach((stage) => {
    if (config?.experience?.animationEnabledByStage?.[stage] === true && !configuredAnimationForStage(config, resourcesById, stage)) {
      missing.push({ path: `experience.animationEnabledByStage.${stage}`, code: 'ANIMATION_STAGE_RESOURCE_REQUIRED' });
    }
  });
  (layout.textLayers || []).forEach((layer, index) => {
    if (layer?.font === 'resource' && !layer?.fontResourceId && !resources.fontResourceId) {
      missing.push({ path: `layout.textLayers.${index}.fontResourceId`, code: 'FONT_RESOURCE_REQUIRED' });
    }
  });
  if (config?.print?.enabled && !config?.print?.profileResourceId) missing.push({ path: 'print.profileResourceId', code: 'PRINT_PROFILE_REQUIRED' });
  return missing;
}

function issueIdentity(issue) {
  return `${issue?.code || ''}:${issue?.path || ''}`;
}

export function normalizeMirrorValidationResult(result) {
  const rawErrors = Array.isArray(result?.errors) ? result.errors : [];
  const errors = rawErrors.filter((entry) => entry?.code !== 'FRAME_REQUIRED');
  const obsoleteRequirementWasOnlyError = rawErrors.length > 0 && errors.length === 0;
  const valid = Boolean(result?.valid) || obsoleteRequirementWasOnlyError;
  return {
    ...(result || {}),
    valid,
    errors: !valid && errors.length === 0
      ? [{ path: 'config', code: 'CONFIG_VALIDATION_INCOMPLETE', message: '' }]
      : errors,
  };
}

function appliedItems(config, issues, resourcesById, translate) {
  const layout = config?.layout || {};
  const format = formatDefinition(layout.format);
  const output = layout.output || {};
  const invalidPaths = (issues || []).map((entry) => String(entry?.path || ''));
  const hasIssue = (prefix) => invalidPaths.some((path) => path.startsWith(prefix));
  const items = [];

  if (!hasIssue('layout.format') && !hasIssue('layout.output') && !hasIssue('layout.slots') && !hasIssue('layout.order')) {
    const origin = layout.presetOrigin;
    const originLabel = origin
      ? `${translate('mirror_preset_template')}: ${origin.name} · ${translate(origin.source === 'favorite' ? 'mirror_preset_favorite' : 'mirror_preset_global')}`
      : translate('mirror_preset_custom');
    items.push({
      id: 'applied-format',
      title: translate('mirror_summary_applied_format'),
      detail: `${translate(format.labelKey)} · ${output.width} × ${output.height} px · ${layout.shotCount} ${translate('mirror_027')} · ${originLabel}`,
    });
  }

  const designCounts = [
    [translate('resource_008'), (layout.frameLayers || []).length],
    [translate('resource_012'), (layout.backgroundLayers || []).length],
    [translate('resource_053'), (layout.stickerLayers || []).length],
    [translate('mirror_137'), (layout.textLayers || []).length],
  ].filter(([, count]) => count > 0);
  if (designCounts.length) items.push({ id: 'applied-design', title: translate('mirror_summary_applied_design'), detail: designCounts.map(([label, count]) => `${label}: ${count}`).join(' · ') });

  const enabledStages = MIRROR_ANIMATION_STAGES.filter((stage) => config?.experience?.animationEnabledByStage?.[stage] === true);
  const validStages = enabledStages.filter((stage) => configuredAnimationForStage(config, resourcesById, stage));
  items.push({
    id: 'applied-animations',
    title: translate('mirror_summary_applied_animations'),
    detail: validStages.length ? validStages.map((stage) => translate(`mirror_stage_${stage}`)).join(' · ') : translate('mirror_summary_disabled'),
  });

  if (!hasIssue('capture')) {
    items.push({
      id: 'applied-capture',
      title: translate('mirror_summary_applied_capture'),
      detail: `${config.capture.firstCountdownSeconds}/${config.capture.nextCountdownSeconds}/${config.capture.reviewSeconds} ${translate('mirror_seconds')} · ${translate(config.capture.lens === 'normal' ? 'mirror_073' : config.capture.lens === 'wide' ? 'mirror_074' : 'mirror_075')} · ${translate(config.capture.quality === 'medium' ? 'mirror_076' : config.capture.quality === 'high' ? 'mirror_077' : 'mirror_078')}`,
    });
  }

  if (!hasIssue('delivery')) {
    const delivery = [config.delivery.qr && translate('mirror_091'), config.delivery.share && translate('mirror_092'), config.delivery.download && translate('mirror_093')].filter(Boolean);
    items.push({ id: 'applied-delivery', title: translate('mirror_summary_applied_delivery'), detail: delivery.length ? delivery.join(' · ') : translate('mirror_summary_disabled') });
  }
  if (!hasIssue('runtime')) items.push({ id: 'applied-runtime', title: translate('mirror_summary_applied_runtime'), detail: `${config.runtime.autoResetSeconds} ${translate('mirror_seconds')} · ${config.runtime.operatorMenuEnabled ? translate('mirror_summary_enabled') : translate('mirror_summary_disabled')}` });
  if (!hasIssue('print')) items.push({ id: 'applied-print', title: translate('print_009'), detail: config.print.enabled ? `${config.print.paperWidthCm} × ${config.print.paperHeightCm} cm · ${config.print.dpi} DPI` : translate('mirror_summary_disabled') });
  return items;
}

export function assessMagicMirrorConfig({ config, issues = [], resourcesById = {}, translate }) {
  const mergedIssues = [
    ...issues.filter((entry) => entry?.code !== 'FRAME_REQUIRED'),
    ...localMissingIssues(config, resourcesById),
  ];
  const uniqueIssues = [...new Map(mergedIssues.map((entry) => [issueIdentity(entry), entry])).values()];
  const normalized = uniqueIssues.map((entry) => ({
    id: issueIdentity(entry),
    kind: MISSING_CODES.has(String(entry?.code || '')) ? 'missing' : 'invalid',
    ...issueCopy(entry, translate),
    target: mirrorIssueTarget(entry, resourcesById, config),
    code: entry?.code,
  }));
  return {
    invalid: normalized.filter((entry) => entry.kind === 'invalid'),
    applied: appliedItems(config, uniqueIssues, resourcesById, translate),
    missing: normalized.filter((entry) => entry.kind === 'missing'),
  };
}
