import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AppState, Text } from 'react-native';
import { PrivateReceiptModal } from '../src/components/PrivateReceiptModal';
import { ZoomableImage } from '../src/components/ZoomableImage';
import { createPrivateReceiptSession } from '../src/services/privateReceipt';
import { getTheme } from '../src/design-system/theme';
import { setLocale, t } from '../src/i18n';

jest.mock('../src/services/privateReceipt', () => ({ createPrivateReceiptSession: jest.fn() }));
jest.mock('../src/components/ZoomableImage', () => ({ ZoomableImage: 'ZoomableImage' }));
jest.mock('../src/services/errorHandling', () => ({ recordClientTechnicalError: jest.fn(async () => {}) }));
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: require('react-native').View, useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));
let session;
beforeEach(() => {
  jest.clearAllMocks();
  session = { load: jest.fn(async () => ({})), page: jest.fn(async page => ({ uri: `file:///page-${page}.png`, pageCount: 2 })), dispose: jest.fn(async () => {}) };
  createPrivateReceiptSession.mockReturnValue(session);
});
afterEach(() => { jest.restoreAllMocks(); setLocale('es'); });

test.each([['light', 'es'], ['dark', 'en']])('opens a private receipt with zoom, page controls and safe area in %s/%s', async (mode, locale) => {
  setLocale(locale);
  const onClose = jest.fn();
  let tree;
  await act(async () => { tree = renderer.create(<PrivateReceiptModal reportId="4" theme={getTheme(mode)} onClose={onClose} />); });
  expect(createPrivateReceiptSession).toHaveBeenCalledWith('4');
  expect(tree.root.findByType(ZoomableImage).props.uri).toBe('file:///page-0.png');
  const button = key => tree.root.findByProps({ testID: `private-receipt-${key}` });
  expect(button('previous').props.disabled).toBe(true);
  await act(async () => button('next').props.onPress());
  expect(tree.root.findByType(ZoomableImage).props.uri).toBe('file:///page-1.png');
  expect(button('next').props.disabled).toBe(true);
  act(() => button('close').props.onPress()); expect(onClose).toHaveBeenCalledTimes(1);
  act(() => tree.unmount()); expect(session.dispose).toHaveBeenCalledTimes(1);
});

test('shows a readable error and retries with new authorization instead of exposing a signed URL', async () => {
  session.load.mockRejectedValueOnce(new Error('https://private.test/?signature=secret'));
  let tree;
  await act(async () => { tree = renderer.create(<PrivateReceiptModal reportId="4" theme={getTheme('dark')} onClose={jest.fn()} />); });
  const texts = tree.root.findAllByType(Text).map(node => node.props.children);
  expect(texts).toContain(t('viewer_load_failed'));
  expect(JSON.stringify(texts)).not.toContain('signature');
  await act(async () => tree.root.findByProps({ testID: 'private-receipt-retry' }).props.onPress());
  expect(createPrivateReceiptSession).toHaveBeenCalledTimes(2);
  expect(session.dispose).toHaveBeenCalledTimes(1);
  expect(tree.root.findByType(ZoomableImage)).toBeTruthy();
  act(() => tree.unmount());
});

test('closes when the app becomes inactive and ignores an opening that finishes after unmount', async () => {
  let callback, finish;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_name, handler) => { callback = handler; return { remove: jest.fn() }; });
  session.load.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const onClose = jest.fn(); let tree;
  await act(async () => { tree = renderer.create(<PrivateReceiptModal reportId="4" theme={getTheme('light')} onClose={onClose} />); });
  act(() => callback('inactive')); expect(onClose).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  await act(async () => finish({}));
  expect(session.dispose).toHaveBeenCalledTimes(1);
});
