import { getTheme } from '../src/design-system/theme';
import { tokens } from '../src/design-system/tokens';

test('exposes the ViralCo primary, secondary and tertiary brand colors', () => {
  expect(tokens.colors.primary).toBe('#1d4ed8');
  expect(tokens.colors.secondary).toBe('#C303FD');
  expect(tokens.colors.tertiary).toBe('#03FAFF');

  expect(getTheme('light')).toEqual(expect.objectContaining({
    primary: tokens.colors.primary,
    secondary: tokens.colors.secondary,
    tertiary: tokens.colors.tertiary,
  }));
  expect(getTheme('dark')).toEqual(expect.objectContaining({
    primary: tokens.colors.primary,
    secondary: tokens.colors.secondary,
    tertiary: tokens.colors.tertiary,
  }));
});
