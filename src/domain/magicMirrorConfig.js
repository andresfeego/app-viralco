import { tokens } from '../design-system/tokens';

export const MIRROR_ANIMATION_STAGES = [
  'start', 'beforeCountdown', 'afterCapture', 'processing',
];

export const MIRROR_CANVAS_WIDTH = 2000;
export const MIRROR_CANVAS_HEIGHT = 2960;
export const MIRROR_CANVAS_ASPECT_RATIO = MIRROR_CANVAS_WIDTH / MIRROR_CANVAS_HEIGHT;
export const MIRROR_SLOT_MIN_WIDTH = 18;
export const MIRROR_SLOT_MIN_HEIGHT = 7;
export const MIRROR_MAX_SLOT_INSTANCES = 16;
export const MIRROR_MAX_FRAME_LAYERS = 10;
export const MIRROR_MAX_BACKGROUND_LAYERS = 10;
export const MIRROR_MAX_STICKER_LAYERS = 10;
export const MIRROR_MAX_TEXT_LAYERS = 10;

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

export function createCustomTextLayer(id) {
  return { ...TEXT_LAYER_DEFAULTS[0], id, text: '', fontResourceId: null, rotation: 0, order: 0 };
}

export function ensureMirrorTextLayers(layers) {
  return (layers || []).map((layer, index) => ({ ...layer, rotation: Number(layer.rotation || 0), order: index }));
}

export function removeTextLayer(config, layerId) {
  const textLayers = ensureMirrorTextLayers((config.layout.textLayers || []).filter((layer) => String(layer.id) !== String(layerId)));
  return { ...config, layout: { ...config.layout, textLayers } };
}

export function duplicateTextLayer(config, layerId) {
  const layers = ensureMirrorTextLayers(config.layout.textLayers || []);
  if (layers.length >= MIRROR_MAX_TEXT_LAYERS) return config;
  const source = layers.find((layer) => String(layer.id) === String(layerId));
  if (!source) return config;
  const id = `custom-${Date.now()}-${layers.length}`;
  const layer = { ...source, id, x: clamp(source.x + tokens.spacing.xxs, 0, 100 - source.width), y: clamp(source.y + tokens.spacing.xxs, 0, 100), order: layers.length };
  return { ...config, layout: { ...config.layout, textLayers: [...layers, layer] } };
}

export function clearTextLayers(config) {
  return { ...config, layout: { ...config.layout, textLayers: [] } };
}

export const CAPTURE_PRESETS = {
  soft: { firstCountdownSeconds: 5, nextCountdownSeconds: 5, reviewSeconds: 5, quality: 'medium', flashEnabled: false },
  fast: { firstCountdownSeconds: 3, nextCountdownSeconds: 2, reviewSeconds: 3, quality: 'high', flashEnabled: true },
  party: { firstCountdownSeconds: 5, nextCountdownSeconds: 4, reviewSeconds: 4, quality: 'high', flashEnabled: true },
  event: { firstCountdownSeconds: 6, nextCountdownSeconds: 5, reviewSeconds: 4, quality: 'superior', flashEnabled: true },
};

export function cloneValue(value) {
  return JSON.parse(JSON.stringify(value));
}

export function slotIdentity(slot) {
  return String(slot?.slotId || slot?.id || slot?.photoNumber || '');
}

export function ensureMirrorFrameLayerIds(layers) {
  const used = new Set();
  return (layers || []).map((layer, index) => {
    const resourceId = String(layer?.resourceId || '');
    const base = String(layer?.id || `frame-${resourceId || index + 1}`);
    let id = base;
    let suffix = 2;
    while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
    used.add(id);
    return { ...layer, id, resourceId, rotation: Number(layer?.rotation || 0), order: index };
  });
}

export function ensureMirrorBackgroundLayerIds(layers) {
  const used = new Set();
  return (layers || []).map((layer, index) => {
    const kind = layer?.kind === 'color' ? 'color' : 'resource';
    const resourceId = kind === 'resource' ? String(layer?.resourceId || '') : null;
    const color = kind === 'color' ? String(layer?.color || '').toUpperCase() : null;
    const token = kind === 'resource' ? resourceId || index + 1 : (color || `color-${index + 1}`).replace(/[^a-z0-9]/gi, '');
    const base = String(layer?.id || `background-${kind}-${token}`);
    let id = base;
    let suffix = 2;
    while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
    used.add(id);
    return { ...layer, id, kind, resourceId, color, rotation: Number(layer?.rotation || 0), order: index };
  });
}

