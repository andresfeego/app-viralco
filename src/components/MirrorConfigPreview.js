import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { MirrorCanvasSurface } from './MirrorCanvasSurface';

export function mirrorResourceUrl(resource) {
  const asset = resource?.asset || {};
  return asset?.variants?.full?.signedUrl
    || asset?.variants?.full?.fileUrl
    || asset?.variants?.card?.signedUrl
    || asset?.variants?.card?.fileUrl
    || asset?.variants?.thumb?.signedUrl
    || asset?.variants?.thumb?.fileUrl
    || asset?.fileSignedUrl
    || asset?.fileUrl
    || asset?.previewUrl
    || '';
}

function CanvasContent({ config, theme, resourcesById, compact = false, renderSlot, renderFrameLayer, onLayout, canvasHandlers }) {
  const background = resourcesById[String(config.resources.backgroundResourceId || '')];
  const template = resourcesById[String(config.resources.templateResourceId || '')];
  const frame = resourcesById[String(config.resources.frameResourceId || '')];
  const backgroundUrl = mirrorResourceUrl(background);
  const templateUrl = mirrorResourceUrl(template);
  const frameUrl = mirrorResourceUrl(frame);
  const frameLayers = Array.isArray(config.layout.frameLayers) ? config.layout.frameLayers : [];
  const backgroundLayers = Array.isArray(config.layout.backgroundLayers) ? config.layout.backgroundLayers : [];
  return (
    <View style={styles.canvasContent} onLayout={onLayout} {...canvasHandlers}>
      {backgroundLayers.length ? backgroundLayers.slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0)).map((layer) => {
        const style = [styles.backgroundLayer, { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: [{ rotate: `${Number(layer.rotation || 0)}deg` }] }];
        if (layer.kind === 'color') return <View pointerEvents="none" key={layer.id} style={[style, { backgroundColor: layer.color }]} />;
        const url = mirrorResourceUrl(resourcesById[String(layer.resourceId || '')]);
        return url ? <Image pointerEvents="none" key={layer.id} source={{ uri: url }} resizeMode="cover" style={style} /> : null;
      }) : backgroundUrl ? <Image pointerEvents="none" source={{ uri: backgroundUrl }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : null}
      {templateUrl ? <Image pointerEvents="none" source={{ uri: templateUrl }} resizeMode="stretch" style={StyleSheet.absoluteFillObject} /> : null}
      {(config.layout.slots || []).map((slot, index) => renderSlot ? renderSlot(slot) : (
        <View key={slot.slotId || `${slot.photoNumber}-${index}`} style={[styles.slot, { borderColor: theme.primary, backgroundColor: tokens.colors.blue[100], left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%`, transform: [{ rotate: `${Number(slot.rotation || 0)}deg` }] }]}>
          <Text style={[styles.slotNumber, compact ? styles.slotNumberCompact : null, { color: tokens.colors.blue[800] }]}>{slot.photoNumber}</Text>
        </View>
      ))}
      {frameLayers.length ? frameLayers.slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0)).map((layer) => {
        if (renderFrameLayer) return renderFrameLayer(layer);
        const url = mirrorResourceUrl(resourcesById[String(layer.resourceId || '')]);
        return url ? <Image pointerEvents="none" key={layer.id} source={{ uri: url }} resizeMode="stretch" style={[styles.frameLayer, { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: [{ rotate: `${Number(layer.rotation || 0)}deg` }] }]} /> : null;
      }) : frameUrl ? <Image pointerEvents="none" source={{ uri: frameUrl }} resizeMode="stretch" style={StyleSheet.absoluteFillObject} /> : null}
      {(config.layout.stickerLayers || []).slice().sort((left, right) => Number(left.order || 0) - Number(right.order || 0)).map((layer) => {
        const stickerUrl = mirrorResourceUrl(resourcesById[String(layer.resourceId || '')]);
        return stickerUrl ? <Image pointerEvents="none" key={layer.id} source={{ uri: stickerUrl }} resizeMode="contain" style={[styles.stickerLayer, { left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, height: `${layer.height}%`, transform: [{ rotate: `${Number(layer.rotation || 0)}deg` }] }]} /> : null;
      })}
      {(config.layout.textLayers || []).filter((layer) => layer.text).map((layer) => (
        <Text pointerEvents="none" key={layer.id} numberOfLines={2} style={[styles.textLayer, { color: layer.color, left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, fontSize: compact ? tokens.typography.caption : layer.size }]}>{layer.text}</Text>
      ))}
    </View>
  );
}

export function MirrorConfigPreview({ config, theme, resourcesById = {}, compact = false, showMeta = true, renderSlot, renderFrameLayer, canvasOverlay, outsideOverlay, onCanvasLayout, canvasHandlers, canvasBackgroundColor, testID }) {
  const duplicate = Boolean(config.layout.duplicateStrip);
  return (
    <View style={styles.wrap}>
      <MirrorCanvasSurface theme={theme} style={duplicate ? styles.canvasDuplicate : null} backgroundColor={canvasBackgroundColor} testID={testID}>
        {duplicate ? (
          <>
            <View style={styles.strip}><CanvasContent config={config} theme={theme} resourcesById={resourcesById} compact renderSlot={renderSlot} renderFrameLayer={renderFrameLayer} onLayout={onCanvasLayout} canvasHandlers={canvasHandlers} /></View>
            <View style={styles.strip}><CanvasContent config={config} theme={theme} resourcesById={resourcesById} compact /></View>
          </>
        ) : <CanvasContent config={config} theme={theme} resourcesById={resourcesById} compact={compact} renderSlot={renderSlot} renderFrameLayer={renderFrameLayer} onLayout={onCanvasLayout} canvasHandlers={canvasHandlers} />}
        {canvasOverlay}
      </MirrorCanvasSurface>
      {outsideOverlay}
      {showMeta ? <Text style={[styles.meta, { color: theme.textSecondary }]}>{config.layout.output.width} × {config.layout.output.height} · {config.layout.shotCount} {t('mirror_027')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: tokens.spacing.xs, position: 'relative' },
  canvasDuplicate: { flexDirection: 'row', padding: tokens.spacing.xs, gap: tokens.spacing.xs },
  strip: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: tokens.radius.sm },
  canvasContent: { flex: 1, position: 'relative', overflow: 'hidden' },
  slot: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  slotNumber: { fontSize: tokens.typography.body, fontWeight: '700' },
  slotNumberCompact: { fontSize: tokens.typography.caption },
  textLayer: { position: 'absolute', textAlign: 'center', fontWeight: '700' },
  backgroundLayer: { position: 'absolute' },
  stickerLayer: { position: 'absolute' },
  frameLayer: { position: 'absolute' },
  meta: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
