/**
 * ElevenLabs Design System Theme
 * Terminal-adaptive color palette and design tokens
 */

export const colors = {
  // Text hierarchy - uses terminal's default colors (adapts to light/dark mode)
  text: {
    primary: undefined,  // Terminal's default text color (adapts to theme)
    secondary: 'gray',   // Terminal's gray (adapts to theme)
    muted: 'gray',       // Terminal's gray (adapts to theme)
    disabled: 'gray',    // Terminal's gray (adapts to theme)
  },
  
  // Accent colors - consistent across all terminal themes
  accent: {
    primary: '#7C3AED',
    secondary: '#3B82F6',
  },
  
  // Semantic colors - consistent across all terminal themes
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Border colors - terminal's gray (adapts to theme)
  border: 'gray',
};

export const gradients = {
  // Named gradients for ink-gradient
  retro: 'retro',
  rainbow: 'rainbow',
  pastel: 'pastel',
  summer: 'summer',
  fruit: 'fruit',
  mind: 'mind',
  morning: 'morning',
  vice: 'vice',
  passion: 'passion',
  // Custom ElevenLabs gradient
  elevenlabs: 'passion', // Purple to blue gradient similar to brand
};

export const spacing = {
  xs: 0.5,
  sm: 1,
  md: 2,
  lg: 3,
  xl: 4,
  xxl: 6,
};

export const animation = {
  // Animation durations in ms
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 1000,
  
  // Spinner styles
  spinner: {
    type: 'dots' as const,
    interval: 80,
  },
};

export const ascii = {
  // ASCII characters for borders
  borders: {
    single: 'single',
    double: 'double',
    round: 'round',
    bold: 'bold',
    classic: 'classic',
  },
};

export const typography = {
  // Font sizes (relative to terminal)
  sizes: {
    xs: 0.75,
    sm: 0.875,
    base: 1,
    lg: 1.125,
    xl: 1.25,
    xxl: 1.5,
  },
  
  // BigText fonts for headers
  fonts: {
    header: 'chrome',
    subheader: 'simple',
    accent: 'tiny',
  },
};

export default {
  colors,
  gradients,
  spacing,
  animation,
  ascii,
  typography,
};