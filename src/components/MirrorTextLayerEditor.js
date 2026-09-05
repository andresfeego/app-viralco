import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { clamp, createCustomTextLayer, TEXT_LAYER_DEFAULTS } from '../domain/magicMirrorConfig';
import { t } from '../i18n';
import { AppButton } from '../design-system/components/AppButton';
import { DesignAssetCarousel } from './DesignAssetCarousel';
import { MirrorCanvasSurface } from './MirrorCanvasSurface';
import { PaperFormInput } from './PaperFormInput';
import { SelectableChipGroup } from './SelectableChipGroup';
import { ValueStepper } from './ValueStepper';

const FIXED_LAYER_IDS = ['event', 'date'];

function DraggableText({ layer, canvasSize, disabled, onChange, onInteractionChange }) {
  const start = useRef(layer);
  start.current = layer;
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !disabled,
    onMoveShouldSetPanResponder: () => !disabled,
    onPanResponderGrant: () => { start.current = layer; onInteractionChange?.(true); },
    onPanResponderMove: (_event, gesture) => {
      if (!canvasSize.width || !canvasSize.height) return;
      onChange({
        x: clamp(start.current.x + (gesture.dx / canvasSize.width) * 100, 0, 100 - start.current.width),
        y: clamp(start.current.y + (gesture.dy / canvasSize.height) * 100, 0, 96),
      });
    },
    onPanResponderRelease: () => onInteractionChange?.(false),
    onPanResponderTerminate: () => onInteractionChange?.(false),
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [canvasSize.height, canvasSize.width, disabled, layer, onChange, onInteractionChange]);
  return <Text {...responder.panHandlers} touchAction="none" numberOfLines={2} style={[styles.layer, { color: layer.color, left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, fontSize: layer.size }]}>{layer.text || t(`mirror_text_${layer.id}`)}</Text>;
}

