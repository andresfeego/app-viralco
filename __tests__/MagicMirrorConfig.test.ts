import {
  addCustomSlot,
  applyCapturePreset,
  applyMirrorFormat,
  defaultMirrorConfig,
  duplicateCustomSlot,
  MIRROR_FORMATS,
  moveSlots,
  normalizeMirrorConfig,
  patchSlot,
  removeCustomSlot,
  reorderShot,
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

  test('keeps grouped movement and resize inside the canvas', () => {
    const slots = [{ photoNumber: 1, x: 5, y: 5, width: 40, height: 40 }, { photoNumber: 2, x: 55, y: 55, width: 40, height: 40 }];
    expect(moveSlots(slots, [1, 2], 30, 30)).toEqual([{ photoNumber: 1, x: 10, y: 10, width: 40, height: 40 }, { photoNumber: 2, x: 60, y: 60, width: 40, height: 40 }]);
    expect(patchSlot(slots, 2, { width: 80, height: 80 })[1]).toEqual({ photoNumber: 2, x: 55, y: 55, width: 45, height: 45 });
  });

  test('adds, duplicates and removes custom slots up to a stable order', () => {
    let config = applyMirrorFormat(defaultMirrorConfig(), 'personalizar-5x15');
    config = addCustomSlot(config);
    config = duplicateCustomSlot(config, 1);
    expect(config.layout.shotCount).toBe(5);
    config = reorderShot(config, 5, -1);
    expect(config.layout.order).toEqual([1, 2, 3, 5, 4]);
    config = removeCustomSlot(config, 2);
    expect(config.layout.shotCount).toBe(4);
    expect(config.layout.order).toEqual([1, 2, 3, 4]);
    expect(config.layout.slots.map((slot: any) => slot.photoNumber)).toEqual([1, 2, 3, 4]);
  });

  test('capture presets update real contract fields', () => {
    const config = applyCapturePreset(defaultMirrorConfig(), 'fast');
    expect(config.capture).toEqual(expect.objectContaining({ firstCountdownSeconds: 3, nextCountdownSeconds: 2, reviewSeconds: 3, quality: 'high', flashEnabled: true }));
  });
});