export function ensureMirrorStickerLayerIds(layers) {
  const used = new Set();
  return (layers || []).map((layer, index) => {
    const resourceId = String(layer?.resourceId || '');
    const base = String(layer?.id || `sticker-${resourceId || index + 1}`);
    let id = base;
    let suffix = 2;
    while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
    used.add(id);
    return { ...layer, id, resourceId, rotation: Number(layer?.rotation || 0), order: index };
  });
}

export function ensureMirrorSlotIds(slots) {
  const used = new Set();
  const occurrences = new Map();
  return (slots || []).map((slot) => {
    const photoNumber = Number(slot.photoNumber);
    const occurrence = (occurrences.get(photoNumber) || 0) + 1;
    occurrences.set(photoNumber, occurrence);
    const preferred = String(slot.slotId || `slot-${photoNumber}${occurrence > 1 ? `-${occurrence}` : ''}`);
    let slotId = preferred;
    let suffix = occurrence;
    while (used.has(slotId)) {
      suffix += 1;
      slotId = `slot-${photoNumber}-${suffix}`;
    }
    used.add(slotId);
    return { ...slot, slotId };
  });
}

function nextSlotId(slots, photoNumber) {
  const used = new Set((slots || []).map(slotIdentity));
  let occurrence = 1;
  let slotId = `slot-${photoNumber}`;
  while (used.has(slotId)) {
    occurrence += 1;
    slotId = `slot-${photoNumber}-${occurrence}`;
  }
  return slotId;
}

function matchesSlot(slot, identities) {
  const selected = new Set((identities || []).map(String));
  return selected.has(slotIdentity(slot));
}

