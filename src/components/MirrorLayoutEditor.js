import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton } from '../design-system/components/AppButton';
import { tokens } from '../design-system/tokens';
import { addCustomSlot, duplicateCustomSlot, moveSlots, patchSlot, removeCustomSlot, reorderShot, restoreFormatLayout } from '../domain/magicMirrorConfig';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { ValueStepper } from './ValueStepper';

function EditableSlot({ slot, slots, selectedNumbers, canvasSize, theme, disabled, onSelect, onSlotsChange, onGuides }) {
  const startSlots = useRef(slots);
  startSlots.current = slots;
  const resizeStart = useRef(slot);
  resizeStart.current = slot;
  const selected = selectedNumbers.includes(slot.photoNumber);
  const drag = useMemo(() => {
    const activeNumbers = selected ? selectedNumbers : [slot.photoNumber];
    return PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: () => { startSlots.current = slots; onSelect(slot.photoNumber); },
    onPanResponderMove: (_event, gesture) => {
      if (!canvasSize.width || !canvasSize.height) return;
      const dx = (gesture.dx / canvasSize.width) * 100;
      const dy = (gesture.dy / canvasSize.height) * 100;
      const next = moveSlots(startSlots.current, activeNumbers, dx, dy);
      onSlotsChange(next);
      const current = next.find((item) => item.photoNumber === slot.photoNumber);
      onGuides({ x: Math.abs(current.x + current.width / 2 - 50) < 1, y: Math.abs(current.y + current.height / 2 - 50) < 1 });
    },
    onPanResponderRelease: () => onGuides({ x: false, y: false }),
    onPanResponderTerminate: () => onGuides({ x: false, y: false }),
    });
  }, [canvasSize.height, canvasSize.width, disabled, onGuides, onSelect, onSlotsChange, selected, selectedNumbers, slot.photoNumber, slots]);
  const resize = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: () => { resizeStart.current = slot; onSelect(slot.photoNumber); },
    onPanResponderMove: (_event, gesture) => {
      if (!canvasSize.width || !canvasSize.height) return;
      onSlotsChange(patchSlot(slots, slot.photoNumber, { width: resizeStart.current.width + (gesture.dx / canvasSize.width) * 100, height: resizeStart.current.height + (gesture.dy / canvasSize.height) * 100 }));
    },
  }), [canvasSize.height, canvasSize.width, disabled, onSelect, onSlotsChange, slot, slots]);

  return (
    <View {...drag.panHandlers} style={[styles.slot, { left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%`, borderColor: selected ? theme.secondary : theme.primary, backgroundColor: selected ? tokens.colors.yellow[100] : tokens.colors.blue[100] }]}>
      <Text style={[styles.slotText, { color: selected ? tokens.colors.yellow[800] : tokens.colors.blue[800] }]}>{slot.photoNumber}</Text>
      {!disabled ? <View {...resize.panHandlers} style={[styles.resizeHandle, { backgroundColor: theme.primary }]} /> : null}
    </View>
  );
}

export function MirrorLayoutEditor({ config, onChange, theme, disabled = false }) {
  const [selectedNumbers, setSelectedNumbers] = useState([config.layout.slots[0]?.photoNumber || 1]);
  const [multi, setMulti] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState({ x: false, y: false });
  const active = config.layout.slots.find((slot) => slot.photoNumber === selectedNumbers[0]) || config.layout.slots[0];
  const select = (photoNumber) => setSelectedNumbers((current) => multi ? (current.includes(photoNumber) ? current.filter((item) => item !== photoNumber) : [...current, photoNumber]) : [photoNumber]);
  const setSlots = (slots) => onChange({ ...config, layout: { ...config.layout, slots } });
  const patchActive = (patch) => active && setSlots(patchSlot(config.layout.slots, active.photoNumber, patch));
  const ratio = config.layout.output.width / config.layout.output.height;
  const isCustom = config.layout.format === 'personalizar-5x15';
  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>{t('mirror_040')}</Text>
          <Switch value={multi} onValueChange={setMulti} disabled={disabled} trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
        <AppButton label={t('mirror_041')} onPress={() => onChange(restoreFormatLayout(config))} disabled={disabled} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} style={styles.action} />
      </View>
      <View onLayout={(event) => setCanvasSize(event.nativeEvent.layout)} style={[styles.canvas, { aspectRatio: ratio, backgroundColor: theme.background, borderColor: theme.border }]}>
        {guides.x ? <View style={[styles.guideVertical, { backgroundColor: theme.secondary }]} /> : null}
        {guides.y ? <View style={[styles.guideHorizontal, { backgroundColor: theme.secondary }]} /> : null}
        {config.layout.slots.map((slot) => <EditableSlot key={slot.photoNumber} slot={slot} slots={config.layout.slots} selectedNumbers={selectedNumbers} canvasSize={canvasSize} theme={theme} disabled={disabled} onSelect={select} onSlotsChange={setSlots} onGuides={setGuides} />)}
      </View>
      {active ? (
        <View style={styles.controls}>
          <ValueStepper label="X" value={active.x} onChange={(x) => patchActive({ x })} max={100 - active.width} theme={theme} disabled={disabled} />
          <ValueStepper label="Y" value={active.y} onChange={(y) => patchActive({ y })} max={100 - active.height} theme={theme} disabled={disabled} />
          <ValueStepper label={t('mirror_042')} value={active.width} onChange={(width) => patchActive({ width })} min={4} max={100 - active.x} theme={theme} disabled={disabled} />
          <ValueStepper label={t('mirror_043')} value={active.height} onChange={(height) => patchActive({ height })} min={4} max={100 - active.y} theme={theme} disabled={disabled} />
        </View>
      ) : null}
      <View style={styles.toolbar}>
        <IconTextButton theme={theme} icon="arrow-left" label={t('mirror_044')} disabled={disabled || !active} onPress={() => onChange(reorderShot(config, active.photoNumber, -1))} />
        <IconTextButton theme={theme} icon="arrow-right" label={t('mirror_045')} order="text-first" disabled={disabled || !active} onPress={() => onChange(reorderShot(config, active.photoNumber, 1))} />
      </View>
      {isCustom ? (
        <View style={styles.toolbar}>
          <IconTextButton theme={theme} icon="plus" label={t('mirror_046')} disabled={disabled || config.layout.shotCount >= 8} onPress={() => onChange(addCustomSlot(config))} />
          <IconTextButton theme={theme} icon="copy" label={t('mirror_047')} disabled={disabled || !active || config.layout.shotCount >= 8} onPress={() => onChange(duplicateCustomSlot(config, active.photoNumber))} />
          <IconTextButton theme={theme} icon="trash" label={t('mirror_048')} variant="outline" disabled={disabled || !active || config.layout.shotCount <= 1} onPress={() => { onChange(removeCustomSlot(config, active.photoNumber)); setSelectedNumbers([1]); }} />
        </View>
      ) : null}
      {['tira', 'personalizar-5x15'].includes(config.layout.format) ? (
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>{t('mirror_049')}</Text>
          <Switch value={Boolean(config.layout.duplicateStrip)} onValueChange={(duplicateStrip) => onChange({ ...config, layout: { ...config.layout, duplicateStrip } })} disabled={disabled} trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.md },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm, alignItems: 'center', justifyContent: 'space-between' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm },
  label: { fontSize: tokens.typography.caption, fontWeight: '700' },
  action: { minWidth: tokens.spacing.xl * 4 },
  canvas: { width: '100%', maxHeight: tokens.spacing.xl * 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.md, position: 'relative', overflow: 'hidden' },
  slot: { position: 'absolute', borderWidth: tokens.spacing.xxs / 2, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  slotText: { fontSize: tokens.typography.body, fontWeight: '700' },
  resizeHandle: { position: 'absolute', right: tokens.spacing.none, bottom: tokens.spacing.none, width: tokens.spacing.md, height: tokens.spacing.md, borderTopLeftRadius: tokens.radius.sm },
  guideVertical: { position: 'absolute', top: tokens.spacing.none, bottom: tokens.spacing.none, left: '50%', width: StyleSheet.hairlineWidth },
  guideHorizontal: { position: 'absolute', left: tokens.spacing.none, right: tokens.spacing.none, top: '50%', height: StyleSheet.hairlineWidth },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
});
