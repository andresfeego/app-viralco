import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { MirrorConfigPreview } from './MirrorConfigPreview';

export const MirrorOutputComposer = forwardRef(function MirrorOutputComposer({ config, captures, localManifest, theme }, ref) {
  const outputRef = useRef(null);
  const resourcesById = useMemo(() => Object.fromEntries((localManifest || []).map((resource) => [
    String(resource.eventResourceId),
    { asset: { id: resource.assetId, fileUrl: resource.uri, fileSignedUrl: resource.uri, mimeType: resource.mimeType, metadata: { sha256: resource.sha256 } } },
  ])), [localManifest]);
  const capturesByNumber = useMemo(() => {
    const selected = {};
    (captures || []).forEach((capture) => {
      if (capture.selected !== false) selected[Number(capture.photoNumber)] = capture;
    });
    return selected;
  }, [captures]);

  useImperativeHandle(ref, () => ({
    compose: () => captureRef(outputRef, {
      format: 'jpg',
      quality: 0.95,
      result: 'tmpfile',
      width: Number(config?.layout?.output?.width || 1200),
      height: Number(config?.layout?.output?.height || 1500),
    }),
  }), [config]);

  return (
    <View ref={outputRef} collapsable={false} style={styles.output}>
      <MirrorConfigPreview
        config={config}
        theme={theme}
        resourcesById={resourcesById}
        showMeta={false}
        renderSlot={(slot) => {
          const capture = capturesByNumber[Number(slot.photoNumber)];
          return capture ? (
            <Image
              key={slot.slotId}
              source={{ uri: capture.uri }}
              resizeMode="cover"
              // Geometry is data from MirrorConfigV1, not visual hardcoding.
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                position: 'absolute',
                left: `${slot.x}%`,
                top: `${slot.y}%`,
                width: `${slot.width}%`,
                height: `${slot.height}%`,
                transform: [{ rotate: `${Number(slot.rotation || 0)}deg` }],
              }}
            />
          ) : null;
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({ output: { width: '100%' } });
