import { tokens } from '../design-system/tokens';

export const MIRROR_ANIMATION_STAGES = [
  'beforeCountdown', 'afterCapture', 'countdown', 'pickMusic', 'beforeSignature',
  'processing', 'afterProcessing', 'sessionEnd',
];

export const MIRROR_FORMATS = [
  { id: 'digital', shots: 1, width: 1200, height: 1500, labelKey: 'mirror_020', slots: [{ photoNumber: 1, x: 7, y: 17, width: 86, height: 66 }] },
  { id: 'doble', shots: 2, width: 1200, height: 1500, labelKey: 'mirror_021', slots: [{ photoNumber: 1, x: 7, y: 17.6, width: 86, height: 34.15 }, { photoNumber: 2, x: 7, y: 55.25, width: 86, height: 34.15 }] },
  { id: 'recuerdo', shots: 3, width: 1200, height: 1800, labelKey: 'mirror_022', slots: [{ photoNumber: 1, x: 13, y: 9, width: 74, height: 32 }, { photoNumber: 2, x: 13, y: 44.5, width: 35.7, height: 28.5 }, { photoNumber: 3, x: 51.3, y: 44.5, width: 35.7, height: 28.5 }] },
  { id: 'tira', shots: 3, width: 600, height: 1800, labelKey: 'mirror_023', duplicateStrip: true, slots: [{ photoNumber: 1, x: 7, y: 12.33, width: 86, height: 24.84 }, { photoNumber: 2, x: 7, y: 39.57, width: 86, height: 24.84 }, { photoNumber: 3, x: 7, y: 66.81, width: 86, height: 24.84 }] },
  { id: 'personalizar-5x15', shots: 3, minShots: 1, maxShots: 8, width: 2000, height: 2960, labelKey: 'mirror_024', duplicateStrip: true, slots: [{ photoNumber: 1, x: 28.5, y: 20, width: 43, height: 18 }, { photoNumber: 2, x: 28.5, y: 40.5, width: 43, height: 18 }, { photoNumber: 3, x: 28.5, y: 61, width: 43, height: 18 }] },
  { id: 'postal', shots: 1, width: 1800, height: 1200, labelKey: 'mirror_025', slots: [{ photoNumber: 1, x: 7, y: 17, width: 86, height: 65 }] },
  { id: 'collage', shots: 4, width: 1600, height: 1200, labelKey: 'mirror_026', slots: [{ photoNumber: 1, x: 7, y: 21.33, width: 41.25, height: 29.92 }, { photoNumber: 2, x: 51.75, y: 21.33, width: 41.25, height: 29.92 }, { photoNumber: 3, x: 7, y: 54.75, width: 41.25, height: 29.92 }, { photoNumber: 4, x: 51.75, y: 54.75, width: 41.25, height: 29.92 }] },
];

export const TEXT_LAYER_DEFAULTS = [
  { id: 'script', text: '', x: 18, y: 6.5, width: 64, size: 18, color: tokens.colors.error[600], font: 'arial' },
  { id: 'name', text: '', x: 18, y: 80, width: 64, size: 22, color: tokens.colors.error[600], font: 'arial' },
  { id: 'event', text: '', x: 20, y: 85, width: 60, size: 14, color: tokens.colors.gray[9], font: 'arial' },
  { id: 'date', text: '', x: 24, y: 89, width: 52, size: 12, color: tokens.colors.gray[5], font: 'arial' },
];

export const CAPTURE_PRESETS = {
  soft: { firstCountdownSeconds: 5, nextCountdownSeconds: 5, reviewSeconds: 5, quality: 'medium', flashEnabled: false },
  fast: { firstCountdownSeconds: 3, nextCountdownSeconds: 2, reviewSeconds: 3, quality: 'high', flashEnabled: true },
  party: { firstCountdownSeconds: 5, nextCountdownSeconds: 4, reviewSeconds: 4, quality: 'high', flashEnabled: true },
  event: { firstCountdownSeconds: 6, nextCountdownSeconds: 5, reviewSeconds: 4, quality: 'superior', flashEnabled: true },
};

export function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}
export function defaultMirrorConfig() {
  return {
    layout: { format: 'digital', output: { width: 1200, height: 1500 }, shotCount: 1, order: [1], slots: cloneValue(MIRROR_FORMATS[0].slots), duplicateStrip: false, textLayers: [] },
    resources: { templateResourceId: null, frameResourceId: null, gifOverlayResourceId: null, startScreenResourceId: null, backgroundResourceId: null, fontResourceId: null, animationResourceIds: [] },
    capture: { firstCountdownSeconds: 5, nextCountdownSeconds: 5, reviewSeconds: 5, flashEnabled: true, lens: 'wide', quality: 'high', preserveOriginals: true, roamingMode: false },
    experience: { style: 'video-vertical', virtualAssistantEnabled: true, randomByStage: {} },
    gif: { enabled: false, captureCount: 2, delayMs: 300, reverse: false, size: 'vertical-720' },
    backgroundRemoval: { enabled: false, mode: 'automatic', finalBackground: 'transparent', edgeSoftness: 'medium', keepShadow: true },
    print: { enabled: false, paperWidthCm: 10, paperHeightCm: 14.8, orientation: 'portrait', dpi: 300, marginCm: 0, copies: 1, fit: 'contain', twoPerPage: false },
    delivery: { qr: true, share: true, download: true, print: false },
    runtime: { autoResetSeconds: 15, operatorMenuEnabled: true },
  };
}

export function formatDefinition(formatId) {
  return MIRROR_FORMATS.find((item) => item.id === formatId) || MIRROR_FORMATS[0];
}

