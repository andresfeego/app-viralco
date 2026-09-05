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

test('stores a bounded redacted local technical record', async () => {
  await recordClientTechnicalError({ clientErrorId: 'client-1', requestId: 'request-1', code: 'INTERNAL_ERROR', detail: 'token=secret' });
  const saved = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);
  expect(saved[0]).toEqual(expect.objectContaining({ clientErrorId: 'client-1', requestId: 'request-1' }));
  expect(saved[0].detail).not.toContain('secret');
  (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(saved));
  await expect(listClientTechnicalErrors()).resolves.toHaveLength(1);
});
