import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Image, StyleSheet } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { captureWindow, previewImageInSlot } from '../src/domain/mirrorCaptureFraming';
import { MirrorCaptureMask } from '../src/components/MirrorCaptureMask';
import { MirrorSimulatorCamera } from '../src/components/MirrorSimulatorCamera';
import { GuestResult, GuestStage, GuestWelcome } from '../src/components/MirrorGuestScene';
import { getTheme } from '../src/design-system/theme';

jest.mock('@react-native-community/blur', () => ({ BlurView: 'Blur' }));
jest.mock('../src/components/IconTextButton', () => ({ IconTextButton: 'Action' }));
jest.mock('../src/design-system/components/AppButton', () => ({ AppButton: 'Action' }));
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: 'Toast' }));
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('react-native-svg', () => ({ SvgXml: 'Svg' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) }));

it.each([0.75, 1, 1.5])('keeps full viewport and centers the %s crop, with only outside regions blurred', (ratio) => {
  const crop = captureWindow(400, 900, ratio);
  expect(crop.width).toBe(400);
  expect(crop.height).toBeCloseTo(400 / ratio);
  expect(crop.y).toBeCloseTo((900 - 400 / ratio) / 2);
  let tree;
  act(() => { tree = renderer.create(<MirrorCaptureMask width={400} height={900} ratio={ratio} theme={getTheme('dark')} />); });
  const blur = tree.root.findAllByType('Blur');
  expect(blur).toHaveLength(2);
  expect(StyleSheet.flatten(blur[0].parent.props.style).height).toBe(crop.y);
  act(() => tree.unmount());
});

it('handles side masks and legacy captures without changing their cropping', () => {
  expect(captureWindow(900, 400, 1)).toEqual({ x: 250, y: 0, width: 400, height: 400 });
  expect(previewImageInSlot(undefined, 1)).toBeNull();
  expect(previewImageInSlot(0.5, 1)).toEqual({ left: '0%', top: '-50%', width: '100%', height: '200%' });
  expect(previewImageInSlot(1, 0.5)).toEqual({ left: '-50%', top: '0%', width: '200%', height: '100%' });
});

it('exports the simulator signal as a real JPEG without capturing screen controls', async () => {
  const ref = React.createRef(); const availability = jest.fn(); let tree;
  await act(async () => { tree = renderer.create(<MirrorSimulatorCamera ref={ref} onAvailabilityChange={availability} />); });
  await act(async () => tree.root.findByProps({ collapsable: false }).props.onLayout({ nativeEvent: { layout: { width: 400, height: 900 } } }));
  expect(availability).toHaveBeenLastCalledWith({ permission: true, ready: true, simulated: true });
  await expect(ref.current.takePhoto()).resolves.toMatchObject({ path: '/tmp/output.jpg', width: 1200, height: 2700, simulated: true });
  expect(captureRef).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ format: 'jpg', kapturaExactPixels: true }));
  act(() => tree.unmount());
});

it('shows the result image before measurement and does not reserve footer/header space', () => {
  let tree; const config = { layout: { output: { width: 100, height: 200 }, slots: [{ slotId: 'a', x: 0, y: 0, width: 100, height: 100, photoNumber: 1 }] } };
  act(() => { tree = renderer.create(<GuestStage theme={getTheme('dark')} overlay={<GuestResult output={{ uri: 'file:///result.jpg' }} config={config} theme={getTheme('dark')} onRetake={jest.fn()} />} />); });
  expect(tree.root.findByType(Image).props.source.uri).toBe('file:///result.jpg');
  const result = tree.root.findByType(GuestResult);
  expect(StyleSheet.flatten(result.parent.props.style)).toMatchObject(StyleSheet.absoluteFill);
  act(() => tree.unmount());
});

it('has no start button over the welcome video, but the whole screen is touchable', () => {
  let tree; const start = jest.fn();
  act(() => { tree = renderer.create(<GuestWelcome theme={getTheme('dark')} video={{ uri: 'file:///start.mp4' }} onStart={start} />); });
  expect(tree.root.findAllByType('Action')).toHaveLength(0);
  expect(tree.root.findAll((node) => node.props.onPress === start).length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
