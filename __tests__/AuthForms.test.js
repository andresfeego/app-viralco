import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { RegisterScreen } from '../src/screens/RegisterScreen';
import { ForgotPasswordScreen } from '../src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from '../src/screens/ResetPasswordScreen';
import { PaperFormInput } from '../src/components/PaperFormInput';
import { AppButton } from '../src/design-system/components/AppButton';
import { FormLayout } from '../src/design-system/components/FormLayout';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { useAuth } from '../src/hooks/useAuth';
import { setLocale } from '../src/i18n';

jest.mock('../src/hooks/useAuth', () => ({ useAuth: jest.fn() }));
afterEach(() => setLocale('es'));

test.each([['light', 'es'], ['dark', 'en']])('access forms retain their requests and shared action layout in %s/%s', async (mode, locale) => {
  setLocale(locale);
  const register = jest.fn(async () => ({ message: 'Registered' }));
  const forgotPassword = jest.fn(async () => ({ message: 'Sent' }));
  const resetPassword = jest.fn(async () => ({ message: 'Saved' }));
  useAuth.mockReturnValue({ register, forgotPassword, resetPassword, user: { themeMode: mode } });
  for (const [Screen, values, operation, args] of [
    [RegisterScreen, ['Name', '123', 'test@example.com', 'password'], register, [{ name: 'Name', phone: '123', email: 'test@example.com', password: 'password' }]],
    [ForgotPasswordScreen, ['test@example.com'], forgotPassword, ['test@example.com']],
    [ResetPasswordScreen, ['token', 'newPassword'], resetPassword, ['token', 'newPassword']],
  ]) {
    let tree;
    await act(async () => { tree = renderer.create(<Screen onGoLogin={jest.fn()} onGoReset={jest.fn()} />); });
    expect(tree.root.findAllByType(FormLayout)).toHaveLength(1);
    if (Screen !== ForgotPasswordScreen) {
      const password = tree.root.findAllByType(PaperFormInput).find(input => input.props.secureTextEntry);
      expect(password.findByType(PaperTextInput).props).toMatchObject({ secureTextEntry: true, autoCapitalize: 'none' });
    }
    await act(async () => { tree.root.findAllByType(PaperFormInput).forEach((input, index) => input.props.onChangeText(values[index])); });
    await act(async () => { await tree.root.findByType(AppButton).props.onPress(); });
    expect(operation).toHaveBeenCalledWith(...args);
    await act(async () => tree.unmount());
  }
});
