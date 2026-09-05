import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { tokens } from '../design-system/tokens';
import { clearFrameLayers, duplicateFrameLayer, MIRROR_MAX_FRAME_LAYERS, moveSelectedSlotsLayer, moveSlotsWithSnap, removeFrameLayer, resizeSlotsFromPointer } from '../domain/magicMirrorConfig';
import { t } from '../i18n';
import { IconTextButton } from './IconTextButton';
import { hitTestMirrorGesture } from './MirrorLayoutEditor';
import { MirrorConfigPreview } from './MirrorConfigPreview';
import { MirrorEditorHelpModal } from './MirrorEditorHelpModal';
import { MirrorEditorToolbar } from './MirrorEditorToolbar';

const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const TAP_MOVE_THRESHOLD = 2;

function normalizeAngle(angle) {
  let next = Number(angle) || 0;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next * 10) / 10;
}

function geometry(layer, canvasSize) {
  return {
    center: { x: (layer.x + layer.width / 2) * canvasSize.width / 100, y: (layer.y + layer.height / 2) * canvasSize.height / 100 },
  };
}

function useLatest(value) {
  const reference = useRef(value);
  reference.current = value;
  return reference;
}

function RotationHandle({ corner, theme }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden style={[styles.rotationHandle, styles[`${corner}Inside`], { backgroundColor: theme.surface, borderColor: theme.primary }]}>
      <Icon name="rotate" iconStyle="solid" size={tokens.typography.caption} color={theme.primary} />
    </View>
  );
}

function EditableFrameLayer({ layer, selectedIds, theme, disabled, tool, onSelect, onDelete }) {
  const selected = selectedIds.includes(String(layer.id));
  const geometryStyle = { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: [{ rotate: `${Number(layer.rotation || 0)}deg` }] };
  return (
    <View
      pointerEvents="box-none"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onAccessibilityTap={() => onSelect(String(layer.id))}
      style={[styles.frameLayer, geometryStyle, { borderColor: selected ? theme.secondary : theme.border, borderWidth: selected ? tokens.border.medium : StyleSheet.hairlineWidth }]}
    >
      {!disabled ? <View style={styles.deleteButton}><IconTextButton theme={theme} icon="trash-can" denseIconOnly iconSize={tokens.typography.caption} variant="ghost" backgroundColor={theme.alert} pressedBackgroundColor={theme.background} iconColor={theme.buttonText} accessibilityLabel={t('mirror_frame_remove')} onPress={() => onDelete(String(layer.id))} /></View> : null}
      {!disabled && selected && tool === 'move' ? <View pointerEvents="none" style={[styles.resizeHandle, { backgroundColor: theme.primary }]} /> : null}
      {!disabled && selected && tool === 'rotate' ? ['topHandle', 'rightHandle', 'bottomHandle', 'leftHandle'].map((corner) => <RotationHandle key={corner} corner={corner} theme={theme} />) : null}
    </View>
  );
}

