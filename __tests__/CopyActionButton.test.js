import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { CopyActionButton } from '../src/components/CopyActionButton';
import { IconTextButton } from '../src/components/IconTextButton';
import { getTheme } from '../src/design-system/theme';
import { setLocale, t } from '../src/i18n';

const mockToast = jest.fn();
jest.mock('../src/providers/ToastProvider', () => ({ useToast: () => ({ showToast: mockToast }) }));
jest.mock('@react-native-vector-icons/fontawesome6', () => 'Icon');
beforeEach(() => { jest.clearAllMocks(); Clipboard.setString.mockReset(); });
afterEach(() => setLocale('es'));

test.each([['light', 'es'], ['dark', 'en']])('copies exact text with a muted, accessible icon in %s/%s', (mode, locale) => {
  setLocale(locale);
  const theme = getTheme(mode);
  let tree;
  act(() => { tree = renderer.create(<CopyActionButton theme={theme} value="001-234 567" iconOnly accessibilityLabel={t('billing_copy_account_number')} />); });
  const button = tree.root.findByType(IconTextButton);
  expect(button.props).toMatchObject({ variant: 'ghost', label: '', iconColor: theme.textSecondary, accessibilityLabel: t('billing_copy_account_number') });
  expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  expect(tree.root.findAllByType(Text)).toHaveLength(0);
  act(() => button.props.onPress());
  expect(Clipboard.setString).toHaveBeenCalledWith('001-234 567');
  expect(mockToast).toHaveBeenCalledWith({ type: 'info', message: t('common_copied') });
  act(() => tree.unmount());
});
test('does not copy blank or disabled values and gives a generic failure message', () => {
  let tree;
  const theme = getTheme('dark');
  act(() => { tree = renderer.create(<CopyActionButton theme={theme} value="   " iconOnly />); });
  expect(tree.root.findByType(IconTextButton).props.disabled).toBe(true);
  act(() => tree.root.findByType(IconTextButton).props.onPress());
  expect(Clipboard.setString).not.toHaveBeenCalled();
  act(() => tree.update(<CopyActionButton theme={theme} value="secret@example.test" iconOnly disabled />));
  act(() => tree.root.findByType(IconTextButton).props.onPress());
  expect(Clipboard.setString).not.toHaveBeenCalled();
  act(() => tree.update(<CopyActionButton theme={theme} value="secret@example.test" iconOnly />));
  Clipboard.setString.mockImplementationOnce(() => { throw new Error('Native clipboard error'); });
  act(() => tree.root.findByType(IconTextButton).props.onPress());
  expect(mockToast).toHaveBeenCalledWith({ type: 'error', message: t('common_copy_failed') });
  act(() => tree.unmount());
});
