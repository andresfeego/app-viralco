import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { IconTextButton } from './IconTextButton';
import { tokens } from '../design-system/tokens';
import { t } from '../i18n';
import { clampZoom, fitImage, INITIAL_ZOOM, MAX_ZOOM, MIN_ZOOM, touchGeometry, zoomAt } from '../utils/imageZoom';

// The viewport owns gestures; the image never becomes a separate touch target.
export function ZoomableImage({ uri, theme, onError, testID = 'zoom-image' }) {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const current = useRef({});
  const gesture = useRef(null);
  const fitted = fitImage(imageSize, viewport);
  const update = state => { current.current.zoom = state; setZoom(state); };
  current.current = { viewport, fitted, zoom, loaded, update };
  useEffect(() => { setLoaded(false); setImageSize({ width: 0, height: 0 }); setZoom(INITIAL_ZOOM); gesture.current = null; }, [uri]);
  useEffect(() => { setZoom(INITIAL_ZOOM); gesture.current = null; }, [viewport.width, viewport.height]);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => current.current.loaded,
    onMoveShouldSetPanResponder: () => current.current.loaded,
    onPanResponderGrant: event => { gesture.current = touchGeometry(event.nativeEvent.touches); },
    onPanResponderMove: event => {
      const next = touchGeometry(event.nativeEvent.touches);
      const previous = gesture.current;
      gesture.current = next;
      if (!next || !previous || next.count !== previous.count) return;
      const { zoom: state, fitted: size, viewport: bounds } = current.current;
      const scaled = next.count === 2 && previous.distance > 0
        ? zoomAt(state, state.scale * next.distance / previous.distance, { x: previous.x - bounds.width / 2, y: previous.y - bounds.height / 2 }, size, bounds) : state;
      current.current.update(clampZoom({ ...scaled, x: scaled.x + next.x - previous.x, y: scaled.y + next.y - previous.y }, size, bounds));
    },
    onPanResponderRelease: () => { gesture.current = null; },
    onPanResponderTerminate: () => { gesture.current = null; },
  }), []);
  const action = (suffix, icon, label, onPress, disabled) => <IconTextButton testID={`${testID}-${suffix}`} theme={theme} icon={icon} accessibilityLabel={label}
    variant="outlined" borderColor={theme.buttonSecondaryBorder} disabled={!loaded || disabled} onPress={onPress} />;
  const step = delta => update(zoomAt(current.current.zoom, current.current.zoom.scale + delta, { x: 0, y: 0 }, fitted, viewport));
  return <View style={styles.container}>
    <View testID={`${testID}-viewport`} {...responder.panHandlers} style={[styles.viewport, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onLayout={event => setViewport(event.nativeEvent.layout)}>
      <View pointerEvents="none" style={styles.center}>
        <Image testID={`${testID}-content`} source={{ uri }} resizeMode="contain" accessibilityLabel={t('billing_attachment')}
          onLoad={({ nativeEvent }) => { setImageSize(nativeEvent.source); setLoaded(true); }}
          onError={() => { setLoaded(false); onError?.(); }}
          style={{ width: fitted.width || viewport.width, height: fitted.height || viewport.height,
            transform: [{ translateX: zoom.x }, { translateY: zoom.y }, { scale: zoom.scale }] }} />
      </View>
      {!loaded ? <ActivityIndicator color={theme.primary} style={styles.loading} /> : null}
    </View>
    <View testID={`${testID}-controls`} style={styles.controls}>
      {action('out', 'minus', t('viewer_zoom_out'), () => step(-0.5), zoom.scale <= MIN_ZOOM)}
      <Text accessibilityLiveRegion="polite" style={[styles.percent, { color: theme.textPrimary }]}>{Math.round(zoom.scale * 100)}%</Text>
      {action('in', 'plus', t('viewer_zoom_in'), () => step(0.5), zoom.scale >= MAX_ZOOM)}
      {action('fit', 'expand', t('viewer_fit'), () => update(INITIAL_ZOOM), zoom.scale === MIN_ZOOM)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: tokens.spacing.none, gap: tokens.spacing.md },
  viewport: { flex: 1, minHeight: tokens.spacing.none, overflow: 'hidden', borderWidth: tokens.border.thin, borderRadius: tokens.radius.md },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  loading: { ...StyleSheet.absoluteFillObject },
  controls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: tokens.spacing.sm },
  percent: { fontSize: tokens.typography.body, fontVariant: ['tabular-nums'], minWidth: tokens.spacing.xl * 2, textAlign: 'center' },
});
