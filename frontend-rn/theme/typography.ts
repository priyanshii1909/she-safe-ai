// SHE SAFE AI — Typography System
// Uses system fonts for native feel

import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  // Headings
  h1: {
    fontSize: 28,
    fontWeight: '700',
    color: '#EDE8FF',
    lineHeight: 36,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EDE8FF',
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EDE8FF',
    lineHeight: 28,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EDE8FF',
    lineHeight: 24,
  },

  // Body
  body: {
    fontSize: 14,
    color: '#EDE8FF',
    lineHeight: 22,
  },
  bodyLarge: {
    fontSize: 16,
    color: '#EDE8FF',
    lineHeight: 24,
  },

  // Secondary
  caption: {
    fontSize: 12,
    color: '#C3B9E6',
    lineHeight: 18,
  },
  small: {
    fontSize: 11,
    color: '#938AAE',
    lineHeight: 16,
  },

  // Buttons
  button: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonLarge: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
};
