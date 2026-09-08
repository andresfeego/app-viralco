import {
  addCustomSlot,
  addBackgroundColorLayer,
  addBackgroundResourceLayer,
  addFrameLayer,
  addStickerLayer,
  applyCapturePreset,
  applyMirrorFormat,
  applyPhotoLayoutPreset,
  defaultMirrorConfig,
  duplicateCustomSlot,
  duplicateBackgroundLayer,
  duplicateFrameLayer,
  duplicateStickerLayer,
  duplicateSlotInstance,
  customizePhotoLayout,
  MIRROR_CANVAS_HEIGHT,
  MIRROR_CANVAS_WIDTH,
  MIRROR_FORMATS,
  moveSelectedSlotsLayer,
  moveOverflowLayers,
  moveOverflowLayersWithSnap,
  moveSlots,
  moveSlotsWithSnap,
  normalizeMirrorConfig,
  patchSlot,
  removeCustomSlot,
  removeBackgroundLayer,
  removeBackgroundResourceLayers,
  removeFrameLayer,
  removeFrameResourceLayers,
  removeStickerLayer,
  removeStickerResourceLayers,
  reorderShot,
  resizeSlots,
  resizeSlotsFromPointer,
  resizeOverflowLayersFromPointer,
  slotIdentity,
} from '../src/domain/magicMirrorConfig';

