import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '../design-system/tokens';
import { MIRROR_CANVAS_ASPECT_RATIO } from '../domain/magicMirrorConfig';

export function MirrorCanvasSurface({ children, theme, onLayout, testID = 'mirror-canvas', style = null, backgroundColor = theme.background }) {
  return (
    <View style={styles.center}>
      <View
        testID={testID}
        onLayout={onLayout}
        style={[
          styles.canvas,
          { backgroundColor, borderColor: theme.border },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { width: '100%', alignItems: 'center' },
  canvas: {
    width: '100%',
    maxWidth: tokens.spacing.xl * 12,
    aspectRatio: MIRROR_CANVAS_ASPECT_RATIO,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    overflow: 'hidden',
    position: 'relative',
  },
});
