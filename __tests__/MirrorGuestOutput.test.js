import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, StyleSheet, Text } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { MirrorOutputComposer } from '../src/components/MirrorOutputComposer';
import { CanvasContent } from '../src/components/MirrorConfigPreview';
import { getTheme } from '../src/design-system/theme';
import { MIRROR_CANVAS_REFERENCE_WIDTH } from '../src/components/MirrorCanvasSurface';
import { loadRuntimeFont } from '../src/services/runtimeFonts';

jest.mock('../src/services/runtimeFonts', () => ({ loadRuntimeFont: jest.fn(async () => 'ActualFont') }));
beforeEach(() => {
  jest.spyOn(Image, 'getSize').mockImplementation((_uri, onSuccess) => onSuccess(2000, 2960));
});
afterEach(() => jest.restoreAllMocks());
jest.mock('../src/components/RuntimeFontText', () => {
  const R = require('react');
  const { Text: NativeText } = require('react-native');
  return { RuntimeFontText: (props) => R.createElement(NativeText, props) };
});

const config = {
  resources: {}, capture: { quality: 'high' },
  layout: {
    output: { width: 2000, height: 2960 }, duplicateStrip: true,
    slots: [{ slotId: 'slot', photoNumber: 1, x: 10, y: 20, width: 70, height: 40, rotation: 15 }],
    textLayers: [{ id: 'text', text: 'Una fuente', size: 24, x: 5, y: 80, width: 90, font: 'resource', fontResourceId: 'font', color: '#ffffff' }],
    backgroundLayers: [{ id: 'color', kind: 'color', color: '#048A81', x: 0, y: 0, width: 100, height: 100 }],
  },
};

it.each(['light', 'dark'])('composes duplicate strips without editor chrome in %s', async (mode) => {
  const ref = React.createRef();
  let tree;
  await act(async () => { tree = renderer.create(<MirrorOutputComposer ref={ref} theme={getTheme(mode)} config={config} captures={[{ photoNumber: 1, selected: true, uri: 'file:///photo.jpg' }]} localManifest={[{ eventResourceId: 'font', assetId: 'font-file', mimeType: 'font/ttf', uri: 'file:///font.ttf' }]} />); });
  const root = tree.root.findByProps({ collapsable: false });
  await act(async () => { root.props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
  expect(StyleSheet.flatten(root.props.style).aspectRatio).toBe(2000 / 2960);
  const photos = tree.root.findAllByType(Image).filter((node) => node.props.resizeMode === 'cover');
  expect(photos).toHaveLength(2);
  expect(StyleSheet.flatten(photos[0].props.style)).toMatchObject({ left: '10%', top: '20%', width: '70%', height: '40%', transform: [{ rotate: '15deg' }] });
  expect(tree.root.findAllByType(Text).map((node) => node.props.children)).toEqual(['Una fuente', 'Una fuente']);
  expect(StyleSheet.flatten(tree.root.findAllByType(Text)[0].props.style).fontSize).toBe(24 * 300 / MIRROR_CANVAS_REFERENCE_WIDTH / 2);
  tree.root.findAllByType(Image).filter((node) => node.props.onLoad).forEach((node) => node.props.onLoad());
  await act(async () => { await ref.current.compose(); });
  expect(loadRuntimeFont).toHaveBeenCalledWith(expect.objectContaining({ asset: expect.objectContaining({ fileUrl: 'file:///font.ttf' }) }));
  expect(captureRef).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ width: 2000, height: 2960, quality: 0.92 }));
  act(() => tree.unmount());
});

it('preserves fullscreen preview framing inside rotated duplicate slots', async () => {
  let tree;
  await act(async () => { tree = renderer.create(<MirrorOutputComposer theme={getTheme('dark')} config={config} captures={[{ photoNumber: 1, uri: 'file:///photo.jpg', previewAspectRatio: 0.5 }]} localManifest={[]} />); });
  const photos = tree.root.findAllByType(Image).filter((node) => node.props.resizeMode === 'cover');
  expect(photos).toHaveLength(2);
  const framing = StyleSheet.flatten(photos[0].props.style);
  expect(framing.width).toBe('100%');
  expect(parseFloat(framing.height)).toBeCloseTo(100 * (700 / 1184) / 0.5);
  const slot = photos[0].parent.parent;
  expect(StyleSheet.flatten(slot.props.style)).toMatchObject({ overflow: 'hidden', left: '10%', top: '20%', width: '70%', height: '40%', transform: [{ rotate: '15deg' }] });
  act(() => tree.unmount());
});

