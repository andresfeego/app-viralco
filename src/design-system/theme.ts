import type { ThemeMode } from './tokens';
import { tokens } from './tokens';

export function getTheme(mode: ThemeMode) {
  const isDark = mode === 'dark';

  return {
    background: isDark ? tokens.colors.backgroundDark : tokens.colors.backgroundLight,
    surface: isDark ? tokens.colors.surfaceDark : tokens.colors.surfaceLight,
    border: isDark ? tokens.colors.borderDark : tokens.colors.borderLight,
    textPrimary: isDark ? tokens.colors.textPrimaryDark : tokens.colors.textPrimaryLight,
    textSecondary: isDark ? tokens.colors.textSecondaryDark : tokens.colors.textSecondaryLight,
    buttonBg: tokens.colors.actionPrimary,
    buttonBgPressed: tokens.colors.actionPrimaryPressed,
    buttonText: tokens.colors.actionPrimaryText,
  };
}
