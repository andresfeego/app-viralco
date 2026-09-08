import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@react-native-vector-icons/fontawesome6';
import { SurfaceCard } from '../design-system/components/SurfaceCard';
import { tokens } from '../design-system/tokens';
import { clearTextLayers, createCustomTextLayer, duplicateTextLayer, ensureMirrorTextLayers, MIRROR_MAX_TEXT_LAYERS, moveSelectedSlotsLayer, moveSlotsWithSnap, removeTextLayer, TEXT_LAYER_DEFAULTS } from '../domain/magicMirrorConfig';
import { t } from '../i18n';
import { DesignAssetCarousel } from './DesignAssetCarousel';
import { ColorPickerModal, ColorPickerTrigger } from './ColorPickerModal';
import { IconTextButton } from './IconTextButton';
import { hitTestMirrorGesture } from './MirrorLayoutEditor';
import { MirrorConfigPreview } from './MirrorConfigPreview';
import { MirrorEditorHelpModal } from './MirrorEditorHelpModal';
import { MirrorEditorToolbar } from './MirrorEditorToolbar';
import { PaperFormInput } from './PaperFormInput';
import { SelectableChipGroup } from './SelectableChipGroup';
import { TextLayerList } from './TextLayerList';
import { ValueStepper } from './ValueStepper';

const FIXED_LAYER_IDS = ['event', 'date'];
const clone = (value) => JSON.parse(JSON.stringify(value));
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function normalizeAngle(angle) {
  let next = Number(angle) || 0;
  while (next > 180) next -= 360;
  while (next < -180) next += 360;
  return Math.round(next * 10) / 10;
}

function useLatest(value) {
  const reference = useRef(value);
  reference.current = value;
  return reference;
}

function textHitHeight(layer, canvasSize) {
  if (!canvasSize.height) return tokens.spacing.xs;
  return Math.min(100 - Number(layer.y || 0), (Math.max(tokens.spacing.lg, Number(layer.size || 0) + tokens.spacing.xs) / canvasSize.height) * 100);
}

function gestureLayers(layers, canvasSize) {
  return layers.map((layer) => ({ ...layer, height: textHitHeight(layer, canvasSize) }));
}

function mergeGeometry(layers, changed) {
  const byId = new Map(changed.map((layer) => [String(layer.id), layer]));
  return layers.map((layer) => {
    const next = byId.get(String(layer.id));
    if (!next) return layer;
    return { ...layer, x: next.x, y: next.y, width: next.width };
  });
}

function layerCenter(layer, canvasSize) {
  const height = textHitHeight(layer, canvasSize);
  return { x: (layer.x + layer.width / 2) * canvasSize.width / 100, y: (layer.y + height / 2) * canvasSize.height / 100 };
}

function RotationHandle({ corner, theme }) {
  return <View pointerEvents="none" accessibilityElementsHidden style={[styles.rotationHandle, styles[`${corner}Inside`], { backgroundColor: theme.surface, borderColor: theme.primary }]}><Icon name="rotate" iconStyle="solid" size={tokens.typography.caption} color={theme.primary} /></View>;
}