export function MirrorTextLayerEditor({ config, onChange, theme, disabled = false, event = null, favoriteFonts = [], resourcesById = {}, onSelectFont, onRemoveFont, onOpenResources, onInteractionChange }) {
  const [selectedId, setSelectedId] = useState(config.layout.textLayers[0]?.id || 'name');
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const layers = config.layout.textLayers || [];
  const selected = layers.find((layer) => layer.id === selectedId) || null;
  const setLayers = (textLayers) => onChange({ ...config, layout: { ...config.layout, textLayers } });
  const patchLayer = (id, patch) => setLayers(layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer));
  const toggleLayer = (id) => {
    const existing = layers.find((layer) => layer.id === id);
    if (existing) {
      setLayers(layers.filter((layer) => layer.id !== id));
      setSelectedId(layers.find((layer) => layer.id !== id)?.id || id);
      return;
    }
    const defaults = TEXT_LAYER_DEFAULTS.find((layer) => layer.id === id);
    const text = id === 'event' ? event?.name || '' : id === 'date' ? event?.eventDate || event?.startDate || '' : '';
    setLayers([...layers, { ...defaults, text }]);
    setSelectedId(id);
  };
  const fixedLayerOptions = FIXED_LAYER_IDS.map((id) => ({ value: id, label: t(`mirror_text_${id}`) }));
  const layerOptions = layers.map((layer) => ({ value: layer.id, label: layer.id.startsWith('custom-') ? t('mirror_text_custom') : t(`mirror_text_${layer.id}`) }));
  const activeIds = layers.map((layer) => layer.id);
  const selectedFontResource = selected?.fontResourceId ? resourcesById[String(selected.fontResourceId)] : null;
  const selectedFontItems = selectedFontResource ? [{ id: selectedFontResource.id, libraryAssetId: selectedFontResource.libraryAssetId, eventResourceId: selectedFontResource.id, asset: selectedFontResource.asset }] : [];
  const colors = [tokens.colors.gray[9], tokens.colors.gray[0], tokens.colors.gray[5], tokens.colors.error[600], tokens.colors.warn[500], tokens.colors.success[600], tokens.colors.blue[600], tokens.colors.blue[800]];
  return (
    <View style={styles.wrap}>
      <SelectableChipGroup theme={theme} label={t('mirror_050')} options={fixedLayerOptions} values={activeIds.filter((id) => FIXED_LAYER_IDS.includes(id))} multiple disabled={disabled} onChange={(values) => {
        const changed = fixedLayerOptions.find((option) => values.includes(option.value) !== activeIds.includes(option.value));
        if (changed) toggleLayer(changed.value);
      }} />
      <AppButton
        label={t('mirror_132')}
        disabled={disabled || layers.filter((layer) => layer.id.startsWith('custom-')).length >= 10}
        onPress={() => {
          const id = `custom-${Date.now()}-${layers.length}`;
          setLayers([...layers, createCustomTextLayer(id)]);
          setSelectedId(id);
        }}
        backgroundColor={theme.surface}
        pressedColor={theme.background}
        textColor={theme.textPrimary}
      />
      <MirrorCanvasSurface theme={theme} onLayout={(eventValue) => setCanvasSize(eventValue.nativeEvent.layout)} testID="mirror-text-canvas">
        {config.layout.slots.map((slot, index) => <View key={slot.slotId || `${slot.photoNumber}-${index}`} style={[styles.slot, { borderColor: theme.border, left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }]} />)}
        {layers.map((layer) => <Pressable key={layer.id} onPress={() => setSelectedId(layer.id)} style={StyleSheet.absoluteFill} pointerEvents="box-none"><DraggableText layer={layer} canvasSize={canvasSize} disabled={disabled} onInteractionChange={onInteractionChange} onChange={(patch) => patchLayer(layer.id, patch)} /></Pressable>)}
      </MirrorCanvasSurface>
      {selected ? (
        <View style={styles.editor}>
          <SelectableChipGroup theme={theme} label={t('mirror_051')} options={layerOptions.filter((option) => activeIds.includes(option.value))} value={selected.id} disabled={disabled} onChange={(value) => setSelectedId(value || selected.id)} />
          {selected.id.startsWith('custom-') ? <PaperFormInput theme={theme} label={t('mirror_052')} value={selected.text} onChangeText={(text) => patchLayer(selected.id, { text })} editable={!disabled} /> : null}
          {selected.id.startsWith('custom-') ? <AppButton label={t('mirror_048')} onPress={() => toggleLayer(selected.id)} disabled={disabled} backgroundColor={theme.surface} pressedColor={theme.background} textColor={theme.textPrimary} /> : null}
          <DesignAssetCarousel
            label={t('mirror_133')}
            items={favoriteFonts}
            selectedItems={selectedFontItems}
            theme={theme}
            disabled={disabled}
            emptyLabel={t('mirror_134')}
            emptyActionLabel={t('mirror_148')}
            onEmptyAction={onOpenResources}
            onSelect={(item) => onSelectFont?.(item, selected.id)}
            onRemove={() => onRemoveFont?.(selected.id, selected.fontResourceId)}
          />
          <View style={styles.palette}>
            {colors.map((color) => <Pressable key={color} accessibilityRole="radio" accessibilityState={{ checked: selected.color === color }} disabled={disabled} onPress={() => patchLayer(selected.id, { color })} style={[styles.swatch, { backgroundColor: color, borderColor: selected.color === color ? theme.primary : theme.border }]} />)}
          </View>
          <View style={styles.controls}>
            <ValueStepper label="X" value={selected.x} onChange={(x) => patchLayer(selected.id, { x })} max={100 - selected.width} theme={theme} disabled={disabled} />
            <ValueStepper label="Y" value={selected.y} onChange={(y) => patchLayer(selected.id, { y })} max={96} theme={theme} disabled={disabled} />
            <ValueStepper label={t('mirror_042')} value={selected.width} onChange={(width) => patchLayer(selected.id, { width })} min={1} max={100 - selected.x} theme={theme} disabled={disabled} />
            <ValueStepper label={t('mirror_054')} value={selected.size} onChange={(size) => patchLayer(selected.id, { size })} min={8} max={54} step={2} theme={theme} disabled={disabled} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.spacing.md },
  slot: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.sm },
  layer: { position: 'absolute', textAlign: 'center', fontWeight: '700' },
  editor: { gap: tokens.spacing.sm },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
  swatch: { width: tokens.spacing.xl, height: tokens.spacing.xl, borderRadius: tokens.radius.pill, borderWidth: tokens.spacing.xxs / 2 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm },
});
