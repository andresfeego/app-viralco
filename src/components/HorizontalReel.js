import React, { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { tokens } from '../design-system/tokens';

// Native Reel shared by filters and card carousels; edge fades never intercept touches.
export function HorizontalReel({ backgroundColor, children, testID, contentContainerStyle }) {
  const measurements = useRef({ viewport: 0, content: 0, offset: 0 });
  const [state, setState] = useState({ width: 0, left: false, right: false });
  const update = useCallback(patch => {
    const current = { ...measurements.current, ...patch };
    measurements.current = current;
    const maximum = Math.max(0, current.content - current.viewport);
    const offset = Math.max(0, Math.min(current.offset, maximum));
    const overflowing = current.viewport > 0 && maximum > 1;
    const next = { width: current.viewport, left: overflowing && offset > 1, right: overflowing && maximum - offset > 1 };
    setState(previous => previous.width === next.width && previous.left === next.left && previous.right === next.right ? previous : next);
  }, []);
  const transparent = `${backgroundColor}00`;
  return <View style={styles.reel}>
    <ScrollView horizontal testID={testID ? `${testID}-scroll` : undefined} style={styles.scroll} showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, contentContainerStyle]} keyboardShouldPersistTaps="handled" bounces={false} overScrollMode="never"
      onLayout={event => update({ viewport: event.nativeEvent.layout.width })}
      onContentSizeChange={width => update({ content: width })}
      onScroll={({ nativeEvent }) => update({ offset: nativeEvent.contentOffset.x, viewport: nativeEvent.layoutMeasurement.width, content: nativeEvent.contentSize.width })} scrollEventThrottle={16}>
      {typeof children === 'function' ? children(state.width) : children}
    </ScrollView>
    {state.left ? <LinearGradient testID={testID ? `${testID}-fade-left` : undefined} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" colors={[backgroundColor, transparent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fade, styles.left]} /> : null}
    {state.right ? <LinearGradient testID={testID ? `${testID}-fade-right` : undefined} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" colors={[transparent, backgroundColor]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fade, styles.right]} /> : null}
  </View>;
}
const styles = StyleSheet.create({
  reel: { minWidth: tokens.spacing.none, overflow: 'hidden' },
  scroll: { flexGrow: 0 },
  row: { flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: tokens.spacing.xs },
  fade: { position: 'absolute', top: tokens.spacing.none, bottom: tokens.spacing.none, width: tokens.spacing.lg },
  left: { left: tokens.spacing.none },
  right: { right: tokens.spacing.none },
});