function EditableTextLayer({ layer, canvasSize, selectedIds, theme, disabled, tool, onSelect, onDelete }) {
  const selected = selectedIds.includes(String(layer.id));
  return (
    <View
      pointerEvents="box-none"
      accessibilityRole="button"
      accessibilityLabel={layer.text}
      accessibilityState={{ selected }}
      onAccessibilityTap={() => onSelect(String(layer.id))}
      style={[styles.textLayerFrame, { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${textHitHeight(layer, canvasSize)}%`, borderColor: selected ? theme.secondary : theme.border, borderWidth: selected ? tokens.border.medium : StyleSheet.hairlineWidth, transform: [{ rotate: `${Number(layer.rotation || 0)}deg` }] }]}
    >
      {!disabled ? <View style={styles.deleteButton}><IconTextButton theme={theme} icon="trash-can" denseIconOnly iconSize={tokens.typography.caption} variant="ghost" backgroundColor={theme.alert} pressedBackgroundColor={theme.background} iconColor={theme.buttonText} accessibilityLabel={t('mirror_text_remove')} onPress={() => onDelete(String(layer.id))} /></View> : null}
      {!disabled && selected && tool === 'rotate' ? ['topHandle', 'rightHandle', 'bottomHandle', 'leftHandle'].map((corner) => <RotationHandle key={corner} corner={corner} theme={theme} />) : null}
    </View>
  );
}

export function MirrorTextLayerEditor({ config, onChange, theme, disabled = false, event = null, favoriteFonts = [], resourcesById = {}, onSelectFont, onRemoveFont, onDiscardFont, onOpenResources, onUploadFont, onInteractionChange }) {
  const initialLayers = ensureMirrorTextLayers(config.layout.textLayers || []);
  const [draftLayers, setDraftLayers] = useState(initialLayers);
  const [selectedIds, setSelectedIds] = useState([String(initialLayers[0]?.id || '')].filter(Boolean));
  const [multi, setMulti] = useState(false);
  const [tool, setTool] = useState('move');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [guides, setGuides] = useState({ x: null, y: null });
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [helpVisible, setHelpVisible] = useState(false);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const draftRef = useRef(initialLayers);
  const interactionStart = useRef(null);
  draftRef.current = draftLayers;

  useEffect(() => { if (!interactionStart.current) setDraftLayers(ensureMirrorTextLayers(config.layout.textLayers || [])); }, [config.layout.textLayers]);
  useEffect(() => { setSelectedIds((current) => current.filter((id) => (config.layout.textLayers || []).some((layer) => String(layer.id) === id))); }, [config.layout.textLayers]);

  const active = draftLayers.find((layer) => String(layer.id) === selectedIds[0]) || null;
  const select = (id) => setSelectedIds((current) => !multi ? (current.includes(id) ? [] : [id]) : (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const applyLayers = useCallback((layers, record = true) => {
    const normalized = ensureMirrorTextLayers(layers);
    const currentLayers = ensureMirrorTextLayers(draftRef.current || []);
    if (same(normalized, currentLayers)) return;
    if (record) { setPast((items) => [...items, clone(currentLayers)]); setFuture([]); }
    draftRef.current = normalized; setDraftLayers(normalized);
    onChange({ ...config, layout: { ...config.layout, textLayers: normalized } });
  }, [config, onChange]);
  const setLayers = useCallback((layers) => { draftRef.current = layers; setDraftLayers(layers); }, []);
  const beginInteraction = useCallback(() => {
    if (!interactionStart.current) interactionStart.current = { config: clone(config), layers: clone(config.layout.textLayers || []) };
    onInteractionChange?.(true);
  }, [config, onInteractionChange]);
  const endInteraction = useCallback(() => {
    const gesture = interactionStart.current;
    if (gesture && !same(ensureMirrorTextLayers(gesture.layers), ensureMirrorTextLayers(draftRef.current))) {
      setPast((items) => [...items, gesture.layers]); setFuture([]);
      onChange({ ...gesture.config, layout: { ...gesture.config.layout, textLayers: ensureMirrorTextLayers(draftRef.current) } });
    }
    interactionStart.current = null; onInteractionChange?.(false);
  }, [onChange, onInteractionChange]);

  const pendingGesture = useRef(null);
  const activeGesture = useRef(null);
  const current = useLatest({ canvasSize, disabled, draftLayers, selectedIds, tool, select, setLayers, setGuides, beginInteraction, endInteraction });
  const canvasResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: (eventValue) => {
      const value = current.current;
      if (value.disabled || !value.draftLayers.length) return false;
      const point = { x: eventValue.nativeEvent.locationX, y: eventValue.nativeEvent.locationY };
      const detected = hitTestMirrorGesture(gestureLayers(value.draftLayers, value.canvasSize), value.selectedIds, value.tool, point, value.canvasSize, tokens.spacing.md, true);
      const hit = detected.mode === 'resize' ? { ...detected, mode: 'move' } : detected;
      pendingGesture.current = { hit, point };
      return hit.mode !== 'none';
    },
    onMoveShouldSetPanResponder: () => false,
    onPanResponderGrant: (eventValue) => {
      const value = current.current;
      const point = pendingGesture.current?.point || { x: eventValue.nativeEvent.locationX, y: eventValue.nativeEvent.locationY };
      const detected = pendingGesture.current?.hit || hitTestMirrorGesture(gestureLayers(value.draftLayers, value.canvasSize), value.selectedIds, value.tool, point, value.canvasSize, tokens.spacing.md, true);
      const hit = detected.mode === 'resize' ? { ...detected, mode: 'move' } : detected;
      const selectedAtStart = value.selectedIds.includes(hit.slotId);
      const ids = selectedAtStart ? value.selectedIds : [hit.slotId];
      const activeLayer = value.draftLayers.find((item) => String(item.id) === hit.slotId);
      const center = activeLayer ? layerCenter(activeLayer, value.canvasSize) : null;
      activeGesture.current = { mode: hit.mode, id: hit.slotId, layers: value.draftLayers, ids, point, moved: false, selectedAtStart, center, initialAngle: center ? Math.atan2(point.y - center.y, point.x - center.x) : 0, initialRotations: Object.fromEntries(value.draftLayers.filter((item) => ids.includes(String(item.id))).map((item) => [String(item.id), Number(item.rotation || 0)])) };
      if (hit.mode === 'move' && !selectedAtStart) value.select(hit.slotId);
      if (['move', 'rotate'].includes(hit.mode)) value.beginInteraction();
    },
    onPanResponderMove: (_event, gestureState) => {
      const value = current.current; const gesture = activeGesture.current;
      if (!gesture || !value.canvasSize.width || !value.canvasSize.height) return;
      if (Math.abs(gestureState.dx) > tokens.border.medium || Math.abs(gestureState.dy) > tokens.border.medium) gesture.moved = true;
      const boxes = gestureLayers(gesture.layers, value.canvasSize);
      if (gesture.mode === 'move') {
        const result = moveSlotsWithSnap(boxes, gesture.ids, gesture.id, (gestureState.dx / value.canvasSize.width) * 100, (gestureState.dy / value.canvasSize.height) * 100);
        value.setLayers(mergeGeometry(gesture.layers, result.slots)); value.setGuides(result.guides);
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
      if (['move', 'rotate'].includes(gesture.mode)) value.endInteraction();
      value.setGuides({ x: null, y: null }); activeGesture.current = null; pendingGesture.current = null;
    },
    onPanResponderTerminate: () => {
      const value = current.current;
      if (activeGesture.current && ['move', 'rotate'].includes(activeGesture.current.mode)) value.endInteraction();
      value.setGuides({ x: null, y: null }); activeGesture.current = null; pendingGesture.current = null;
    },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [current]);

  const editorConfig = { ...config, layout: { ...config.layout, textLayers: draftLayers } };
  const patchActive = (patch) => active && applyLayers(draftLayers.map((layer) => String(layer.id) === String(active.id) ? { ...layer, ...patch } : layer));
  const remove = (id) => {
    const layer = draftLayers.find((item) => String(item.id) === String(id));
    if (layer?.fontResourceId) onDiscardFont?.(layer.fontResourceId);
    applyLayers(removeTextLayer(editorConfig, id).layout.textLayers); setSelectedIds((ids) => ids.filter((item) => item !== String(id)));
  };
  const clear = () => {
    draftLayers.forEach((layer) => { if (layer.fontResourceId) onDiscardFont?.(layer.fontResourceId); });
    applyLayers(clearTextLayers(editorConfig).layout.textLayers); setSelectedIds([]);
  };
  const undo = () => { if (past.length) { const previous = past[past.length - 1]; setPast((items) => items.slice(0, -1)); setFuture((items) => [clone(draftRef.current || []), ...items]); applyLayers(previous, false); } };
  const redo = () => { if (future.length) { const next = future[0]; setFuture((items) => items.slice(1)); setPast((items) => [...items, clone(draftRef.current || [])]); applyLayers(next, false); } };
  const addFixed = (id) => {
    const existing = draftLayers.find((layer) => layer.id === id);
    if (existing) { setSelectedIds([id]); return; }
    if (draftLayers.length >= MIRROR_MAX_TEXT_LAYERS) return;
    const defaults = TEXT_LAYER_DEFAULTS.find((layer) => layer.id === id);
    const text = id === 'event' ? event?.name || '' : event?.eventDate || event?.startDate || '';
    applyLayers([...draftLayers, { ...defaults, text, rotation: 0, order: draftLayers.length }]); setSelectedIds([id]);
  };
  const changeText = (text) => {
    if (active) { patchActive({ text }); return; }
    if (!text || draftLayers.length >= MIRROR_MAX_TEXT_LAYERS) return;
    const id = `custom-${Date.now()}-${draftLayers.length}`;
    applyLayers([...draftLayers, { ...createCustomTextLayer(id), text, order: draftLayers.length }]); setSelectedIds([id]);
  };
  const duplicate = () => {
    const next = duplicateTextLayer(editorConfig, active?.id); applyLayers(next.layout.textLayers);
    if (next.layout.textLayers.length > draftLayers.length) setSelectedIds([String(next.layout.textLayers[next.layout.textLayers.length - 1].id)]);
  };
  const moveLayer = (direction) => applyLayers(moveSelectedSlotsLayer(draftLayers, selectedIds, direction));
  const actions = [
    { key: 'move', icon: 'hand', label: t('mirror_text_move'), onPress: () => setTool('move'), selected: tool === 'move' },
    { key: 'rotate', icon: 'rotate', label: t('mirror_151'), onPress: () => setTool('rotate'), selected: tool === 'rotate' },
    { key: 'multi', icon: 'object-group', label: t('mirror_040'), onPress: () => setMulti((value) => !value), selected: multi },
    { key: 'raise', icon: 'arrow-up', label: t('mirror_text_raise'), onPress: () => moveLayer(1), disabled: same(moveSelectedSlotsLayer(draftLayers, selectedIds, 1), draftLayers) },
    { key: 'lower', icon: 'arrow-down', label: t('mirror_text_lower'), onPress: () => moveLayer(-1), disabled: same(moveSelectedSlotsLayer(draftLayers, selectedIds, -1), draftLayers) },
    { key: 'undo', icon: 'rotate-left', label: t('mirror_153'), onPress: undo, disabled: !past.length },
    { key: 'redo', icon: 'rotate-right', label: t('mirror_154'), onPress: redo, disabled: !future.length },
    { key: 'copy', icon: 'copy', label: t('mirror_text_copy'), onPress: duplicate, disabled: !active || draftLayers.length >= MIRROR_MAX_TEXT_LAYERS },
    { key: 'clear', icon: 'arrows-rotate', label: t('mirror_text_clear'), onPress: clear, disabled: !draftLayers.length },
    { key: 'help', icon: 'circle-question', label: t('mirror_158'), onPress: () => setHelpVisible(true), allowReadOnly: true },
  ];
  const helpItems = [
    { key: 'move', icon: 'hand', label: t('mirror_text_move'), description: t('mirror_text_help_move') },
    { key: 'rotate', icon: 'rotate', label: t('mirror_151'), description: t('mirror_text_help_rotate') },
    { key: 'multi', icon: 'object-group', label: t('mirror_040'), description: t('mirror_text_help_multi') },
    { key: 'raise', icon: 'arrow-up', label: t('mirror_text_raise'), description: t('mirror_text_help_raise') },
    { key: 'lower', icon: 'arrow-down', label: t('mirror_text_lower'), description: t('mirror_text_help_lower') },
    { key: 'undo', icon: 'rotate-left', label: t('mirror_153'), description: t('mirror_165') },
    { key: 'redo', icon: 'rotate-right', label: t('mirror_154'), description: t('mirror_166') },
    { key: 'copy', icon: 'copy', label: t('mirror_text_copy'), description: t('mirror_text_help_copy') },
    { key: 'clear', icon: 'arrows-rotate', label: t('mirror_text_clear'), description: t('mirror_text_help_clear') },
    { key: 'help', icon: 'circle-question', label: t('mirror_158'), description: t('mirror_172') },
  ];
  const selectedFont = active?.fontResourceId ? resourcesById[String(active.fontResourceId)] : null;
  const selectedFonts = selectedFont ? [{ id: selectedFont.id, libraryAssetId: selectedFont.libraryAssetId, eventResourceId: selectedFont.id, asset: selectedFont.asset }] : [];
  const colors = [tokens.colors.gray[9], tokens.colors.gray[0], tokens.colors.gray[5], tokens.colors.error[600], tokens.colors.warn[500], tokens.colors.success[600], tokens.colors.blue[600], tokens.colors.blue[800]];
  const overlay = <View style={StyleSheet.absoluteFill} {...canvasResponder.panHandlers}>{draftLayers.map((layer) => <EditableTextLayer key={layer.id} layer={layer} canvasSize={canvasSize} selectedIds={selectedIds} theme={theme} disabled={disabled} tool={tool} onSelect={select} onDelete={remove} />)}{guides.x !== null ? <View pointerEvents="none" style={[styles.guideVertical, { backgroundColor: theme.secondary, left: `${guides.x}%` }]} /> : null}{guides.y !== null ? <View pointerEvents="none" style={[styles.guideHorizontal, { backgroundColor: theme.secondary, top: `${guides.y}%` }]} /> : null}</View>;

  return (
    <View style={styles.stack}>
      <View style={styles.workspace}><MirrorEditorToolbar actions={actions} theme={theme} disabled={disabled} /><View style={styles.canvasColumn}><MirrorConfigPreview config={editorConfig} theme={theme} resourcesById={resourcesById} showMeta={false} canvasBackgroundColor={tokens.colors.gray[3]} testID="mirror-text-canvas" onCanvasLayout={(eventValue) => setCanvasSize(eventValue.nativeEvent.layout)} canvasOverlay={overlay} /></View></View>
      <TextLayerList label={t('mirror_text_added')} emptyLabel={t('mirror_text_empty')} layers={draftLayers} selectedIds={selectedIds} theme={theme} disabled={disabled} onSelect={select} onRemove={remove} />
      <SurfaceCard surfaceColor={theme.surface} borderColor={theme.border}>
        <PaperFormInput testID="mirror-text-input" theme={theme} label={t('mirror_text_input')} value={active?.text || ''} onChangeText={changeText} editable={!disabled} />
        <DesignAssetCarousel label={t('mirror_133')} items={favoriteFonts} selectedItems={selectedFonts} theme={theme} disabled={disabled || !active} emptyLabel={t('mirror_134')} emptyActionLabel={t('mirror_148')} onEmptyAction={onOpenResources} secondaryEmptyActionLabel={t('resource_060')} onSecondaryEmptyAction={onUploadFont} onSelect={(item) => active && onSelectFont?.(item, active.id)} onRemove={() => active && onRemoveFont?.(active.id, active.fontResourceId)} />
        <View style={styles.controlStack}><Text style={[styles.controlLabel, { color: theme.textSecondary }]}>{t('mirror_text_color')}</Text><View style={styles.palette}>{colors.map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityState={{ checked: active?.color === color, disabled: disabled || !active }} accessibilityLabel={`${t('mirror_text_color')} ${color}`} disabled={disabled || !active} onPress={() => patchActive({ color })} style={[styles.swatch, { backgroundColor: color, borderColor: active?.color === color ? theme.primary : theme.border }]} />)}<ColorPickerTrigger theme={theme} disabled={disabled || !active} onPress={() => setColorPickerVisible(true)} /></View></View>
        <ValueStepper testID="mirror-text-size" label={t('mirror_054')} value={active?.size || TEXT_LAYER_DEFAULTS[0].size} onChange={(size) => patchActive({ size })} min={8} max={54} step={2} theme={theme} disabled={disabled || !active} />
        <SelectableChipGroup testID="mirror-text-shortcuts" theme={theme} options={FIXED_LAYER_IDS.map((id) => ({ value: id, label: t(`mirror_text_${id}`) }))} value={FIXED_LAYER_IDS.includes(active?.id) ? active.id : ''} disabled={disabled} onChange={addFixed} />
      </SurfaceCard>
      <MirrorEditorHelpModal visible={helpVisible} items={helpItems} theme={theme} onClose={() => setHelpVisible(false)} />
      <ColorPickerModal visible={colorPickerVisible} initialColor={active?.color || tokens.colors.gray[9]} theme={theme} onClose={() => setColorPickerVisible(false)} onSelect={(color) => patchActive({ color })} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { width: '100%', minWidth: tokens.spacing.none, gap: tokens.spacing.md, position: 'relative' },
  workspace: { width: '100%', minWidth: tokens.spacing.none, flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.xs },
  canvasColumn: { flex: 1, minWidth: tokens.spacing.none },
  textLayerFrame: { position: 'absolute' },
  deleteButton: { position: 'absolute', top: tokens.spacing.xxs, right: tokens.spacing.xxs },
  rotationHandle: { position: 'absolute', width: tokens.spacing.md, height: tokens.spacing.md, borderRadius: tokens.radius.pill, borderWidth: tokens.border.thin, alignItems: 'center', justifyContent: 'center' },
  topHandleInside: { left: '50%', top: tokens.spacing.xxs, transform: [{ translateX: -tokens.spacing.xs }] },
  rightHandleInside: { right: tokens.spacing.xxs, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  bottomHandleInside: { left: '50%', bottom: tokens.spacing.xxs, transform: [{ translateX: -tokens.spacing.xs }] },
  leftHandleInside: { left: tokens.spacing.xxs, top: '50%', transform: [{ translateY: -tokens.spacing.xs }] },
  guideVertical: { position: 'absolute', top: tokens.spacing.none, bottom: tokens.spacing.none, width: StyleSheet.hairlineWidth },
  guideHorizontal: { position: 'absolute', left: tokens.spacing.none, right: tokens.spacing.none, height: StyleSheet.hairlineWidth },
  controlStack: { gap: tokens.spacing.xs },
  controlLabel: { fontSize: tokens.typography.caption, fontWeight: '700' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  swatch: { width: tokens.spacing.xl, height: tokens.spacing.xl, borderRadius: tokens.radius.pill, borderWidth: tokens.border.medium },
});
