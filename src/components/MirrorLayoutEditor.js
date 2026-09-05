import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { addCustomSlot, customizePhotoLayout, duplicateCustomSlot, duplicateSlotInstance, MIRROR_MAX_SLOT_INSTANCES, moveSelectedSlotsLayer, moveSlotsWithSnap, removeCustomSlot, resizeSlotsFromPointer, restoreFormatLayout, slotIdentity } from '../domain/magicMirrorConfig';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { MirrorConfigPreview } from './MirrorConfigPreview';
import { MirrorEditorHelpModal } from './MirrorEditorHelpModal';
import { MirrorEditorToolbar } from './MirrorEditorToolbar';

const clone = (value) => JSON.parse(JSON.stringify(value));
const sameLayout = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const TAP_MOVE_THRESHOLD = 2;
const normalizeAngle = (angle) => {
  let next = Number(angle) || 0;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next * 10) / 10;
};

function useLatest(value) {
  const reference = useRef(value);
  reference.current = value;
  return reference;
}

function RotationHandle({ corner, theme }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden style={[styles.rotationHandle, styles[corner], { backgroundColor: theme.surface, borderColor: theme.primary }]}>
      <Icon name="rotate" iconStyle="solid" size={tokens.typography.caption} color={theme.primary} />
    </View>
  );
}

function rotatePoint(x, y, radians) {
  return { x: x * Math.cos(radians) - y * Math.sin(radians), y: x * Math.sin(radians) + y * Math.cos(radians) };
}

function slotGeometry(slot, canvasSize) {
  const width = slot.width * canvasSize.width / 100;
  const height = slot.height * canvasSize.height / 100;
  return {
    width,
    height,
    center: { x: (slot.x + slot.width / 2) * canvasSize.width / 100, y: (slot.y + slot.height / 2) * canvasSize.height / 100 },
    radians: Number(slot.rotation || 0) * Math.PI / 180,
  };
}

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

export function hitTestMirrorGesture(slots, selectedSlotIds, tool, point, canvasSize, handleRadius = tokens.spacing.md, handlesInside = false) {
  if (!canvasSize.width || !canvasSize.height) return { mode: 'none', slotId: null };
  const ordered = [...slots].reverse();
  const selected = ordered.filter((slot) => selectedSlotIds.includes(slotIdentity(slot)));

  if (tool === 'rotate') {
    for (const slot of selected) {
      const geometry = slotGeometry(slot, canvasSize);
      const vertical = geometry.height / 2 + (handlesInside ? -tokens.spacing.sm : tokens.spacing.sm);
      const horizontal = geometry.width / 2 + (handlesInside ? -tokens.spacing.sm : tokens.spacing.sm);
      const offsets = [
        { x: 0, y: -vertical },
        { x: horizontal, y: 0 },
        { x: 0, y: vertical },
        { x: -horizontal, y: 0 },
      ];
      if (offsets.some((offset) => {
        const rotated = rotatePoint(offset.x, offset.y, geometry.radians);
        return distance(point, { x: geometry.center.x + rotated.x, y: geometry.center.y + rotated.y }) <= handleRadius;
      })) return { mode: 'rotate', slotId: slotIdentity(slot) };
    }
  }

  if (tool === 'move') {
    for (const slot of selected) {
      const geometry = slotGeometry(slot, canvasSize);
      const offset = rotatePoint(geometry.width / 2, geometry.height / 2, geometry.radians);
      const handle = { x: geometry.center.x + offset.x, y: geometry.center.y + offset.y };
      if (distance(point, handle) <= handleRadius) return { mode: 'resize', slotId: slotIdentity(slot) };
    }
  }

  for (const slot of ordered) {
    const geometry = slotGeometry(slot, canvasSize);
    const relative = rotatePoint(point.x - geometry.center.x, point.y - geometry.center.y, -geometry.radians);
    if (Math.abs(relative.x) <= geometry.width / 2 && Math.abs(relative.y) <= geometry.height / 2) {
      return { mode: tool === 'move' ? 'move' : 'tap', slotId: slotIdentity(slot) };
    }
  }
  return { mode: 'none', slotId: null };
}

