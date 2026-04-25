export const tokens = {
  colors: {
    backgroundLight: '#f5f7fb',
    backgroundDark: '#111827',
    surfaceLight: '#ffffff',
    surfaceDark: '#1f2937',
    borderLight: '#dbe3ee',
    borderDark: '#374151',
    textPrimaryLight: '#111827',
    textPrimaryDark: '#f9fafb',
    textSecondaryLight: '#4b5563',
    textSecondaryDark: '#9ca3af',
    actionPrimary: '#1d4ed8',
    actionPrimaryPressed: '#1e40af',
    actionPrimaryText: '#ffffff',
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999,
  },
  typography: {
    hero: 32,
    heading: 24,
    body: 16,
    caption: 14,
  },
} as const;

export type ThemeMode = 'light' | 'dark';
