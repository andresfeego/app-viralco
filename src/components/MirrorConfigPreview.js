import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';

export function mirrorResourceUrl(resource) {
  const asset = resource?.asset || {};
  return asset?.variants?.full?.signedUrl || asset?.variants?.full?.fileUrl || asset?.variants?.card?.signedUrl || asset?.variants?.card?.fileUrl || asset?.fileSignedUrl || asset?.fileUrl || '';
}

function CanvasContent({ config, theme, resourcesById, compact = false }) {
  const background = resourcesById[String(config.resources.backgroundResourceId || '')];
  const template = resourcesById[String(config.resources.templateResourceId || '')];
  const frame = resourcesById[String(config.resources.frameResourceId || '')];
  const backgroundUrl = mirrorResourceUrl(background);
  const templateUrl = mirrorResourceUrl(template);
  const frameUrl = mirrorResourceUrl(frame);
  return (
    <View style={styles.canvasContent}>
      {backgroundUrl ? <Image source={{ uri: backgroundUrl }} resizeMode="cover" style={StyleSheet.absoluteFillObject} /> : null}
      {templateUrl ? <Image source={{ uri: templateUrl }} resizeMode="stretch" style={StyleSheet.absoluteFillObject} /> : null}
      {(config.layout.slots || []).map((slot) => (
        <View key={slot.photoNumber} style={[styles.slot, { borderColor: theme.primary, backgroundColor: tokens.colors.blue[100], left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.width}%`, height: `${slot.height}%` }]}>
          <Text style={[styles.slotNumber, compact ? styles.slotNumberCompact : null, { color: tokens.colors.blue[800] }]}>{slot.photoNumber}</Text>
        </View>
      ))}
      {(config.layout.textLayers || []).filter((layer) => layer.text).map((layer) => (
        <Text key={layer.id} numberOfLines={2} style={[styles.textLayer, { color: layer.color, left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.width}%`, fontSize: compact ? tokens.typography.caption : layer.size }]}>{layer.text}</Text>
      ))}
      {frameUrl ? <Image source={{ uri: frameUrl }} resizeMode="stretch" style={StyleSheet.absoluteFillObject} /> : null}
    </View>
  );
}

export function MirrorConfigPreview({ config, theme, resourcesById = {}, compact = false }) {
  const ratio = Number(config.layout.output?.width || 1) / Number(config.layout.output?.height || 1);
  const duplicate = Boolean(config.layout.duplicateStrip);
  return (
    <View style={styles.wrap}>
      <View style={[styles.canvas, duplicate ? styles.canvasDuplicate : null, { aspectRatio: ratio, borderColor: theme.border, backgroundColor: theme.background }]}>
        {duplicate ? (
          <>
            <View style={styles.strip}><CanvasContent config={config} theme={theme} resourcesById={resourcesById} compact /></View>
            <View style={styles.strip}><CanvasContent config={config} theme={theme} resourcesById={resourcesById} compact /></View>
          </>
        ) : <CanvasContent config={config} theme={theme} resourcesById={resourcesById} compact={compact} />}
      </View>
      <Text style={[styles.meta, { color: theme.textSecondary }]}>{config.layout.output.width} × {config.layout.output.height} · {config.layout.shotCount} {t('mirror_027')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: tokens.spacing.xs },
  canvas: { width: '100%', maxHeight: tokens.spacing.xl * 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.md, overflow: 'hidden', position: 'relative' },
  canvasDuplicate: { flexDirection: 'row', padding: tokens.spacing.xs, gap: tokens.spacing.xs },
  strip: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: tokens.radius.sm },
  canvasContent: { flex: 1, position: 'relative', overflow: 'hidden' },
  slot: { position: 'absolute', borderWidth: StyleSheet.hairlineWidth, borderRadius: tokens.radius.sm, alignItems: 'center', justifyContent: 'center' },
  slotNumber: { fontSize: tokens.typography.body, fontWeight: '700' },
  slotNumberCompact: { fontSize: tokens.typography.caption },
  textLayer: { position: 'absolute', textAlign: 'center', fontWeight: '700' },
  meta: { fontSize: tokens.typography.caption, fontWeight: '700' },
});