describe('magic mirror config geometry', () => {
  test.each(MIRROR_FORMATS)('applies prototype format $id', (format) => {
    const config = applyMirrorFormat(defaultMirrorConfig(), format.id);
    expect(config.layout.output).toEqual({ width: format.width, height: format.height });
    expect(config.layout.shotCount).toBe(format.shots);
    expect(config.layout.slots).toHaveLength(format.shots);
    expect(config.layout.order).toEqual(Array.from({ length: format.shots }, (_, index) => index + 1));
  });

  test('normalizes the legacy vertical format on edit', () => {
    const legacy = defaultMirrorConfig();
    legacy.layout.format = 'digital-vertical';
    legacy.layout.output = { width: 1080, height: 1920 };
    const result = normalizeMirrorConfig(legacy);
    expect(result.migrated).toBe(true);
    expect(result.config.layout.format).toBe('digital');
    expect(result.config.layout.output).toEqual({ width: 1200, height: 1500 });
  });

  test('normalizes historical slots and clamps persisted rotation', () => {
    const historical = defaultMirrorConfig();
    delete historical.layout.slots[0].rotation;
    expect(normalizeMirrorConfig(historical).config.layout.slots[0].rotation).toBe(0);
    expect(patchSlot(historical.layout.slots, slotIdentity(historical.layout.slots[0]), { rotation: 240 })[0].rotation).toBe(180);
  });

  test('keeps grouped movement and resize inside the canvas', () => {
    const slots = [{ photoNumber: 1, x: 5, y: 5, width: 40, height: 40 }, { photoNumber: 2, x: 55, y: 55, width: 40, height: 40 }];
    expect(moveSlots(slots, [1, 2], 30, 30)).toEqual([{ photoNumber: 1, x: 10, y: 10, width: 40, height: 40 }, { photoNumber: 2, x: 60, y: 60, width: 40, height: 40 }]);
    expect(patchSlot(slots, 2, { width: 80, height: 80 })[1]).toEqual({ photoNumber: 2, x: 55, y: 55, width: 45, height: 45 });
    expect(resizeSlots(slots, [1, 2], 30, 30)).toEqual([{ photoNumber: 1, x: 5, y: 5, width: 45, height: 45 }, { photoNumber: 2, x: 55, y: 55, width: 45, height: 45 }]);
  });

  test('keeps the resized corner under the pointer for straight and rotated slots', () => {
    const canvas = { width: 1000, height: 1000 };
    const corner = (slot: any) => {
      const radians = Number(slot.rotation || 0) * Math.PI / 180;
      const halfWidth = slot.width * canvas.width / 200;
      const halfHeight = slot.height * canvas.height / 200;
      return {
        x: (slot.x + slot.width / 2) * canvas.width / 100 + Math.cos(radians) * halfWidth - Math.sin(radians) * halfHeight,
        y: (slot.y + slot.height / 2) * canvas.height / 100 + Math.sin(radians) * halfWidth + Math.cos(radians) * halfHeight,
      };
    };
    const straight = [{ photoNumber: 1, x: 20, y: 20, width: 20, height: 30, rotation: 0 }];
    const straightResult = resizeSlotsFromPointer(straight, [1], 1, 100, 50, canvas);
    expect(corner(straightResult[0]).x - corner(straight[0]).x).toBeCloseTo(100);
    expect(corner(straightResult[0]).y - corner(straight[0]).y).toBeCloseTo(50);

    const rotated = [{ ...straight[0], rotation: 90 }];
    const rotatedResult = resizeSlotsFromPointer(rotated, [1], 1, -100, 100, canvas);
    expect(corner(rotatedResult[0]).x - corner(rotated[0]).x).toBeCloseTo(-100);
    expect(corner(rotatedResult[0]).y - corner(rotated[0]).y).toBeCloseTo(100);
  });

  test('snaps a group against canvas and neighboring slot guides', () => {
    const slots = [{ photoNumber: 1, x: 9, y: 9, width: 20, height: 20 }, { photoNumber: 2, x: 50, y: 50, width: 20, height: 20 }];
    const result = moveSlotsWithSnap(slots, [1], 1, 20.7, 20.7);
    expect(result.guides).toEqual({ x: 50, y: 50 });
    expect(result.slots[0].x).toBeCloseTo(30);
    expect(result.slots[0].y).toBeCloseTo(30);
  });

  test('allows backgrounds and stickers outside the canvas while keeping ten percent visible', () => {
    const layers = [{ id: 'sticker-1', x: 10, y: 10, width: 20, height: 20, rotation: 0 }];
    const moved = moveOverflowLayers(layers, ['sticker-1'], -100, 0);
    expect(moved[0].x).toBeCloseTo(-18);
    expect(moved[0].y).toBe(10);

    const diagonal = moveOverflowLayers(layers, ['sticker-1'], -100, -100);
    const visibleWidth = Math.min(100, diagonal[0].x + diagonal[0].width) - Math.max(0, diagonal[0].x);
    const visibleHeight = Math.min(100, diagonal[0].y + diagonal[0].height) - Math.max(0, diagonal[0].y);
    expect((visibleWidth * visibleHeight) / (diagonal[0].width * diagonal[0].height)).toBeCloseTo(0.1);
  });

  test('keeps overflow snapping and pointer resize recoverable', () => {
    const layers = [{ id: 'background-color-a', x: 0, y: 0, width: 100, height: 100, rotation: 0 }];
    const moved = moveOverflowLayersWithSnap(layers, ['background-color-a'], 'background-color-a', 95, 0);
    expect(moved.slots[0].x).toBeCloseTo(90);
    const resized = resizeOverflowLayersFromPointer(
      [{ id: 'sticker-1', x: -10, y: 10, width: 25, height: 25, rotation: 0 }],
      ['sticker-1'],
      'sticker-1',
      -200,
      0,
      { width: 1000, height: 1000 },
    );
    expect(resized[0].width).toBeGreaterThanOrEqual(18);
    expect(resized[0].x).toBeLessThan(0);
  });

  test('resizes color backgrounds to twice the canvas while keeping resource backgrounds capped', () => {
    const canvas = { width: 1000, height: 1000 };
    const layers = [
      { id: 'background-color-a', kind: 'color', x: 0, y: 0, width: 100, height: 100, rotation: 0 },
      { id: 'background-resource-1', kind: 'resource', x: 0, y: 0, width: 100, height: 100, rotation: 0 },
    ];
    const maximumSize = (layer: any) => layer.kind === 'color' ? 200 : 100;
    const color = resizeOverflowLayersFromPointer(layers, ['background-color-a'], 'background-color-a', 2000, 2000, canvas, maximumSize);
    expect(color[0]).toEqual(expect.objectContaining({ width: 200, height: 200 }));
    const resource = resizeOverflowLayersFromPointer(layers, ['background-resource-1'], 'background-resource-1', 2000, 2000, canvas, maximumSize);
    expect(resource[1]).toEqual(expect.objectContaining({ width: 100, height: 100 }));
  });

  test('moves selected shots together within the photo layer stack', () => {
    const slots = [1, 2, 3, 4].map((photoNumber) => ({ photoNumber }));
    expect(moveSelectedSlotsLayer(slots, [1, 3], 1).map((slot) => slot.photoNumber)).toEqual([2, 1, 4, 3]);
    expect(moveSelectedSlotsLayer(slots, [2, 4], -1).map((slot) => slot.photoNumber)).toEqual([2, 1, 4, 3]);
    expect(moveSelectedSlotsLayer(slots, [3, 4], 1)).toEqual(slots);
    expect(moveSelectedSlotsLayer(slots, [1, 2], -1)).toEqual(slots);
  });

  test('detaches a template into the canonical portrait canvas', () => {
    const config = applyMirrorFormat(defaultMirrorConfig(), 'postal');
    config.resources.layoutTemplateResourceId = '99';
    config.layout.presetOrigin = { libraryAssetId: '329', name: 'Postal', source: 'global', contentHash: 'hash' };
    const customized = customizePhotoLayout(config);
    expect(customized.layout).toEqual(expect.objectContaining({ format: 'personalizar-5x15', output: { width: MIRROR_CANVAS_WIDTH, height: MIRROR_CANVAS_HEIGHT } }));
    expect(customized.layout.presetOrigin).toBeNull();
    expect(customized.resources.layoutTemplateResourceId).toBeNull();
  });

  test('copies complete preset geometry without associating an event resource', () => {
    const config = defaultMirrorConfig();
    const template = {
      baseFormat: 'personalizar-5x15', output: { width: 2000, height: 2960 }, shotCount: 2,
      order: [2, 1], duplicateStrip: true,
      slots: [
        { slotId: 'slot-1', photoNumber: 1, x: 8, y: 10, width: 40, height: 30, rotation: 12 },
        { slotId: 'slot-2', photoNumber: 2, x: 52, y: 45, width: 38, height: 42, rotation: -8 },
      ],
    };
    const origin = { libraryAssetId: '329', name: 'Dos fotos', source: 'favorite', contentHash: 'hash' };
    const applied = applyPhotoLayoutPreset(config, template, origin);
    expect(applied.layout).toEqual(expect.objectContaining({
      format: template.baseFormat, output: template.output, shotCount: 2, order: [2, 1], slots: template.slots,
      duplicateStrip: true, presetOrigin: origin,
    }));
    expect(applied.resources.layoutTemplateResourceId).toBeNull();
    expect(normalizeMirrorConfig(applied).config.layout.presetOrigin).toEqual(origin);
    expect(normalizeMirrorConfig(applied).config.layout.slots).toEqual(template.slots);
  });

  test('adds, duplicates and removes custom slots up to a stable order', () => {
    let config = applyMirrorFormat(defaultMirrorConfig(), 'personalizar-5x15');
    config = addCustomSlot(config);
    config = duplicateCustomSlot(config, slotIdentity(config.layout.slots[0]));
    expect(config.layout.shotCount).toBe(5);
    config = reorderShot(config, 5, -1);
    expect(config.layout.order).toEqual([1, 2, 3, 5, 4]);
    config = removeCustomSlot(config, slotIdentity(config.layout.slots.find((slot: any) => slot.photoNumber === 2)));
    expect(config.layout.shotCount).toBe(4);
    expect(config.layout.order).toEqual([1, 2, 4, 3]);
    expect(config.layout.slots.map((slot: any) => slot.photoNumber)).toEqual([1, 2, 3, 4]);
  });

  test('repeats one capture in independent visual slots without adding a shot', () => {
    let config = applyMirrorFormat(defaultMirrorConfig(), 'personalizar-5x15');
    const source = config.layout.slots[0];
    config = duplicateSlotInstance(config, slotIdentity(source));
    expect(config.layout.shotCount).toBe(3);
    expect(config.layout.order).toEqual([1, 2, 3]);
    expect(config.layout.slots).toHaveLength(4);
    expect(config.layout.slots.filter((slot: any) => slot.photoNumber === 1)).toHaveLength(2);
    expect(new Set(config.layout.slots.map((slot: any) => slot.slotId)).size).toBe(4);

    const repeated = config.layout.slots[3];
    config = removeCustomSlot(config, repeated.slotId);
    expect(config.layout.shotCount).toBe(3);
    expect(config.layout.slots).toHaveLength(3);
  });

  test('adds, duplicates and removes independent frame layers', () => {
    let config = addFrameLayer(defaultMirrorConfig(), '40');
    config = addFrameLayer(config, '41');
    config = duplicateFrameLayer(config, config.layout.frameLayers[0].id);
    expect(config.layout.frameLayers).toHaveLength(3);
    expect(config.layout.frameLayers.map((layer: any) => layer.resourceId)).toEqual(['40', '41', '40']);
    config = removeFrameLayer(config, config.layout.frameLayers[2].id);
    expect(config.layout.frameLayers).toHaveLength(2);
    config = removeFrameResourceLayers(config, ['40']);
    expect(config.layout.frameLayers).toEqual([expect.objectContaining({ resourceId: '41', order: 0 })]);
  });

  test('normalizes the historical single frame into an editable layer', () => {
    const historical = defaultMirrorConfig();
    delete historical.layout.frameLayers;
    historical.resources.frameResourceId = '72';
    const normalized = normalizeMirrorConfig(historical);
    expect(normalized.migrated).toBe(true);
    expect(normalized.config.resources.frameResourceId).toBeNull();
    expect(normalized.config.layout.frameLayers).toEqual([expect.objectContaining({ id: 'frame-72', resourceId: '72' })]);
  });

  test('adds stickers at 25 percent and permits duplicate visual layers for one resource', () => {
    let config = addStickerLayer(defaultMirrorConfig(), '90');
    expect(config.layout.stickerLayers).toEqual([
      expect.objectContaining({ id: 'sticker-90', resourceId: '90', width: 25, height: 25, order: 0 }),
    ]);
    config = duplicateStickerLayer(config, 'sticker-90');
    expect(config.layout.stickerLayers).toEqual([
      expect.objectContaining({ id: 'sticker-90', resourceId: '90', order: 0 }),
      expect.objectContaining({ id: 'sticker-90-2', resourceId: '90', order: 1 }),
    ]);
    config = removeStickerLayer(config, 'sticker-90-2');
    expect(config.layout.stickerLayers).toHaveLength(1);
    expect(removeStickerResourceLayers(config, ['90']).layout.stickerLayers).toEqual([]);
  });

  test('adds color and resource backgrounds as independent ordered layers', () => {
    let config = addBackgroundColorLayer(defaultMirrorConfig(), '#2D3047');
    config = addBackgroundResourceLayer(config, '80');
    config = duplicateBackgroundLayer(config, config.layout.backgroundLayers[0].id);
    expect(config.layout.backgroundLayers).toEqual([
      expect.objectContaining({ kind: 'color', color: '#2D3047', resourceId: null, order: 0 }),
      expect.objectContaining({ kind: 'resource', resourceId: '80', color: null, order: 1 }),
      expect.objectContaining({ kind: 'color', color: '#2D3047', resourceId: null, order: 2 }),
    ]);
    config = removeBackgroundLayer(config, config.layout.backgroundLayers[2].id);
    config = removeBackgroundResourceLayers(config, ['80']);
    expect(config.layout.backgroundLayers).toEqual([expect.objectContaining({ kind: 'color', order: 0 })]);
  });

  test('normalizes the historical single background into an editable layer', () => {
    const historical = defaultMirrorConfig();
    delete historical.layout.backgroundLayers;
    historical.resources.backgroundResourceId = '81';
    const normalized = normalizeMirrorConfig(historical);
    expect(normalized.migrated).toBe(true);
    expect(normalized.config.resources.backgroundResourceId).toBeNull();
    expect(normalized.config.layout.backgroundLayers).toEqual([expect.objectContaining({ id: 'background-resource-81', kind: 'resource', resourceId: '81' })]);
  });

  test('capture presets update real contract fields', () => {
    const config = applyCapturePreset(defaultMirrorConfig(), 'fast');
    expect(config.capture).toEqual(expect.objectContaining({ firstCountdownSeconds: 3, nextCountdownSeconds: 2, reviewSeconds: 3, quality: 'high', flashEnabled: true }));
  });
});
