import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../tokens';

export function modalSurfaceTopOffset(insetTop = tokens.spacing.none) {
  return Math.max(tokens.spacing.xl * 2, insetTop + tokens.spacing.xs);
}

export function ModalSafeArea({ children, style, testID }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      testID={testID}
      edges={['left', 'right', 'bottom']}
      accessibilityViewIsModal
      style={[styles.container, style, { paddingTop: modalSurfaceTopOffset(insets.top) }]}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