export function normalizeMirrorConfig(input) {
  const base = defaultMirrorConfig();
  const source = input && typeof input === 'object' ? input : {};
  const legacy = source.layout?.format === 'digital-vertical';
  const format = legacy ? MIRROR_FORMATS[0] : formatDefinition(source.layout?.format);
  const config = {
    ...base,
    ...source,
    layout: { ...base.layout, ...(source.layout || {}) },
    resources: { ...base.resources, ...(source.resources || {}) },
    capture: { ...base.capture, ...(source.capture || {}) },
    experience: { ...base.experience, ...(source.experience || {}), randomByStage: { ...base.experience.randomByStage, ...(source.experience?.randomByStage || {}) } },
    gif: { ...base.gif, ...(source.gif || {}), enabled: false },
    backgroundRemoval: { ...base.backgroundRemoval, ...(source.backgroundRemoval || {}), enabled: false },
    print: { ...base.print, ...(source.print || {}), enabled: false },
    delivery: { ...base.delivery, ...(source.delivery || {}), print: false },
    runtime: { ...base.runtime, ...(source.runtime || {}) },
  };
  if (legacy) {
    config.layout = { ...config.layout, format: format.id, output: { width: format.width, height: format.height }, shotCount: format.shots, order: [1], slots: cloneValue(format.slots) };
  }
  return { config, migrated: legacy };
}

export function applyMirrorFormat(config, formatId) {
  const format = formatDefinition(formatId);
  return {
    ...config,
    layout: {
      ...config.layout,
      format: format.id,
      output: { width: format.width, height: format.height },
      shotCount: format.shots,
      order: Array.from({ length: format.shots }, (_, index) => index + 1),
      slots: cloneValue(format.slots),
      duplicateStrip: format.duplicateStrip ? Boolean(config.layout.duplicateStrip) : false,
    },
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function patchSlot(slots, photoNumber, patch) {
  return slots.map((slot) => {
    if (slot.photoNumber !== photoNumber) return slot;
    const next = { ...slot, ...patch };
    next.width = clamp(next.width, 4, 100 - next.x);
    next.height = clamp(next.height, 4, 100 - next.y);
    next.x = clamp(next.x, 0, 100 - next.width);
    next.y = clamp(next.y, 0, 100 - next.height);
    return next;
  });
}

export function moveSlots(slots, photoNumbers, deltaX, deltaY) {
  const selected = slots.filter((slot) => photoNumbers.includes(slot.photoNumber));
  if (!selected.length) return slots;
  const boundedX = clamp(deltaX, Math.max(...selected.map((slot) => -slot.x)), Math.min(...selected.map((slot) => 100 - slot.x - slot.width)));
  const boundedY = clamp(deltaY, Math.max(...selected.map((slot) => -slot.y)), Math.min(...selected.map((slot) => 100 - slot.y - slot.height)));
  return slots.map((slot) => photoNumbers.includes(slot.photoNumber) ? { ...slot, x: slot.x + boundedX, y: slot.y + boundedY } : slot);
}

export function addCustomSlot(config) {
  if (config.layout.format !== 'personalizar-5x15' || config.layout.shotCount >= 8) return config;
  const photoNumber = config.layout.shotCount + 1;
  return { ...config, layout: { ...config.layout, shotCount: photoNumber, order: [...config.layout.order, photoNumber], slots: [...config.layout.slots, { photoNumber, x: 28.5, y: clamp(20 + (photoNumber - 1) * 10, 0, 82), width: 43, height: 18 }] } };
}

export function removeCustomSlot(config, photoNumber) {
  if (config.layout.format !== 'personalizar-5x15' || config.layout.shotCount <= 1) return config;
  const remaining = config.layout.slots.filter((slot) => slot.photoNumber !== photoNumber).map((slot, index) => ({ ...slot, photoNumber: index + 1 }));
  return { ...config, layout: { ...config.layout, shotCount: remaining.length, order: remaining.map((slot) => slot.photoNumber), slots: remaining } };
}

export function duplicateCustomSlot(config, photoNumber) {
  if (config.layout.format !== 'personalizar-5x15' || config.layout.shotCount >= 8) return config;
  const source = config.layout.slots.find((slot) => slot.photoNumber === photoNumber) || config.layout.slots[0];
  const nextNumber = config.layout.shotCount + 1;
  const slot = { ...source, photoNumber: nextNumber, x: clamp(source.x + 4, 0, 100 - source.width), y: clamp(source.y + 4, 0, 100 - source.height) };
  return { ...config, layout: { ...config.layout, shotCount: nextNumber, order: [...config.layout.order, nextNumber], slots: [...config.layout.slots, slot] } };
}

export function reorderShot(config, photoNumber, direction) {
  const order = [...config.layout.order];
  const index = order.indexOf(photoNumber);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return config;
  [order[index], order[target]] = [order[target], order[index]];
  return { ...config, layout: { ...config.layout, order } };
}

export function restoreFormatLayout(config) {
  return applyMirrorFormat(config, config.layout.format);
}

export function applyCapturePreset(config, presetId) {
  return { ...config, capture: { ...config.capture, ...(CAPTURE_PRESETS[presetId] || CAPTURE_PRESETS.party) } };
}

export function configResourceIds(config) {
  return [config.resources.templateResourceId, config.resources.frameResourceId, config.resources.backgroundResourceId, config.resources.fontResourceId, config.resources.startScreenResourceId, ...(config.resources.animationResourceIds || [])].filter(Boolean).map(String);
}
