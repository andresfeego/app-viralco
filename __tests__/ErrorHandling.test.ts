import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTechnicalErrorMessage, listClientTechnicalErrors, recordClientTechnicalError, userErrorMessage } from '../src/services/errorHandling';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

test('replaces SQL, driver and network details with a generic message', () => {
  expect(isTechnicalErrorMessage('Failed query: select `id` from `users` where email = ?')).toBe(true);
  expect(userErrorMessage(new Error('Failed query: select `id` from `users` where email = ?'), 'No se pudo iniciar sesión')).toBe('No se pudo iniciar sesión');
  expect(userErrorMessage({ code: 'INTERNAL_ERROR', message: 'anything' }, 'Intenta nuevamente')).toBe('Intenta nuevamente');
});

test('keeps expected actionable validation messages', () => {
  expect(userErrorMessage(new Error('Credenciales invalidas'), 'No se pudo iniciar sesión')).toBe('Credenciales invalidas');
});

test('does not expose native entitlement errors in the login toast', () => {
  expect(userErrorMessage(new Error("Internal error when a required entitlement isn't present."), 'No se pudo iniciar sesión')).toBe('No se pudo iniciar sesión');
});

test('does not expose UIKit snapshot errors in a user toast', () => {
  const message = 'The view cannot be captured. drawViewHierarchyInRect was not successful. This is a potential technical or security limitation.';
  expect(userErrorMessage(new Error(message), 'No se pudo componer la foto.')).toBe('No se pudo componer la foto.');
});

test('does not expose internal runtime codes in a user toast', () => {
  expect(userErrorMessage(new Error('MIRROR_OUTPUT_IMAGE_NOT_READY'), 'No se pudo crear la foto. Intenta nuevamente.')).toBe('No se pudo crear la foto. Intenta nuevamente.');
});

test('stores a bounded redacted local technical record', async () => {
  await recordClientTechnicalError({ clientErrorId: 'client-1', requestId: 'request-1', code: 'INTERNAL_ERROR', detail: 'token=secret' });
  const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
  expect(saved[0]).toEqual(expect.objectContaining({ clientErrorId: 'client-1', requestId: 'request-1' }));
  expect(saved[0].detail).not.toContain('secret');
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(saved));
  await expect(listClientTechnicalErrors()).resolves.toHaveLength(1);
});