function EditableSlot({ slot, selectedSlotIds, theme, disabled, tool, onSelect, onDelete, onSlotsChange, onInteractionStart, onInteractionEnd }) {
  const identity = slotIdentity(slot);
  const selected = selectedSlotIds.includes(identity);
  return (
    <View
      pointerEvents="box-none"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onAccessibilityTap={() => onSelect(identity)}
      style={[styles.slot, { left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%`, borderColor: selected ? theme.secondary : theme.primary, backgroundColor: selected ? tokens.colors.yellow[100] : tokens.colors.blue[100], transform: [{ rotate: `${Number(slot.rotation || 0)}deg` }] }]}
    >
      <Text pointerEvents="none" style={[styles.slotText, { color: selected ? tokens.colors.yellow[800] : tokens.colors.blue[800] }]}>{slot.photoNumber}</Text>
      {!disabled ? <View style={styles.deleteButton}><IconTextButton theme={theme} icon="trash-can" denseIconOnly iconSize={tokens.typography.caption} variant="ghost" backgroundColor={theme.alert} pressedBackgroundColor={theme.background} iconColor={theme.buttonText} accessibilityLabel={`${t('mirror_048')} ${slot.photoNumber}`} onPress={() => onDelete(identity)} /></View> : null}
      {!disabled && selected && tool === 'move' ? <View pointerEvents="none" style={[styles.resizeHandle, { backgroundColor: theme.primary }]} /> : null}
      {!disabled && selected && tool === 'rotate' ? ['topHandle', 'rightHandle', 'bottomHandle', 'leftHandle'].map((corner) => <RotationHandle key={corner} corner={corner} theme={theme} />) : null}
    </View>
  );
}

export function MirrorLayoutEditor({ config, onChange, onRestore, onSaveTemplate, onInteractionChange, resourcesById = {}, theme, disabled = false }) {
  const [selectedSlotIds, setSelectedSlotIds] = useState([slotIdentity(config.layout.slots[0])].filter(Boolean));
  const [multi, setMulti] = useState(false);
  const [tool, setTool] = useState('move');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState({ x: null, y: null });
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const [draftSlots, setDraftSlots] = useState(config.layout.slots);
  const draftSlotsRef = useRef(config.layout.slots);
  const interactionStart = useRef(null);
  draftSlotsRef.current = draftSlots;
  useEffect(() => {
    if (!interactionStart.current) setDraftSlots(config.layout.slots);
  }, [config.layout.slots]);
  const active = draftSlots.find((slot) => slotIdentity(slot) === selectedSlotIds[0]) || null;
  const select = (slotId) => setSelectedSlotIds((current) => {
    if (!multi) return current.includes(slotId) ? [] : [slotId];
    if (!current.includes(slotId)) return [...current, slotId];
    return current.filter((item) => item !== slotId);
  });
  const applyConfig = useCallback((next, record = true) => {
    if (sameLayout(next.layout, config.layout)) return;
    if (record) { setPast((items) => [...items, clone(config.layout)]); setFuture([]); }
    setDraftSlots(next.layout.slots);
    onChange(next);
  }, [config, onChange]);
  const setSlots = useCallback((slots) => { draftSlotsRef.current = slots; setDraftSlots(slots); }, []);
  const beginInteraction = useCallback(() => { if (!interactionStart.current) interactionStart.current = { config: clone(config), layout: clone(config.layout) }; onInteractionChange?.(true); }, [config, onInteractionChange]);
  const endInteraction = useCallback(() => {
    const gesture = interactionStart.current;
    if (gesture) {
      const nextLayout = { ...gesture.layout, slots: clone(draftSlotsRef.current) };
      if (!sameLayout(gesture.layout, nextLayout)) {
        setPast((items) => [...items, gesture.layout]);
        setFuture([]);
        onChange({ ...gesture.config, layout: nextLayout });
      }
    }
    interactionStart.current = null;
    onInteractionChange?.(false);
  }, [onChange, onInteractionChange]);
  const pendingGesture = useRef(null);
  const activeGesture = useRef(null);
  const gestureCurrent = useLatest({ canvasSize, disabled, draftSlots, selectedSlotIds, tool, select, setSlots, setGuides, beginInteraction, endInteraction });
  const canvasResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event) => {
      const value = gestureCurrent.current;
      if (value.disabled) return false;
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const hit = hitTestMirrorGesture(value.draftSlots, value.selectedSlotIds, value.tool, point, value.canvasSize);
      pendingGesture.current = { hit, point };
      return hit.mode !== 'none';
    },
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: (event) => {
      const value = gestureCurrent.current;
      const point = pendingGesture.current?.point || { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const hit = pendingGesture.current?.hit || hitTestMirrorGesture(value.draftSlots, value.selectedSlotIds, value.tool, point, value.canvasSize);
      const selectedAtStart = value.selectedSlotIds.includes(hit.slotId);
      const slotIds = selectedAtStart ? value.selectedSlotIds : [hit.slotId];
      const activeSlot = value.draftSlots.find((item) => slotIdentity(item) === hit.slotId);
      const geometry = activeSlot ? slotGeometry(activeSlot, value.canvasSize) : null;
      activeGesture.current = {
        mode: hit.mode,
        slotId: hit.slotId,
        slots: value.draftSlots,
        slotIds,
        point,
        moved: false,
        selectedAtStart,
        center: geometry?.center,
        initialAngle: geometry ? Math.atan2(point.y - geometry.center.y, point.x - geometry.center.x) : 0,
        initialRotations: Object.fromEntries(value.draftSlots.filter((item) => slotIds.includes(slotIdentity(item))).map((item) => [slotIdentity(item), Number(item.rotation || 0)])),
      };
      if (hit.mode === 'move' && !selectedAtStart) value.select(hit.slotId);
      if (['move', 'resize', 'rotate'].includes(hit.mode)) value.beginInteraction();
    },
    onPanResponderMove: (_event, gestureState) => {
      const value = gestureCurrent.current;
      const gesture = activeGesture.current;
      if (!gesture) return;
      if (Math.abs(gestureState.dx) > TAP_MOVE_THRESHOLD || Math.abs(gestureState.dy) > TAP_MOVE_THRESHOLD) gesture.moved = true;
      if (gesture.mode === 'move') {
        const result = moveSlotsWithSnap(gesture.slots, gesture.slotIds, gesture.slotId, (gestureState.dx / value.canvasSize.width) * 100, (gestureState.dy / value.canvasSize.height) * 100);
        value.setSlots(result.slots);
        value.setGuides(result.guides);
      } else if (gesture.mode === 'resize') {
        value.setSlots(resizeSlotsFromPointer(gesture.slots, gesture.slotIds, gesture.slotId, gestureState.dx, gestureState.dy, value.canvasSize));
      } else if (gesture.mode === 'rotate' && gesture.center) {
        const angle = Math.atan2(gesture.point.y + gestureState.dy - gesture.center.y, gesture.point.x + gestureState.dx - gesture.center.x);
        const delta = (angle - gesture.initialAngle) * 180 / Math.PI;
        value.setSlots(gesture.slots.map((item) => gesture.slotIds.includes(slotIdentity(item)) ? { ...item, rotation: normalizeAngle(gesture.initialRotations[slotIdentity(item)] + delta) } : item));
      }
    },
    onPanResponderRelease: () => {
      const value = gestureCurrent.current;
      const gesture = activeGesture.current;
      if (!gesture) return;
      if (gesture.mode === 'tap' && !gesture.moved) value.select(gesture.slotId);
      if (gesture.mode === 'move' && !gesture.moved && gesture.selectedAtStart) value.select(gesture.slotId);
      if (['move', 'resize', 'rotate'].includes(gesture.mode)) value.endInteraction();
      value.setGuides({ x: null, y: null });
      activeGesture.current = null;
      pendingGesture.current = null;
    },
    onPanResponderTerminate: () => {
      const value = gestureCurrent.current;
      if (activeGesture.current && ['move', 'resize', 'rotate'].includes(activeGesture.current.mode)) value.endInteraction();
      value.setGuides({ x: null, y: null });
      activeGesture.current = null;
      pendingGesture.current = null;
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [gestureCurrent]);
  const undo = () => { if (!past.length) return; const previous = past[past.length - 1]; setPast((items) => items.slice(0, -1)); setFuture((items) => [clone(config.layout), ...items]); setDraftSlots(previous.slots); onChange({ ...config, layout: clone(previous) }); };
  const redo = () => { if (!future.length) return; const next = future[0]; setFuture((items) => items.slice(1)); setPast((items) => [...items, clone(config.layout)]); setDraftSlots(next.slots); onChange({ ...config, layout: clone(next) }); };
  const moveLayer = (direction) => {
    const slots = moveSelectedSlotsLayer(draftSlots, selectedSlotIds, direction);
    applyConfig({ ...config, layout: { ...config.layout, slots } }, true);
  };
  const editorConfig = { ...config, layout: { ...config.layout, slots: draftSlots } };
  const remove = (slotId) => { const next = removeCustomSlot(customizePhotoLayout(editorConfig), slotId); applyConfig(next); setSelectedSlotIds([slotIdentity(next.layout.slots[0])].filter(Boolean)); };
  const canRaise = !sameLayout(moveSelectedSlotsLayer(draftSlots, selectedSlotIds, 1), draftSlots);
  const canLower = !sameLayout(moveSelectedSlotsLayer(draftSlots, selectedSlotIds, -1), draftSlots);
  const canvasGuides = (
    <>
    {guides.x !== null ? <View pointerEvents="none" style={[styles.guideVertical, { backgroundColor: theme.secondary, left: `${guides.x}%` }]} /> : null}
    {guides.y !== null ? <View pointerEvents="none" style={[styles.guideHorizontal, { backgroundColor: theme.secondary, top: `${guides.y}%` }]} /> : null}
    </>
  );
  const toolbarActions = [
    { key: 'move', icon: 'hand', label: t('mirror_150'), onPress: () => setTool('move'), selected: tool === 'move' },
    { key: 'rotate', icon: 'rotate', label: t('mirror_151'), onPress: () => setTool('rotate'), selected: tool === 'rotate' },
    { key: 'multi', icon: 'object-group', label: t('mirror_040'), onPress: () => setMulti((value) => !value), selected: multi },
    { key: 'raise', icon: 'arrow-up', label: t('mirror_155'), onPress: () => moveLayer(1), disabled: !canRaise },
    { key: 'lower', icon: 'arrow-down', label: t('mirror_156'), onPress: () => moveLayer(-1), disabled: !canLower },
    { key: 'undo', icon: 'rotate-left', label: t('mirror_153'), onPress: undo, disabled: !past.length },
    { key: 'redo', icon: 'rotate-right', label: t('mirror_154'), onPress: redo, disabled: !future.length },
    { key: 'duplicate', icon: 'copy', label: t('mirror_047'), onPress: () => applyConfig(duplicateCustomSlot(customizePhotoLayout(editorConfig), slotIdentity(active))), disabled: !active || config.layout.shotCount >= 8 || draftSlots.length >= MIRROR_MAX_SLOT_INSTANCES },
    { key: 'repeat', icon: 'copy', iconStyle: 'regular', label: t('mirror_173'), onPress: () => applyConfig(duplicateSlotInstance(customizePhotoLayout(editorConfig), slotIdentity(active))), disabled: !active || draftSlots.length >= MIRROR_MAX_SLOT_INSTANCES },
    { key: 'add', icon: 'plus', label: t('mirror_046'), onPress: () => applyConfig(addCustomSlot(customizePhotoLayout(editorConfig))), disabled: config.layout.shotCount >= 8 || draftSlots.length >= MIRROR_MAX_SLOT_INSTANCES },
    { key: 'strip', icon: 'table-columns', label: t('mirror_049'), onPress: () => applyConfig({ ...config, layout: { ...config.layout, duplicateStrip: !config.layout.duplicateStrip } }), selected: Boolean(config.layout.duplicateStrip), disabled: !['tira', 'personalizar-5x15'].includes(config.layout.format) },
    { key: 'restore', icon: 'arrows-rotate', label: t('mirror_041'), onPress: () => onRestore ? onRestore() : applyConfig(restoreFormatLayout(config)) },
    { key: 'favorite', icon: 'heart', label: t('mirror_157'), onPress: onSaveTemplate, disabled: !onSaveTemplate },
    { key: 'help', icon: 'circle-question', label: t('mirror_158'), onPress: () => setHelpVisible(true), allowReadOnly: true },
  ];
  const helpItems = [
    { key: 'move', icon: 'hand', label: t('mirror_150'), description: t('mirror_160') },
    { key: 'rotate', icon: 'rotate', label: t('mirror_151'), description: t('mirror_161') },
    { key: 'multi', icon: 'object-group', label: t('mirror_040'), description: t('mirror_162') },
    { key: 'raise', icon: 'arrow-up', label: t('mirror_155'), description: t('mirror_163') },
    { key: 'lower', icon: 'arrow-down', label: t('mirror_156'), description: t('mirror_164') },
    { key: 'undo', icon: 'rotate-left', label: t('mirror_153'), description: t('mirror_165') },
    { key: 'redo', icon: 'rotate-right', label: t('mirror_154'), description: t('mirror_166') },
    { key: 'duplicate', icon: 'copy', label: t('mirror_047'), description: t('mirror_167') },
    { key: 'repeat', icon: 'copy', iconStyle: 'regular', label: t('mirror_173'), description: t('mirror_174') },
    { key: 'add', icon: 'plus', label: t('mirror_046'), description: t('mirror_168') },
    { key: 'strip', icon: 'table-columns', label: t('mirror_049'), description: t('mirror_169') },
    { key: 'restore', icon: 'arrows-rotate', label: t('mirror_041'), description: t('mirror_170') },
    { key: 'favorite', icon: 'heart', label: t('mirror_157'), description: t('mirror_171') },
    { key: 'help', icon: 'circle-question', label: t('mirror_158'), description: t('mirror_172') },
  ];
  const previewConfig = { ...config, layout: { ...config.layout, slots: draftSlots } };
  return (
    <View style={styles.wrap}>
      <View style={styles.editorWorkspace}>
        <MirrorEditorToolbar actions={toolbarActions} theme={theme} disabled={disabled} />
        <View style={styles.canvasColumn}>
          <MirrorConfigPreview config={previewConfig} theme={theme} resourcesById={resourcesById} showMeta={false} canvasBackgroundColor={tokens.colors.gray[3]} testID="mirror-layout-canvas" onCanvasLayout={(event) => setCanvasSize(event.nativeEvent.layout)} canvasHandlers={canvasResponder.panHandlers} canvasOverlay={canvasGuides} renderSlot={(slot) => <EditableSlot key={slotIdentity(slot)} slot={slot} selectedSlotIds={selectedSlotIds} theme={theme} disabled={disabled} tool={tool} onSelect={select} onDelete={remove} onSlotsChange={setSlots} onInteractionStart={beginInteraction} onInteractionEnd={endInteraction} />} />
        </View>
      </View>
      <MirrorEditorHelpModal visible={helpVisible} items={helpItems} theme={theme} onClose={() => setHelpVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.md, position: 'relative' },
  editorWorkspace: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  canvasColumn: { flex: 1 },
  slot: { position: 'absolute', borderWidth: tokens.border.medium, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  slotText: { fontSize: tokens.typography.body, fontWeight: '700' },
  resizeHandle: { position: 'absolute', right: tokens.spacing.none, bottom: tokens.spacing.none, width: tokens.spacing.md, height: tokens.spacing.md, borderTopLeftRadius: tokens.radius.sm },
  deleteButton: { position: 'absolute', top: tokens.spacing.xxs, right: tokens.spacing.xxs },
  rotationHandle: { position: 'absolute', width: tokens.spacing.md, height: tokens.spacing.md, borderRadius: tokens.radius.pill, borderWidth: tokens.border.thin, alignItems: 'center', justifyContent: 'center' },
  topHandle: { left: '50%', top: -tokens.spacing.md, transform: [{ translateX: -tokens.spacing.xs }] },
  rightHandle: { right: -tokens.spacing.md, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  bottomHandle: { left: '50%', bottom: -tokens.spacing.md, transform: [{ translateX: -tokens.spacing.xs }] },
  leftHandle: { left: -tokens.spacing.md, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  guideVertical: { position: 'absolute', top: tokens.spacing.none, bottom: tokens.spacing.none, width: StyleSheet.hairlineWidth },
  guideHorizontal: { position: 'absolute', left: tokens.spacing.none, right: tokens.spacing.none, height: StyleSheet.hairlineWidth },
});