export function defaultMirrorConfig() {
  return {
    layout: { format: 'digital', output: { width: 1200, height: 1500 }, shotCount: 1, order: [1], slots: ensureMirrorSlotIds(cloneValue(MIRROR_FORMATS[0].slots)), duplicateStrip: false, presetOrigin: null, backgroundLayers: [], frameLayers: [], textLayers: [], stickerLayers: [] },
    resources: { templateResourceId: null, layoutTemplateResourceId: null, frameResourceId: null, gifOverlayResourceId: null, startScreenResourceId: null, backgroundResourceId: null, fontResourceId: null, animationResourceIds: [] },
    capture: { firstCountdownSeconds: 5, nextCountdownSeconds: 5, reviewSeconds: 5, flashEnabled: true, lens: 'wide', quality: 'high', preserveOriginals: true, roamingMode: false },
    experience: {
      style: 'video-vertical',
      virtualAssistantEnabled: true,
      randomByStage: {},
      animationEnabledByStage: { start: false, beforeCountdown: false, afterCapture: false, processing: false },
    },
    gif: { enabled: false, captureCount: 2, delayMs: 300, reverse: false, size: 'vertical-720' },
    backgroundRemoval: { enabled: false, mode: 'automatic', finalBackground: 'transparent', edgeSoftness: 'medium', keepShadow: true },
    print: { enabled: false, profileResourceId: null, paperWidthCm: 10, paperHeightCm: 14.8, orientation: 'portrait', dpi: 300, marginCm: 0, copies: 1, fit: 'contain', twoPerPage: false },
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
  const sourceFrameLayers = Array.isArray(source.layout?.frameLayers)
    ? source.layout.frameLayers
    : source.resources?.frameResourceId
      ? [{ id: `frame-${source.resources.frameResourceId}`, resourceId: String(source.resources.frameResourceId), x: 0, y: 0, width: 100, height: 100, rotation: 0, order: 0 }]
      : [];
  const sourceBackgroundLayers = Array.isArray(source.layout?.backgroundLayers)
    ? source.layout.backgroundLayers
    : source.resources?.backgroundResourceId
      ? [{ id: `background-resource-${source.resources.backgroundResourceId}`, kind: 'resource', resourceId: String(source.resources.backgroundResourceId), color: null, x: 0, y: 0, width: 100, height: 100, rotation: 0, order: 0 }]
      : [];
  const config = {
    ...base,
    ...source,
    layout: {
      ...base.layout,
      ...(source.layout || {}),
      slots: Array.isArray(source.layout?.slots) ? ensureMirrorSlotIds(source.layout.slots.map((slot) => ({ ...slot, rotation: Number(slot.rotation || 0) }))) : cloneValue(base.layout.slots),
      backgroundLayers: ensureMirrorBackgroundLayerIds(sourceBackgroundLayers),
      frameLayers: ensureMirrorFrameLayerIds(sourceFrameLayers),
      textLayers: ensureMirrorTextLayers(Array.isArray(source.layout?.textLayers) ? source.layout.textLayers : []),
      stickerLayers: ensureMirrorStickerLayerIds(Array.isArray(source.layout?.stickerLayers) ? source.layout.stickerLayers : []),
    },
    resources: { ...base.resources, ...(source.resources || {}), frameResourceId: null, backgroundResourceId: null },
    capture: { ...base.capture, ...(source.capture || {}) },
    experience: {
      ...base.experience,
      ...(source.experience || {}),
      randomByStage: { ...base.experience.randomByStage, ...(source.experience?.randomByStage || {}) },
      animationEnabledByStage: { ...base.experience.animationEnabledByStage, ...(source.experience?.animationEnabledByStage || {}) },
    },
    gif: { ...base.gif, ...(source.gif || {}), enabled: false },
    backgroundRemoval: { ...base.backgroundRemoval, ...(source.backgroundRemoval || {}), enabled: false },
    print: { ...base.print, ...(source.print || {}) },
    delivery: { ...base.delivery, ...(source.delivery || {}) },
    runtime: { ...base.runtime, ...(source.runtime || {}) },
  };
  if (legacy) {
    config.layout = { ...config.layout, format: format.id, output: { width: format.width, height: format.height }, shotCount: format.shots, order: [1], slots: ensureMirrorSlotIds(cloneValue(format.slots)) };
  }
  const missingSlotIds = Array.isArray(source.layout?.slots) && source.layout.slots.some((slot) => !slot?.slotId);
  const migratedFrame = !Array.isArray(source.layout?.frameLayers) && Boolean(source.resources?.frameResourceId);
  const migratedBackground = !Array.isArray(source.layout?.backgroundLayers) && Boolean(source.resources?.backgroundResourceId);
  return { config, migrated: legacy || missingSlotIds || migratedFrame || migratedBackground };
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
      slots: ensureMirrorSlotIds(cloneValue(format.slots)),
      duplicateStrip: format.duplicateStrip ? Boolean(config.layout.duplicateStrip) : false,
    },
  };
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function patchSlot(slots, identity, patch) {
  return slots.map((slot) => {
    if (slotIdentity(slot) !== String(identity)) return slot;
    const next = { ...slot, ...patch };
    next.width = clamp(next.width, 4, 100 - next.x);
    next.height = clamp(next.height, 4, 100 - next.y);
    next.x = clamp(next.x, 0, 100 - next.width);
    next.y = clamp(next.y, 0, 100 - next.height);
    if (next.rotation !== undefined) next.rotation = clamp(next.rotation, -180, 180);
    return next;
  });
}

export function moveSlots(slots, slotIds, deltaX, deltaY) {
  const selected = slots.filter((slot) => matchesSlot(slot, slotIds));
  if (!selected.length) return slots;
  const boundedX = clamp(deltaX, Math.max(...selected.map((slot) => -slot.x)), Math.min(...selected.map((slot) => 100 - slot.x - slot.width)));
  const boundedY = clamp(deltaY, Math.max(...selected.map((slot) => -slot.y)), Math.min(...selected.map((slot) => 100 - slot.y - slot.height)));
  return slots.map((slot) => matchesSlot(slot, slotIds) ? { ...slot, x: slot.x + boundedX, y: slot.y + boundedY } : slot);
}

export function resizeSlots(slots, slotIds, deltaWidth, deltaHeight) {
  const selected = slots.filter((slot) => matchesSlot(slot, slotIds));
  if (!selected.length) return slots;
  const boundedWidth = clamp(deltaWidth, Math.max(...selected.map((slot) => MIRROR_SLOT_MIN_WIDTH - slot.width)), Math.min(...selected.map((slot) => 100 - slot.x - slot.width)));
  const boundedHeight = clamp(deltaHeight, Math.max(...selected.map((slot) => MIRROR_SLOT_MIN_HEIGHT - slot.height)), Math.min(...selected.map((slot) => 100 - slot.y - slot.height)));
  return slots.map((slot) => matchesSlot(slot, slotIds) ? { ...slot, width: slot.width + boundedWidth, height: slot.height + boundedHeight } : slot);
}

