import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { tokens } from '../design-system/tokens';
import { captureWindow } from '../domain/mirrorCaptureFraming';

export function MirrorCaptureMask({ width, height, ratio, theme }) {
  const crop = captureWindow(width, height, ratio);
  if (!crop) return null;
  const regions = [
    { left: 0, top: 0, width, height: crop.y },
    { left: 0, top: crop.y + crop.height, width, height: crop.y },
    { left: 0, top: crop.y, width: crop.x, height: crop.height },
    { left: crop.x + crop.width, top: crop.y, width: crop.x, height: crop.height },
  ];
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    {regions.filter((region) => region.width > 0 && region.height > 0).map((region, index) => <View key={index} style={[styles.region, region]}>
      <BlurView style={StyleSheet.absoluteFill} blurType="light" blurAmount={tokens.effects.captureOutsideBlur} reducedTransparencyFallbackColor={theme.surface} />
    </View>)}
  </View>;
}
const styles = StyleSheet.create({ region: { position: 'absolute', overflow: 'hidden' } });
