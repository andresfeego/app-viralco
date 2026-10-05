import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { PanResponder } from 'react-native';
import { appendPatternNode, samePattern, validPattern } from '../src/domain/mirrorPattern';
import { LaunchPatternGate } from '../src/components/LaunchPatternGate';
import { getTheme } from '../src/design-system/theme';
import { GuestStage, GuestModal } from '../src/components/MirrorGuestScene';

jest.mock('../src/components/IconTextButton', () => ({ IconTextButton: 'Action' }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: 'Svg', Circle: 'Circle', Polyline: 'Polyline' }));
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-video', () => 'Video');
jest.mock('../src/providers/ToastProvider', () => ({ ToastViewport: 'Toast' }));

it('requires four distinct nodes and fills crossed midpoints', () => {
  expect(validPattern([0, 1, 2])).toBe(false);
  expect(validPattern([0, 1, 2, 1])).toBe(false);
  expect(appendPatternNode([0], 8)).toEqual([0, 4, 8]);
  expect(appendPatternNode([0], 2)).toEqual([0, 1, 2]);
  expect(appendPatternNode([0, 4], 0)).toEqual([0, 4]);
  expect(samePattern([0, 1, 2, 5], [5, 2, 1, 0])).toBe(false);
});

it.each(['light', 'dark'])('creates and confirms the temporary pattern in %s', (mode) => {
  let handlers;
  jest.spyOn(PanResponder, 'create').mockImplementation((config) => { handlers = config; return { panHandlers: {} }; });
  const ready = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<LaunchPatternGate theme={getTheme(mode)} onReady={ready} onClose={jest.fn()} />); });
  act(() => tree.root.findAll((item) => Boolean(item.props.onLayout))[0].props.onLayout({ nativeEvent: { layout: { width: 300, height: 300 } } }));
  const draw = () => act(() => {
    handlers.onPanResponderGrant({ nativeEvent: { locationX: 50, locationY: 50 } });
    handlers.onPanResponderMove({ nativeEvent: { locationX: 250, locationY: 50 } });
    handlers.onPanResponderMove({ nativeEvent: { locationX: 250, locationY: 150 } });
    handlers.onPanResponderRelease();
  });
  draw(); expect(ready).not.toHaveBeenCalled();
  draw(); expect(ready).toHaveBeenCalledWith([0, 1, 2, 5]);
  act(() => tree.unmount()); jest.restoreAllMocks();
});

it('requires three seconds on the circle in both the scene and native modals', () => {
  const operator = jest.fn();
  let tree;
  act(() => { tree = renderer.create(<GuestStage theme={getTheme('dark')} onOperator={operator}><GuestModal title="Gallery" theme={getTheme('dark')} onClose={jest.fn()} /></GuestStage>); });
  const controls = tree.root.findAllByType('Action').filter((item) => item.props.icon === 'circle');
  expect(controls).toHaveLength(2);
  controls.forEach((control) => {
    expect(control.props.delayLongPress).toBe(3000);
    expect(control.props.onPress).toBeUndefined();
    expect(control.props.onLongPress).toBe(operator);
  });
  act(() => tree.unmount());
});