export function moveSelectedSlotsLayer(slots, slotIds, direction) {
  const selected = new Set((slotIds || []).map(String));
  const next = [...slots];
  if (direction > 0) {
    for (let index = next.length - 2; index >= 0; index -= 1) {
      if (selected.has(slotIdentity(next[index])) && !selected.has(slotIdentity(next[index + 1]))) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      }
    }
  } else if (direction < 0) {
    for (let index = 1; index < next.length; index += 1) {
      if (selected.has(slotIdentity(next[index])) && !selected.has(slotIdentity(next[index - 1]))) {
        [next[index], next[index - 1]] = [next[index - 1], next[index]];
      }
    }
  }
  return next;
}

export function resizeSlotsFromPointer(slots, slotIds, activeSlotId, deltaX, deltaY, canvasSize) {
  if (!canvasSize?.width || !canvasSize?.height) return slots;
  const active = slots.find((slot) => slotIdentity(slot) === String(activeSlotId));
  if (!active) return slots;
  const radians = Number(active.rotation || 0) * Math.PI / 180;
  const localDeltaX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
  const localDeltaY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
  const resized = resizeSlots(slots, slotIds, (localDeltaX / canvasSize.width) * 100, (localDeltaY / canvasSize.height) * 100);

  return resized.map((slot) => {
    if (!matchesSlot(slot, slotIds)) return slot;
    const previous = slots.find((item) => slotIdentity(item) === slotIdentity(slot));
    const slotRadians = Number(previous.rotation || 0) * Math.PI / 180;
    const widthDelta = ((slot.width - previous.width) / 100) * canvasSize.width;
    const heightDelta = ((slot.height - previous.height) / 100) * canvasSize.height;
    const centerDeltaX = Math.cos(slotRadians) * widthDelta / 2 - Math.sin(slotRadians) * heightDelta / 2;
    const centerDeltaY = Math.sin(slotRadians) * widthDelta / 2 + Math.cos(slotRadians) * heightDelta / 2;
    const x = previous.x + ((centerDeltaX - widthDelta / 2) / canvasSize.width) * 100;
    const y = previous.y + ((centerDeltaY - heightDelta / 2) / canvasSize.height) * 100;
    return { ...slot, x: clamp(x, 0, 100 - slot.width), y: clamp(y, 0, 100 - slot.height) };
  });
}

function alignmentTargets(slots, excludedSlotIds, axis) {
  const values = [0, 50, 100];
  slots.filter((slot) => !matchesSlot(slot, excludedSlotIds)).forEach((slot) => {
    const start = axis === 'x' ? slot.x : slot.y;
    const size = axis === 'x' ? slot.width : slot.height;
    values.push(start, start + size / 2, start + size);
  });
  return values;
}

function snapAxis(slot, axis, targets, threshold) {
  const start = axis === 'x' ? slot.x : slot.y;
  const size = axis === 'x' ? slot.width : slot.height;
  const probes = [{ value: start, offset: 0 }, { value: start + size / 2, offset: size / 2 }, { value: start + size, offset: size }];
  for (const target of targets) {
    const probe = probes.find((item) => Math.abs(item.value - target) <= threshold);
    if (probe) return { delta: target - probe.value, guide: target };
  }
  return { delta: 0, guide: null };
}

export function moveSlotsWithSnap(slots, slotIds, activeSlotId, deltaX, deltaY, threshold = 1.2) {
  const moved = moveSlots(slots, slotIds, deltaX, deltaY);
  const active = moved.find((slot) => slotIdentity(slot) === String(activeSlotId));
  if (!active) return { slots: moved, guides: { x: null, y: null } };
  const snapX = snapAxis(active, 'x', alignmentTargets(moved, slotIds, 'x'), threshold);
  const snapY = snapAxis(active, 'y', alignmentTargets(moved, slotIds, 'y'), threshold);
  return {
    slots: moveSlots(moved, slotIds, snapX.delta, snapY.delta),
    guides: { x: snapX.guide, y: snapY.guide },
  };
}

export const MIRROR_LAYER_MIN_VISIBLE_RATIO = 0.1;
export const MIRROR_BACKGROUND_COLOR_MAX_SIZE = 200;

