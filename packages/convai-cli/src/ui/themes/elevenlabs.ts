/**
 * ElevenLabs Design System Theme
 * Minimalist, refined color palette and design tokens
 */

export const colors = {
  // Primary palette - Deep blacks and whites
  background: '#000000',
  surface: '#0A0A0A',
  surfaceLight: '#141414',
  border: '#1F1F1F',
  borderLight: '#2A2A2A',
  
  // Text hierarchy
  text: {
    primary: '#FFFFFF',
    secondary: '#A0A0A0',
    muted: '#666666',
    disabled: '#404040',
  },
  
  // Accent colors - ElevenLabs signature gradients
  accent: {
    primary: '#7C3AED', // Purple
    secondary: '#3B82F6', // Blue
    gradient: {
      start: '#7C3AED',
      middle: '#5B21B6',
      end: '#3B82F6',
    },
  },
  
  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Sound Flow inspired colors
  soundFlow: {
    wave1: '#7C3AED',
    wave2: '#5B21B6',
    wave3: '#3B82F6',
    wave4: '#2563EB',
  },
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
  // ASCII characters for patterns and borders
  borders: {
    single: 'single',
    double: 'double',
    round: 'round',
    bold: 'bold',
    classic: 'classic',
  },
  
  // Chladni-inspired pattern characters
  patterns: {
    wave: '~',
    dot: '·',
    circle: '○',
    filledCircle: '●',
    diamond: '◆',
    star: '✦',
    plus: '+',
    cross: '×',
    line: '─',
    verticalLine: '│',
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