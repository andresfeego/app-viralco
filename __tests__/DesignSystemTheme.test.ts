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

test('exposes the three 45 degree brand gradients in both themes', () => {
  expect(tokens.gradients.primaryToSecondary).toEqual(expect.objectContaining({
    angle: 45,
    colors: [tokens.colors.primary, tokens.colors.secondary],
  }));
  expect(tokens.gradients.primaryToTertiary).toEqual(expect.objectContaining({
    angle: 45,
    colors: [tokens.colors.primary, tokens.colors.tertiary],
  }));
  expect(tokens.gradients.secondaryToPrimary).toEqual(expect.objectContaining({
    angle: 45,
    colors: [tokens.colors.secondary, tokens.colors.primary],
  }));

  expect(getTheme('light').gradients).toBe(tokens.gradients);
  expect(getTheme('dark').gradients).toBe(tokens.gradients);
});