it('scales editor text with its canvas using the same output reference', async () => {
  let tree;
  await act(async () => { tree = renderer.create(<CanvasContent config={config} theme={getTheme('dark')} resourcesById={{}} />); });
  const canvas = tree.root.findAll((node) => typeof node.props.onLayout === 'function')[0];
  await act(async () => { canvas.props.onLayout({ nativeEvent: { layout: { width: MIRROR_CANVAS_REFERENCE_WIDTH / 2 } } }); });
  const text = tree.root.findAllByType(Text).find((node) => node.props.children === 'Una fuente');
  expect(StyleSheet.flatten(text.props.style).fontSize).toBe(12);
  expect(text.props.allowFontScaling).toBe(false);
  act(() => tree.unmount());
});

it('keeps decoded images ready across parent rerenders with fresh capture arrays', async () => {
  const ref = React.createRef();
  const props = () => ({ config, theme: getTheme('dark'), captures: [{ photoNumber: 1, uri: 'file:///photo.jpg' }], localManifest: [{ eventResourceId: 'unused', mimeType: 'image/png', uri: 'file:///not-in-design.png' }] });
  let tree;
  await act(async () => { tree = renderer.create(<MirrorOutputComposer ref={ref} {...props()} />); });
  await act(async () => { tree.root.findByProps({ collapsable: false }).props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
  const images = tree.root.findAllByType(Image);
  expect(images).toHaveLength(2); // Real photo in each strip; no invisible preload.
  images.forEach((node) => node.props.onLoad());
  await act(async () => { tree.update(<MirrorOutputComposer ref={ref} {...props()} />); });
  await act(async () => { await expect(ref.current.compose()).resolves.toBe('/tmp/output.jpg'); });
  act(() => tree.unmount());
});

it('waits for both actual strip images and a late layout before taking a snapshot', async () => {
  captureRef.mockClear();
  const ref = React.createRef();
  let tree;
  await act(async () => { tree = renderer.create(<MirrorOutputComposer ref={ref} config={config} theme={getTheme('dark')} captures={[{ photoNumber: 1, uri: 'file:///photo.jpg' }]} localManifest={[]} />); });
  const images = tree.root.findAllByType(Image);
  const promise = ref.current.compose();
  images[0].props.onLoad();
  await act(async () => { tree.root.findByProps({ collapsable: false }).props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
  await new Promise((resolve) => setTimeout(resolve, 75));
  expect(captureRef).not.toHaveBeenCalled();
  images[1].props.onLoad();
  await act(async () => { await promise; });
  expect(captureRef).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
});

it('reports a genuinely broken image with its URI instead of delivering a partial output', async () => {
  captureRef.mockClear();
  const ref = React.createRef();
  let tree;
  await act(async () => { tree = renderer.create(<MirrorOutputComposer ref={ref} config={config} theme={getTheme('dark')} captures={[{ photoNumber: 1, uri: 'file:///missing.jpg' }]} localManifest={[]} />); });
  await act(async () => { tree.root.findByProps({ collapsable: false }).props.onLayout({ nativeEvent: { layout: { width: 300 } } }); });
  tree.root.findAllByType(Image)[0].props.onError({ nativeEvent: { error: 'File missing' } });
  await expect(ref.current.compose()).rejects.toMatchObject({ message: 'MIRROR_OUTPUT_IMAGE_NOT_READY', details: { images: expect.arrayContaining([expect.objectContaining({ uri: 'file:///missing.jpg', status: 'failed', reason: 'File missing' })]) } });
  expect(captureRef).not.toHaveBeenCalled();
  act(() => tree.unmount());
});
