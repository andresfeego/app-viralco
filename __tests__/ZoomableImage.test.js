import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PanResponder, StyleSheet, Text } from 'react-native';
import { ZoomableImage } from '../src/components/ZoomableImage';
import { getTheme } from '../src/design-system/theme';
import { clampZoom, fitImage, INITIAL_ZOOM, touchGeometry, zoomAt } from '../src/utils/imageZoom';
import { setLocale, t } from '../src/i18n';

jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
afterEach(() => { jest.restoreAllMocks(); setLocale('es'); });
test('fits portrait/landscape images without clipping and clamps panning to image edges', () => {
  expect(fitImage({ width: 1000, height: 2000 }, { width: 400, height: 600 })).toEqual({ width: 300, height: 600 });
  expect(fitImage({ width: 1000, height: 2000 }, { width: 600, height: 300 })).toEqual({ width: 150, height: 300 });
  const fitted = { width: 300, height: 600 }, viewport = { width: 400, height: 600 };
  expect(clampZoom({ scale: 2, x: 999, y: -999 }, fitted, viewport)).toEqual({ scale: 2, x: 100, y: -300 });
  expect(clampZoom({ scale: 0, x: 999, y: -999 }, fitted, viewport)).toEqual(INITIAL_ZOOM);
  expect(clampZoom({ scale: 20, x: 0, y: 0 }, fitted, viewport).scale).toBe(6);
  expect(zoomAt(INITIAL_ZOOM, 2, { x: 50, y: -100 }, fitted, viewport)).toEqual({ scale: 2, x: -50, y: 100 });
  expect(touchGeometry([])).toBeNull();
});

test.each([['light', 'es'], ['dark', 'en']])('supports pinch, pan, buttons, reset and rotation in %s/%s', (mode, locale) => {
  setLocale(locale);
  jest.spyOn(PanResponder, 'create').mockImplementation(handlers => ({ panHandlers: handlers }));
  let tree;
  act(() => { tree = renderer.create(<ZoomableImage uri="file:///receipt.jpg" theme={getTheme(mode)} />); });
  const viewport = () => tree.root.findByProps({ testID: 'zoom-image-viewport' });
  const control = key => tree.root.findByProps({ testID: `zoom-image-${key}` });
  const image = () => tree.root.findByProps({ testID: 'zoom-image-content' });
  expect(control('in').props.disabled).toBe(true);
  act(() => {
    viewport().props.onLayout({ nativeEvent: { layout: { width: 400, height: 600 } } });
    image().props.onLoad({ nativeEvent: { source: { width: 400, height: 600 } } });
  });
  expect(control('in').props.accessibilityLabel).toBe(t('viewer_zoom_in'));
  expect(control('out').props.disabled).toBe(true);
  act(() => control('in').props.onPress());
  expect(tree.root.findAllByType(Text).some(node => node.props.children.join?.('') === '150%')).toBe(true);
  act(() => control('fit').props.onPress());
  const touches = points => ({ nativeEvent: { touches: points.map(([locationX, locationY]) => ({ locationX, locationY })) } });
  act(() => viewport().props.onPanResponderGrant(touches([[100, 200], [300, 200]])));
  act(() => viewport().props.onPanResponderMove(touches([[0, 200], [400, 200]])));
  expect(StyleSheet.flatten(image().props.style).transform).toEqual([{ translateX: 0 }, { translateY: 100 }, { scale: 2 }]);
  // Removing a finger rebases the drag instead of jumping.
  act(() => viewport().props.onPanResponderMove(touches([[50, 200]])));
  act(() => viewport().props.onPanResponderMove(touches([[75, 250]])));
  expect(StyleSheet.flatten(image().props.style).transform).toEqual([{ translateX: 25 }, { translateY: 150 }, { scale: 2 }]);
  act(() => viewport().props.onLayout({ nativeEvent: { layout: { width: 600, height: 300 } } }));
  expect(StyleSheet.flatten(image().props.style).transform).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
  act(() => tree.unmount());
});
