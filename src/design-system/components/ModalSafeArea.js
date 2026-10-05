import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../tokens';

export function modalSurfaceTopOffset(insetTop = tokens.spacing.none, topSpacing = tokens.spacing.xs) {
  return Math.max(tokens.spacing.xl * 2, insetTop + topSpacing);
}

export function ModalSafeArea({ children, style, testID, topSpacing = tokens.spacing.xs }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      testID={testID}
      edges={['left', 'right', 'bottom']}
      accessibilityViewIsModal
      style={[styles.container, style, { paddingTop: modalSurfaceTopOffset(insets.top, topSpacing) }]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
