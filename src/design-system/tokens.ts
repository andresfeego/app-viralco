const brandColors = {
  primary: '#1d4ed8',
  secondary: '#C303FD',
  tertiary: '#03FAFF',
} as const;

// Derive the softer header stops from the brand colors, without a separate palette.
const secondaryOverPrimary = (secondaryWeight: number) => {
  const channels = [1, 3, 5].map(offset => {
    const primary = parseInt(brandColors.primary.slice(offset, offset + 2), 16);
    const secondary = parseInt(brandColors.secondary.slice(offset, offset + 2), 16);
    return Math.round(primary + (secondary - primary) * secondaryWeight)
      .toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`;
};

const gradient45 = {
  angle: 45,
  angleCenter: { x: 0.9, y: 0.5 },
  locations: [0.15, 0.65],
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
} as const;

const headerGradient = {
  colors: [0, 0.09, 0.32, 0.6, 0.9].map(secondaryOverPrimary),
  locations: [0, 0.35, 0.6, 0.82, 1],
  start: { x: 0, y: 1 },
  end: { x: 1, y: 0 },
} as const;

export const tokens = {
  colors: {
    ...brandColors,
    alert: '#dc2626',
    blue: {
      50: '#edf4ff',
      100: '#dbe9ff',
      200: '#bdd6ff',
      300: '#8eb8ff',
      400: '#5f99ff',
      500: '#1673ff',
      600: '#0c5ee0',
      700: '#0c4db4',
      800: '#123c83',
      900: '#122c5f',
    },
    gray: {
      0: '#ffffff',
      1: '#f7f9fc',
      2: '#e7edf5',
      3: '#c9d3e1',
      4: '#9aa8bd',
      5: '#6c7a90',
      6: '#49556a',
      7: '#2d3748',
      8: '#182131',
      9: '#0b1320',
    },
    yellow: {
      50: '#fff9e5',
      100: '#fff1bf',
      200: '#ffe693',
      300: '#ffd85c',
      400: '#ffbf00',
      500: '#f0ab00',
      600: '#c88800',
      700: '#996400',
      800: '#6b4500',
      900: '#452b00',
    },
    rose: {
      100: '#ffe2df',
      200: '#ffbdb8',
      500: '#cb3347',
      700: '#9e1d30',
    },
    cyan: {
      100: '#d9fbff',
      200: '#aef5ff',
      300: '#51e7ff',
      400: '#05c9ea',
      500: '#008ca7',
      600: '#006d82',
    },
    info: {
      100: '#d9fbff',
      200: '#aef5ff',
      300: '#51e7ff',
      400: '#05c9ea',
      500: '#008ca7',
      600: '#006d82',
    },
    warn: {
      100: '#fff1bf',
      200: '#ffe693',
      300: '#ffd85c',
      400: '#ffbf00',
      500: '#f0ab00',
      600: '#c88800',
    },
    error: {
      100: '#ffe2df',
      200: '#ffbdb8',
      300: '#ff8f87',
      400: '#f26a63',
      500: '#cb3347',
      600: '#9e1d30',
    },
    success: {
      100: '#dbfaec',
      200: '#b8f3d9',
      300: '#84e8bd',
      400: '#4fd59f',
      500: '#22b77f',
      600: '#159263',
    },
    colorPickerHue: ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000'],
    backgroundPalette: ['#2D3047', '#93B7BE', '#E0CA3C', '#A799B7', '#048A81'],
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
    actionPrimaryPressed: '#1d4ed8',
    actionPrimaryText: '#ffffff',
  },
  gradients: {
    primaryToSecondary: {
      ...gradient45,
      colors: [brandColors.primary, brandColors.secondary],
    },
    primaryToTertiary: {
      ...gradient45,
      colors: [brandColors.primary, brandColors.tertiary],
    },
    secondaryToPrimary: {
      ...gradient45,
      colors: [brandColors.secondary, brandColors.primary],
    },
    secondaryToPrimaryVertical: {
      colors: [0.65, 0.5, 0.3, 0.14, 0.04, 0].map(secondaryOverPrimary),
      locations: [0, 0.2, 0.4, 0.6, 0.8, 1],
      start: { x: 0.5, y: 0 },
      end: { x: 0.5, y: 1 },
    },
    header: headerGradient,
    eventHeader: headerGradient,
  },
  spacing: {
    none: 0,
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
  border: {
    thin: 1,
    medium: 2,
  },
  typography: {
    hero: 32,
    heading: 24,
    body: 16,
    caption: 14,
  },
  layout: {
    wideScreenMinWidth: 768,
    resourceGridPhoneColumns: 3,
    resourceGridWideColumns: 5,
    bottomMainMenuContentHeight: 56,
    verticalVideoAspectRatio: 9 / 16,
    cameraPreviewAspectRatio: 16 / 9,
    carouselSideScale: 0.9,
  },
  opacity: {
    disabled: 0.6,
  },
  layers: {
    floating: 20,
  },
  effects: {
    captureOutsideBlur: 16,
  },
} as const;

export type ThemeMode = 'light' | 'dark';
