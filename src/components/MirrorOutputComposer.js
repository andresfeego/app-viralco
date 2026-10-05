import React, { forwardRef, useCallback, useLayoutEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { snapshotMirrorCanvas } from '../services/mirrorCanvasSnapshot';
import { CanvasContent } from './MirrorConfigPreview';
import { MIRROR_CANVAS_REFERENCE_WIDTH } from './MirrorCanvasSurface';
import { tokens } from '../design-system/tokens';
import { runtimeQuality } from '../domain/mirrorRuntime';
import { loadRuntimeFont } from '../services/runtimeFonts';
import { MirrorCanvasImage } from './MirrorCanvasImage';
import { previewImageInSlot } from '../domain/mirrorCaptureFraming';

export const MirrorOutputComposer = forwardRef(function MirrorOutputComposer({ config, captures, localManifest, theme }, ref) {
  const outputRef = useRef(null);
  const imageStates = useRef(new Map());
  const measuredWidth = useRef(0);
  const mounted = useRef(false);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onImageState = useCallback((id, state) => {
    if (!state) imageStates.current.delete(id);
    else if (state.status === 'pending' || imageStates.current.get(id)?.uri === state.uri) imageStates.current.set(id, state);
  }, []);
  const [width, setWidth] = useState(0);
  const resourcesById = useMemo(() => Object.fromEntries((localManifest || []).map((resource) => [String(resource.eventResourceId), {
    asset: { id: resource.assetId, fileUrl: resource.uri, mimeType: resource.mimeType, metadata: { sha256: resource.sha256 } },
  }])), [localManifest]);
  const selected = useMemo(() => Object.fromEntries((captures || []).filter((photo) => photo.selected !== false).map((photo) => [Number(photo.photoNumber), photo])), [captures]);
  useImperativeHandle(ref, () => ({ compose: async () => {
    const fonts = (config.layout.textLayers || []).filter((layer) => layer.font === 'resource');
    const families = await Promise.all(fonts.map((layer) => loadRuntimeFont(resourcesById[String(layer.fontResourceId)])));
    if (families.some((family) => !family)) throw new Error('MIRROR_OUTPUT_FONT_NOT_READY');
    const deadline = Date.now() + 10000;
    const unfinished = () => [...imageStates.current.values()].filter((image) => image.status !== 'ready');
    while (mounted.current && !unfinished().some((image) => image.status === 'failed') && (!measuredWidth.current || unfinished().some((image) => image.status === 'pending')) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
    if (!mounted.current) throw new Error('MIRROR_OUTPUT_CANCELLED');
    if (unfinished().length || !measuredWidth.current) {
      const error = new Error('MIRROR_OUTPUT_IMAGE_NOT_READY');
      error.details = { width: measuredWidth.current, images: unfinished() };
      throw error;
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!mounted.current) throw new Error('MIRROR_OUTPUT_CANCELLED');
    return snapshotMirrorCanvas(outputRef, { quality: runtimeQuality(config.capture.quality), width: config.layout.output.width, height: config.layout.output.height });
  } }), [config, resourcesById]);
  const copies = config.layout.duplicateStrip ? 2 : 1;
  return (
    <View ref={outputRef} collapsable={false} onLayout={(event) => { measuredWidth.current = event.nativeEvent.layout.width; setWidth(measuredWidth.current); }} style={[styles.output, { aspectRatio: config.layout.output.width / config.layout.output.height }]}>
      {Array.from({ length: copies }, (_, copy) => <View key={copy} style={styles.strip}>
        <CanvasContent config={config} theme={theme} resourcesById={resourcesById} onImageState={onImageState} textScale={width / MIRROR_CANVAS_REFERENCE_WIDTH / copies} renderSlot={(slot) => {
          const photo = selected[slot.photoNumber];
          if (!photo) return null;
          const slotStyle = { left: slot.x + '%', top: slot.y + '%', width: slot.width + '%', height: slot.height + '%', transform: [{ rotate: Number(slot.rotation || 0) + 'deg' }] };
          const slotRatio = (config.layout.output.width / copies * slot.width) / (config.layout.output.height * slot.height);
          const framing = previewImageInSlot(photo.previewAspectRatio, slotRatio);
          return framing ? <View key={slot.slotId} style={[styles.photo, styles.crop, slotStyle]}>
            <MirrorCanvasImage onImageState={onImageState} source={{ uri: photo.uri }} resizeMode="cover" style={[styles.photo, framing]} />
          </View> : <MirrorCanvasImage onImageState={onImageState} key={slot.slotId} source={{ uri: photo.uri }} resizeMode="cover" style={[styles.photo, slotStyle]} />;
        }} />
      </View>)}
    </View>
  );
});
const styles = StyleSheet.create({
  output: { width: '100%', flexDirection: 'row', overflow: 'hidden', backgroundColor: tokens.colors.gray[0] },
  strip: { flex: 1, overflow: 'hidden' },
  photo: { position: 'absolute' },
  crop: { overflow: 'hidden' },
});
