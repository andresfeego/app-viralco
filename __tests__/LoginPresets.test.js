import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { LoginScreen } from '../src/screens/LoginScreen';
import { DotSelector } from '../src/components/DotSelector';
import { getTheme } from '../src/design-system/theme';
jest.mock('../src/hooks/useAuth', () => ({ useAuth: () => ({ login: jest.fn() }) }));
jest.mock('../src/providers/ToastProvider', () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock('../src/services/errorHandling', () => ({ userErrorMessage: jest.fn() }));
jest.mock('../src/design-system/components/AppButton', () => ({ AppButton: 'AppButton' }));

it('offers exactly the three requested profiles and fills newly registered credentials', () => {
  let tree;
  act(() => { tree = renderer.create(<LoginScreen />); });
  const selector = tree.root.findByType(DotSelector);
  expect(selector.props.items.map((item) => item.key)).toEqual(['SA', 'AUA', 'NEW']);
  act(() => selector.props.onSelect('NEW'));
  const inputs = tree.root.findAllByType(TextInput);
  expect(inputs[0].props.value).toBe('usuarioregistrado@viralco.local');
  expect(inputs[1].props.value).toBe('usuarioregistrado1234');
  expect(tree.root.findByType(DotSelector).props.selectedKey).toBe('NEW');
  act(() => inputs[0].props.onChangeText('another@example.test'));
  expect(tree.root.findByType(DotSelector).props.selectedKey).toBeUndefined();
  act(() => tree.unmount());
});

it.each(['light', 'dark'])('renders accessible selectable dots in %s', (mode) => {
  let tree;
  const onSelect = jest.fn();
  act(() => { tree = renderer.create(<DotSelector theme={getTheme(mode)} items={[{ key: 'one', label: 'One', testID: 'one' }]} selectedKey="one" onSelect={onSelect} />); });
  const button = tree.root.findAll((node) => node.props.testID === 'one' && node.props.onPress)[0];
  expect(button.props.accessibilityState.selected).toBe(true);
  expect(button.props.accessibilityLabel).toBe('One');
  act(() => button.props.onPress());
  expect(onSelect).toHaveBeenCalledWith('one');
  act(() => tree.unmount());
});
