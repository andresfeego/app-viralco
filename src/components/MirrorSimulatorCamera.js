import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { simulatorTestSignal } from '../assets/simulatorTestSignal';

export const MirrorSimulatorCamera = forwardRef(function MirrorSimulatorCamera({ onAvailabilityChange }, ref) {
  const card = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => { onAvailabilityChange?.({ permission: true, ready: size.width > 0 && size.height > 0, simulated: true }); }, [onAvailabilityChange, size]);
  useImperativeHandle(ref, () => ({
    takePhoto: async () => {
      if (!size.width || !size.height) throw new Error('MIRROR_SIMULATOR_NOT_READY');
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const width = Math.round(size.width * 3); const height = Math.round(size.height * 3);
      const path = await captureRef(card, { format: 'jpg', quality: 1, result: 'tmpfile', width, height, useRenderInContext: true, kapturaExactPixels: true });
      return { path, width, height, simulated: true };
    },
  }), [size]);
  return <View ref={card} collapsable={false} style={StyleSheet.absoluteFill} onLayout={(event) => setSize(event.nativeEvent.layout)}>
    <SvgXml xml={simulatorTestSignal} width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
  </View>;
});
