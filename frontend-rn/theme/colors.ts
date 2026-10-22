// SHE SAFE AI — Color System
// Dark shaded lavender background with light royal text and accents.

export const colors = {
  // Primary — light royal violet
  primary: '#A78BFA',
  primaryDark: '#8B5CF6',
  primaryLight: '#2A2340',

  // SOS / Emergency
  sos: '#FF6B7D',
  sosDark: '#E14E63',
  sosLight: '#3A1B26',

  // Backgrounds — dark shaded lavender
  background: '#171324',
  surface: '#221D33',

  // Text — lighter royal shades
  textPrimary: '#EDE8FF',
  textSecondary: '#C3B9E6',
  textMuted: '#938AAE',
  textOnPrimary: '#1A1430',

  // Borders
  border: '#3A3152',
  borderLight: '#2E2740',

  // Status
  success: '#6EE7B7',
  successLight: '#123A30',
  warning: '#FBBF24',
  warningLight: '#3B2E12',
  danger: '#FF8FA3',
  dangerLight: '#3A1B26',

  // Concern Levels
  concernSupport: '#6EE7B7',
  concernSupportingLight: '#123A30',
  concernConcerning: '#FBBF24',
  concernConcerningLight: '#3B2E12',
  concernImmediate: '#FF8FA3',
  concernImmediateLight: '#3A1B26',
} as const;

export type ColorKey = keyof typeof colors;