export function visibleLayerRatio(layer) {
  const x = Number(layer?.x);
  const y = Number(layer?.y);
  const width = Number(layer?.width);
  const height = Number(layer?.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return 0;
  const visibleWidth = Math.max(0, Math.min(100, x + width) - Math.max(0, x));
  const visibleHeight = Math.max(0, Math.min(100, y + height) - Math.max(0, y));
  return (visibleWidth * visibleHeight) / (width * height);
}

function interpolateLayers(previous, next, amount, slotIds) {
  return next.map((layer, index) => {
    if (!matchesSlot(layer, slotIds)) return layer;
    const source = previous[index];
    return {
      ...layer,
      x: source.x + (layer.x - source.x) * amount,
      y: source.y + (layer.y - source.y) * amount,
      width: source.width + (layer.width - source.width) * amount,
      height: source.height + (layer.height - source.height) * amount,
    };
  });
}

function constrainOverflowLayers(previous, requested, slotIds, minimumVisibleRatio = MIRROR_LAYER_MIN_VISIBLE_RATIO) {
  const selectedAreVisible = (layers) => layers
    .filter((layer) => matchesSlot(layer, slotIds))
    .every((layer) => visibleLayerRatio(layer) >= minimumVisibleRatio - Number.EPSILON);
  if (selectedAreVisible(requested)) return requested;

  let minimum = 0;
  let maximum = 1;
  for (let iteration = 0; iteration < 32; iteration += 1) {
    const amount = (minimum + maximum) / 2;
    if (selectedAreVisible(interpolateLayers(previous, requested, amount, slotIds))) minimum = amount;
    else maximum = amount;
  }
  return interpolateLayers(previous, requested, minimum, slotIds);
}

export function moveOverflowLayers(layers, layerIds, deltaX, deltaY, minimumVisibleRatio = MIRROR_LAYER_MIN_VISIBLE_RATIO) {
  const selected = layers.filter((layer) => matchesSlot(layer, layerIds));
  if (!selected.length) return layers;
  const requested = layers.map((layer) => matchesSlot(layer, layerIds)
    ? { ...layer, x: layer.x + deltaX, y: layer.y + deltaY }
    : layer);
  return constrainOverflowLayers(layers, requested, layerIds, minimumVisibleRatio);
}

export function moveOverflowLayersWithSnap(layers, layerIds, activeLayerId, deltaX, deltaY, threshold = 1.2) {
  const moved = moveOverflowLayers(layers, layerIds, deltaX, deltaY);
  const active = moved.find((layer) => slotIdentity(layer) === String(activeLayerId));
  if (!active) return { slots: moved, guides: { x: null, y: null } };
  const snapX = snapAxis(active, 'x', alignmentTargets(moved, layerIds, 'x'), threshold);
  const snapY = snapAxis(active, 'y', alignmentTargets(moved, layerIds, 'y'), threshold);
  return {
    slots: moveOverflowLayers(moved, layerIds, snapX.delta, snapY.delta),
    guides: { x: snapX.guide, y: snapY.guide },
  };
}

export function resizeOverflowLayersFromPointer(layers, layerIds, activeLayerId, deltaX, deltaY, canvasSize, maximumSize = 100) {
  if (!canvasSize?.width || !canvasSize?.height) return layers;
  const active = layers.find((layer) => slotIdentity(layer) === String(activeLayerId));
  const selected = layers.filter((layer) => matchesSlot(layer, layerIds));
  if (!active || !selected.length) return layers;

  const radians = Number(active.rotation || 0) * Math.PI / 180;
  const localDeltaX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
  const localDeltaY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
  const widthDelta = clamp(
    (localDeltaX / canvasSize.width) * 100,
    Math.max(...selected.map((layer) => MIRROR_SLOT_MIN_WIDTH - layer.width)),
    Math.min(...selected.map((layer) => (typeof maximumSize === 'function' ? maximumSize(layer) : maximumSize) - layer.width)),
  );
  const heightDelta = clamp(
    (localDeltaY / canvasSize.height) * 100,
    Math.max(...selected.map((layer) => MIRROR_SLOT_MIN_HEIGHT - layer.height)),
    Math.min(...selected.map((layer) => (typeof maximumSize === 'function' ? maximumSize(layer) : maximumSize) - layer.height)),
  );
  const requested = layers.map((layer) => {
    if (!matchesSlot(layer, layerIds)) return layer;
    const layerRadians = Number(layer.rotation || 0) * Math.PI / 180;
    const widthDeltaPixels = widthDelta * canvasSize.width / 100;
    const heightDeltaPixels = heightDelta * canvasSize.height / 100;
    const centerDeltaX = Math.cos(layerRadians) * widthDeltaPixels / 2 - Math.sin(layerRadians) * heightDeltaPixels / 2;
    const centerDeltaY = Math.sin(layerRadians) * widthDeltaPixels / 2 + Math.cos(layerRadians) * heightDeltaPixels / 2;
    return {
      ...layer,
      x: layer.x + ((centerDeltaX - widthDeltaPixels / 2) / canvasSize.width) * 100,
      y: layer.y + ((centerDeltaY - heightDeltaPixels / 2) / canvasSize.height) * 100,
      width: layer.width + widthDelta,
      height: layer.height + heightDelta,
    };
  });
  return constrainOverflowLayers(layers, requested, layerIds);
}

export function customizePhotoLayout(config) {
  return {
    ...config,
    layout: {
      ...config.layout,
      format: 'personalizar-5x15',
      output: { width: MIRROR_CANVAS_WIDTH, height: MIRROR_CANVAS_HEIGHT },
      shotCount: config.layout.shotCount,
      presetOrigin: null,
    },
    resources: { ...config.resources, layoutTemplateResourceId: null },
  };
}

export function applyPhotoLayoutPreset(config, template, origin) {
  return {
    ...config,
    layout: {
      ...config.layout,
      format: template.baseFormat,
      output: cloneValue(template.output),
      shotCount: template.shotCount,
      order: cloneValue(template.order),
      slots: ensureMirrorSlotIds(cloneValue(template.slots)),
      duplicateStrip: Boolean(template.duplicateStrip),
      presetOrigin: cloneValue(origin),
    },
    resources: { ...config.resources, layoutTemplateResourceId: null },
  };
}

export function addCustomSlot(config) {
  if (config.layout.format !== 'personalizar-5x15' || config.layout.shotCount >= 8 || config.layout.slots.length >= MIRROR_MAX_SLOT_INSTANCES) return config;
  const photoNumber = config.layout.shotCount + 1;
  return { ...config, layout: { ...config.layout, shotCount: photoNumber, order: [...config.layout.order, photoNumber], slots: [...config.layout.slots, { slotId: nextSlotId(config.layout.slots, photoNumber), photoNumber, x: 28.5, y: clamp(20 + (photoNumber - 1) * 10, 0, 82), width: 43, height: 18, rotation: 0 }] } };
}

export function removeCustomSlot(config, slotId) {
  if (config.layout.format !== 'personalizar-5x15') return config;
  const target = config.layout.slots.find((slot) => slotIdentity(slot) === String(slotId));
  if (!target) return config;
  const samePhotoSlots = config.layout.slots.filter((slot) => slot.photoNumber === target.photoNumber);
  if (samePhotoSlots.length > 1) {
    return { ...config, layout: { ...config.layout, slots: config.layout.slots.filter((slot) => slotIdentity(slot) !== String(slotId)) } };
  }
  if (config.layout.shotCount <= 1) return config;
  const remaining = config.layout.slots
    .filter((slot) => slotIdentity(slot) !== String(slotId))
    .map((slot) => slot.photoNumber > target.photoNumber ? { ...slot, photoNumber: slot.photoNumber - 1 } : slot);
  const order = config.layout.order.filter((photoNumber) => photoNumber !== target.photoNumber).map((photoNumber) => photoNumber > target.photoNumber ? photoNumber - 1 : photoNumber);
  return { ...config, layout: { ...config.layout, shotCount: config.layout.shotCount - 1, order, slots: remaining } };
}

export function duplicateCustomSlot(config, slotId) {
  if (config.layout.format !== 'personalizar-5x15' || config.layout.shotCount >= 8 || config.layout.slots.length >= MIRROR_MAX_SLOT_INSTANCES) return config;
  const source = config.layout.slots.find((slot) => slotIdentity(slot) === String(slotId)) || config.layout.slots[0];
  const nextNumber = config.layout.shotCount + 1;
  const slot = { ...source, slotId: nextSlotId(config.layout.slots, nextNumber), photoNumber: nextNumber, x: clamp(source.x + 4, 0, 100 - source.width), y: clamp(source.y + 4, 0, 100 - source.height) };
  return { ...config, layout: { ...config.layout, shotCount: nextNumber, order: [...config.layout.order, nextNumber], slots: [...config.layout.slots, slot] } };
}

export function duplicateSlotInstance(config, slotId) {
  if (config.layout.format !== 'personalizar-5x15' || config.layout.slots.length >= MIRROR_MAX_SLOT_INSTANCES) return config;
  const source = config.layout.slots.find((slot) => slotIdentity(slot) === String(slotId)) || config.layout.slots[0];
  if (!source) return config;
  const slot = { ...source, slotId: nextSlotId(config.layout.slots, source.photoNumber), x: clamp(source.x + 4, 0, 100 - source.width), y: clamp(source.y + 4, 0, 100 - source.height) };
  return { ...config, layout: { ...config.layout, slots: [...config.layout.slots, slot] } };
}

function nextFrameLayerId(layers, resourceId) {
  const used = new Set((layers || []).map((layer) => String(layer.id)));
  const base = `frame-${resourceId}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
  return id;
}

export function addFrameLayer(config, resourceId) {
  const layers = config.layout.frameLayers || [];
  if (!resourceId || layers.length >= MIRROR_MAX_FRAME_LAYERS) return config;
  const layer = { id: nextFrameLayerId(layers, resourceId), resourceId: String(resourceId), x: 0, y: 0, width: 100, height: 100, rotation: 0, order: layers.length };
  return { ...config, layout: { ...config.layout, frameLayers: [...layers, layer] }, resources: { ...config.resources, frameResourceId: null } };
}

export function duplicateFrameLayer(config, layerId) {
  const layers = config.layout.frameLayers || [];
  if (layers.length >= MIRROR_MAX_FRAME_LAYERS) return config;
  const source = layers.find((layer) => String(layer.id) === String(layerId));
  if (!source) return config;
  const layer = {
    ...source,
    id: nextFrameLayerId(layers, source.resourceId),
    x: clamp(source.x + 4, 0, 100 - source.width),
    y: clamp(source.y + 4, 0, 100 - source.height),
    order: layers.length,
  };
  return { ...config, layout: { ...config.layout, frameLayers: [...layers, layer] }, resources: { ...config.resources, frameResourceId: null } };
}

export function removeFrameLayer(config, layerId) {
  const layers = (config.layout.frameLayers || []).filter((layer) => String(layer.id) !== String(layerId)).map((layer, index) => ({ ...layer, order: index }));
  return { ...config, layout: { ...config.layout, frameLayers: layers }, resources: { ...config.resources, frameResourceId: null } };
}

export function removeFrameResourceLayers(config, resourceIds) {
  const removed = new Set((resourceIds || []).map(String));
  const layers = (config.layout.frameLayers || []).filter((layer) => !removed.has(String(layer.resourceId))).map((layer, index) => ({ ...layer, order: index }));
  return { ...config, layout: { ...config.layout, frameLayers: layers }, resources: { ...config.resources, frameResourceId: null } };
}

export function clearFrameLayers(config) {
  return { ...config, layout: { ...config.layout, frameLayers: [] }, resources: { ...config.resources, frameResourceId: null } };
}

function nextBackgroundLayerId(layers, kind, value) {
  const used = new Set((layers || []).map((layer) => String(layer.id)));
  const token = String(value || kind).replace(/[^a-z0-9]/gi, '') || kind;
  const base = `background-${kind}-${token}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
  return id;
}

function addBackgroundLayer(config, kind, value) {
  const layers = config.layout.backgroundLayers || [];
  if (!value || layers.length >= MIRROR_MAX_BACKGROUND_LAYERS) return config;
  const layer = {
    id: nextBackgroundLayerId(layers, kind, value), kind,
    resourceId: kind === 'resource' ? String(value) : null,
    color: kind === 'color' ? String(value).toUpperCase() : null,
    x: 0, y: 0, width: 100, height: 100, rotation: 0, order: layers.length,
  };
  return { ...config, layout: { ...config.layout, backgroundLayers: [...layers, layer] }, resources: { ...config.resources, backgroundResourceId: null } };
}

export function addBackgroundResourceLayer(config, resourceId) {
  return addBackgroundLayer(config, 'resource', resourceId);
}

export function addBackgroundColorLayer(config, color) {
  if (!/^#[0-9a-f]{6}$/i.test(String(color || ''))) return config;
  return addBackgroundLayer(config, 'color', color);
}

export function duplicateBackgroundLayer(config, layerId) {
  const layers = config.layout.backgroundLayers || [];
  if (layers.length >= MIRROR_MAX_BACKGROUND_LAYERS) return config;
  const source = layers.find((layer) => String(layer.id) === String(layerId));
  if (!source) return config;
  const value = source.kind === 'color' ? source.color : source.resourceId;
  const layer = { ...source, id: nextBackgroundLayerId(layers, source.kind, value), x: clamp(source.x + 4, 0, 100 - source.width), y: clamp(source.y + 4, 0, 100 - source.height), order: layers.length };
  return { ...config, layout: { ...config.layout, backgroundLayers: [...layers, layer] }, resources: { ...config.resources, backgroundResourceId: null } };
}

export function removeBackgroundLayer(config, layerId) {
  const layers = (config.layout.backgroundLayers || []).filter((layer) => String(layer.id) !== String(layerId)).map((layer, index) => ({ ...layer, order: index }));
  return { ...config, layout: { ...config.layout, backgroundLayers: layers }, resources: { ...config.resources, backgroundResourceId: null } };
}

export function removeBackgroundResourceLayers(config, resourceIds) {
  const removed = new Set((resourceIds || []).map(String));
  const layers = (config.layout.backgroundLayers || []).filter((layer) => layer.kind !== 'resource' || !removed.has(String(layer.resourceId))).map((layer, index) => ({ ...layer, order: index }));
  return { ...config, layout: { ...config.layout, backgroundLayers: layers }, resources: { ...config.resources, backgroundResourceId: null } };
}

export function clearBackgroundLayers(config) {
  return { ...config, layout: { ...config.layout, backgroundLayers: [] }, resources: { ...config.resources, backgroundResourceId: null } };
}

function nextStickerLayerId(layers, resourceId) {
  const used = new Set((layers || []).map((layer) => String(layer.id)));
  const base = `sticker-${resourceId}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) { id = `${base}-${suffix}`; suffix += 1; }
  return id;
}

export function addStickerLayer(config, resourceId) {
  const layers = config.layout.stickerLayers || [];
  if (!resourceId || layers.length >= MIRROR_MAX_STICKER_LAYERS) return config;
  const offset = (layers.length * 5) % 30;
  const layer = { id: nextStickerLayerId(layers, resourceId), resourceId: String(resourceId), x: 10 + offset, y: 10 + offset, width: 25, height: 25, rotation: 0, order: layers.length };
  return { ...config, layout: { ...config.layout, stickerLayers: [...layers, layer] } };
}

export function duplicateStickerLayer(config, layerId) {
  const layers = config.layout.stickerLayers || [];
  if (layers.length >= MIRROR_MAX_STICKER_LAYERS) return config;
  const source = layers.find((layer) => String(layer.id) === String(layerId));
  if (!source) return config;
  const layer = { ...source, id: nextStickerLayerId(layers, source.resourceId), x: clamp(source.x + 4, 0, 100 - source.width), y: clamp(source.y + 4, 0, 100 - source.height), order: layers.length };
  return { ...config, layout: { ...config.layout, stickerLayers: [...layers, layer] } };
}

export function removeStickerLayer(config, layerId) {
  const layers = (config.layout.stickerLayers || []).filter((layer) => String(layer.id) !== String(layerId)).map((layer, index) => ({ ...layer, order: index }));
  return { ...config, layout: { ...config.layout, stickerLayers: layers } };
}

export function removeStickerResourceLayers(config, resourceIds) {
  const removed = new Set((resourceIds || []).map(String));
  const layers = (config.layout.stickerLayers || []).filter((layer) => !removed.has(String(layer.resourceId))).map((layer, index) => ({ ...layer, order: index }));
  return { ...config, layout: { ...config.layout, stickerLayers: layers } };
}

export function clearStickerLayers(config) {
  return { ...config, layout: { ...config.layout, stickerLayers: [] } };
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
  return [
    config.resources.templateResourceId,
    config.resources.frameResourceId,
    config.resources.backgroundResourceId,
    config.resources.fontResourceId,
    config.resources.startScreenResourceId,
    config.print.profileResourceId,
    ...(config.layout.frameLayers || []).map((layer) => layer.resourceId),
    ...(config.layout.backgroundLayers || []).filter((layer) => layer.kind === 'resource').map((layer) => layer.resourceId),
    ...(config.resources.animationResourceIds || []),
    ...(config.layout.stickerLayers || []).map((layer) => layer.resourceId),
    ...(config.layout.textLayers || []).map((layer) => layer.fontResourceId),
  ].filter(Boolean).map(String);
}