export function MirrorFrameEditor({ config, onChange, resourcesById = {}, theme, disabled = false, onInteractionChange }) {
  const initialLayers = config.layout.frameLayers || [];
  const [draftLayers, setDraftLayers] = useState(initialLayers);
  const [selectedIds, setSelectedIds] = useState([String(initialLayers[0]?.id || '')].filter(Boolean));
  const [multi, setMulti] = useState(false);
  const [tool, setTool] = useState('move');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState({ x: null, y: null });
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const draftRef = useRef(initialLayers);
  const interactionStart = useRef(null);
  draftRef.current = draftLayers;

  useEffect(() => {
    if (!interactionStart.current) setDraftLayers(config.layout.frameLayers || []);
  }, [config.layout.frameLayers]);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => (config.layout.frameLayers || []).some((layer) => String(layer.id) === id)));
  }, [config.layout.frameLayers]);

  const active = draftLayers.find((layer) => String(layer.id) === selectedIds[0]) || null;
  const select = (id) => setSelectedIds((current) => {
    if (!multi) return current.includes(id) ? [] : [id];
    return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  });
  const applyConfig = useCallback((next, record = true) => {
    if (same(next.layout.frameLayers || [], config.layout.frameLayers || [])) return;
    if (record) { setPast((items) => [...items, clone(config.layout.frameLayers || [])]); setFuture([]); }
    setDraftLayers(next.layout.frameLayers || []);
    onChange(next);
  }, [config, onChange]);
  const setLayers = useCallback((layers) => { draftRef.current = layers; setDraftLayers(layers); }, []);
  const beginInteraction = useCallback(() => {
    if (!interactionStart.current) interactionStart.current = { config: clone(config), layers: clone(config.layout.frameLayers || []) };
    onInteractionChange?.(true);
  }, [config, onInteractionChange]);
  const endInteraction = useCallback(() => {
    const gesture = interactionStart.current;
    if (gesture && !same(gesture.layers, draftRef.current)) {
      setPast((items) => [...items, gesture.layers]);
      setFuture([]);
      onChange({ ...gesture.config, layout: { ...gesture.config.layout, frameLayers: clone(draftRef.current) } });
    }
    interactionStart.current = null;
    onInteractionChange?.(false);
  }, [onChange, onInteractionChange]);

  const pendingGesture = useRef(null);
  const activeGesture = useRef(null);
  const current = useLatest({ canvasSize, disabled, draftLayers, selectedIds, tool, select, setLayers, setGuides, beginInteraction, endInteraction });
  const canvasResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (event) => {
      const value = current.current;
      if (value.disabled || !value.draftLayers.length) return false;
      const point = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const hit = hitTestMirrorGesture(value.draftLayers, value.selectedIds, value.tool, point, value.canvasSize, tokens.spacing.md, true);
      pendingGesture.current = { hit, point };
      return hit.mode !== 'none';
    },
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: (event) => {
      const value = current.current;
      const point = pendingGesture.current?.point || { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY };
      const hit = pendingGesture.current?.hit || hitTestMirrorGesture(value.draftLayers, value.selectedIds, value.tool, point, value.canvasSize, tokens.spacing.md, true);
      const selectedAtStart = value.selectedIds.includes(hit.slotId);
      const ids = selectedAtStart ? value.selectedIds : [hit.slotId];
      const activeLayer = value.draftLayers.find((item) => String(item.id) === hit.slotId);
      const center = activeLayer ? geometry(activeLayer, value.canvasSize).center : null;
      activeGesture.current = {
        mode: hit.mode, id: hit.slotId, layers: value.draftLayers, ids, point, moved: false, selectedAtStart, center,
        initialAngle: center ? Math.atan2(point.y - center.y, point.x - center.x) : 0,
        initialRotations: Object.fromEntries(value.draftLayers.filter((item) => ids.includes(String(item.id))).map((item) => [String(item.id), Number(item.rotation || 0)])),
      };
      if (hit.mode === 'move' && !selectedAtStart) value.select(hit.slotId);
      if (['move', 'resize', 'rotate'].includes(hit.mode)) value.beginInteraction();
    },
    onPanResponderMove: (_event, gestureState) => {
      const value = current.current;
      const gesture = activeGesture.current;
      if (!gesture) return;
      if (Math.abs(gestureState.dx) > TAP_MOVE_THRESHOLD || Math.abs(gestureState.dy) > TAP_MOVE_THRESHOLD) gesture.moved = true;
      if (gesture.mode === 'move') {
        const result = moveSlotsWithSnap(gesture.layers, gesture.ids, gesture.id, (gestureState.dx / value.canvasSize.width) * 100, (gestureState.dy / value.canvasSize.height) * 100);
        value.setLayers(result.slots); value.setGuides(result.guides);
      } else if (gesture.mode === 'resize') {
        value.setLayers(resizeSlotsFromPointer(gesture.layers, gesture.ids, gesture.id, gestureState.dx, gestureState.dy, value.canvasSize));
      } else if (gesture.mode === 'rotate' && gesture.center) {
        const angle = Math.atan2(gesture.point.y + gestureState.dy - gesture.center.y, gesture.point.x + gestureState.dx - gesture.center.x);
        const delta = (angle - gesture.initialAngle) * 180 / Math.PI;
        value.setLayers(gesture.layers.map((item) => gesture.ids.includes(String(item.id)) ? { ...item, rotation: normalizeAngle(gesture.initialRotations[String(item.id)] + delta) } : item));
      }
    },
    onPanResponderRelease: () => {
      const value = current.current; const gesture = activeGesture.current;
      if (!gesture) return;
      if (gesture.mode === 'tap' && !gesture.moved) value.select(gesture.id);
      if (gesture.mode === 'move' && !gesture.moved && gesture.selectedAtStart) value.select(gesture.id);
      if (['move', 'resize', 'rotate'].includes(gesture.mode)) value.endInteraction();
      value.setGuides({ x: null, y: null }); activeGesture.current = null; pendingGesture.current = null;
    },
    onPanResponderTerminate: () => {
      const value = current.current;
      if (activeGesture.current && ['move', 'resize', 'rotate'].includes(activeGesture.current.mode)) value.endInteraction();
      value.setGuides({ x: null, y: null }); activeGesture.current = null; pendingGesture.current = null;
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [current]);

  const editorConfig = { ...config, layout: { ...config.layout, frameLayers: draftLayers } };
  const moveLayer = (direction) => applyConfig({ ...config, layout: { ...config.layout, frameLayers: moveSelectedSlotsLayer(draftLayers, selectedIds, direction).map((layer, index) => ({ ...layer, order: index })) } });
  const remove = (id) => { const next = removeFrameLayer(editorConfig, id); applyConfig(next); setSelectedIds([]); };
  const undo = () => { if (!past.length) return; const previous = past[past.length - 1]; setPast((items) => items.slice(0, -1)); setFuture((items) => [clone(config.layout.frameLayers || []), ...items]); applyConfig({ ...config, layout: { ...config.layout, frameLayers: clone(previous) } }, false); };
  const redo = () => { if (!future.length) return; const next = future[0]; setFuture((items) => items.slice(1)); setPast((items) => [...items, clone(config.layout.frameLayers || [])]); applyConfig({ ...config, layout: { ...config.layout, frameLayers: clone(next) } }, false); };
  const canRaise = !same(moveSelectedSlotsLayer(draftLayers, selectedIds, 1), draftLayers);
  const canLower = !same(moveSelectedSlotsLayer(draftLayers, selectedIds, -1), draftLayers);
  const actions = [
    { key: 'move', icon: 'hand', label: t('mirror_150'), onPress: () => setTool('move'), selected: tool === 'move' },
    { key: 'rotate', icon: 'rotate', label: t('mirror_151'), onPress: () => setTool('rotate'), selected: tool === 'rotate' },
    { key: 'multi', icon: 'object-group', label: t('mirror_040'), onPress: () => setMulti((value) => !value), selected: multi },
    { key: 'raise', icon: 'arrow-up', label: t('mirror_frame_raise'), onPress: () => moveLayer(1), disabled: !canRaise },
    { key: 'lower', icon: 'arrow-down', label: t('mirror_frame_lower'), onPress: () => moveLayer(-1), disabled: !canLower },
    { key: 'undo', icon: 'rotate-left', label: t('mirror_153'), onPress: undo, disabled: !past.length },
    { key: 'redo', icon: 'rotate-right', label: t('mirror_154'), onPress: redo, disabled: !future.length },
    { key: 'copy', icon: 'copy', label: t('mirror_frame_copy'), onPress: () => applyConfig(duplicateFrameLayer(editorConfig, active?.id)), disabled: !active || draftLayers.length >= MIRROR_MAX_FRAME_LAYERS },
    { key: 'clear', icon: 'arrows-rotate', label: t('mirror_frame_clear'), onPress: () => applyConfig(clearFrameLayers(editorConfig)), disabled: !draftLayers.length },
    { key: 'help', icon: 'circle-question', label: t('mirror_158'), onPress: () => setHelpVisible(true), allowReadOnly: true },
  ];
  const helpItems = [
    { key: 'move', icon: 'hand', label: t('mirror_150'), description: t('mirror_frame_help_move') },
    { key: 'rotate', icon: 'rotate', label: t('mirror_151'), description: t('mirror_frame_help_rotate') },
    { key: 'multi', icon: 'object-group', label: t('mirror_040'), description: t('mirror_frame_help_multi') },
    { key: 'raise', icon: 'arrow-up', label: t('mirror_frame_raise'), description: t('mirror_frame_help_raise') },
    { key: 'lower', icon: 'arrow-down', label: t('mirror_frame_lower'), description: t('mirror_frame_help_lower') },
    { key: 'undo', icon: 'rotate-left', label: t('mirror_153'), description: t('mirror_165') },
    { key: 'redo', icon: 'rotate-right', label: t('mirror_154'), description: t('mirror_166') },
    { key: 'copy', icon: 'copy', label: t('mirror_frame_copy'), description: t('mirror_frame_help_copy') },
    { key: 'clear', icon: 'arrows-rotate', label: t('mirror_frame_clear'), description: t('mirror_frame_help_clear') },
    { key: 'help', icon: 'circle-question', label: t('mirror_158'), description: t('mirror_172') },
  ];
  const overlay = (
    <View style={StyleSheet.absoluteFill} {...canvasResponder.panHandlers}>
      {draftLayers.slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0)).map((layer) => (
        <EditableFrameLayer key={layer.id} layer={layer} selectedIds={selectedIds} theme={theme} disabled={disabled} tool={tool} onSelect={select} onDelete={remove} />
      ))}
      {guides.x !== null ? <View pointerEvents="none" style={[styles.guideVertical, { backgroundColor: theme.secondary, left: `${guides.x}%` }]} /> : null}
      {guides.y !== null ? <View pointerEvents="none" style={[styles.guideHorizontal, { backgroundColor: theme.secondary, top: `${guides.y}%` }]} /> : null}
    </View>
  );
  return (
    <View style={styles.wrap}>
      <View style={styles.workspace}>
        <MirrorEditorToolbar actions={actions} theme={theme} disabled={disabled} />
        <View style={styles.canvasColumn}>
          <MirrorConfigPreview
            config={editorConfig}
            theme={theme}
            resourcesById={resourcesById}
            showMeta={false}
            canvasBackgroundColor={tokens.colors.gray[3]}
            testID="mirror-frame-canvas"
            onCanvasLayout={(event) => setCanvasSize(event.nativeEvent.layout)}
            canvasOverlay={overlay}
          />
        </View>
      </View>
      <MirrorEditorHelpModal visible={helpVisible} items={helpItems} theme={theme} onClose={() => setHelpVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.md, position: 'relative' },
  workspace: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  canvasColumn: { flex: 1 },
  frameLayer: { position: 'absolute' },
  resizeHandle: { position: 'absolute', right: tokens.spacing.none, bottom: tokens.spacing.none, width: tokens.spacing.md, height: tokens.spacing.md, borderTopLeftRadius: tokens.radius.sm },
  deleteButton: { position: 'absolute', top: tokens.spacing.xxs, right: tokens.spacing.xxs },
  rotationHandle: { position: 'absolute', width: tokens.spacing.md, height: tokens.spacing.md, borderRadius: tokens.radius.pill, borderWidth: tokens.border.thin, alignItems: 'center', justifyContent: 'center' },
  topHandle: { left: '50%', top: -tokens.spacing.md, transform: [{ translateX: -tokens.spacing.xs }] },
  rightHandle: { right: -tokens.spacing.md, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  bottomHandle: { left: '50%', bottom: -tokens.spacing.md, transform: [{ translateX: -tokens.spacing.xs }] },
  leftHandle: { left: -tokens.spacing.md, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  topHandleInside: { left: '50%', top: tokens.spacing.xxs, transform: [{ translateX: -tokens.spacing.xs }] },
  rightHandleInside: { right: tokens.spacing.xxs, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  bottomHandleInside: { left: '50%', bottom: tokens.spacing.xxs, transform: [{ translateX: -tokens.spacing.xs }] },
  leftHandleInside: { left: tokens.spacing.xxs, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  guideVertical: { position: 'absolute', top: tokens.spacing.none, bottom: tokens.spacing.none, width: StyleSheet.hairlineWidth },
  guideHorizontal: { position: 'absolute', left: tokens.spacing.none, right: tokens.spacing.none, height: StyleSheet.hairlineWidth },
});
