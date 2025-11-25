// Liquid Glass Design System - Sophisticated & Professional

export const Colors = {
  // Primary palette - Sophisticated blues & greys
  primary: '#3B82F6',        // Clean blue
  primaryDark: '#2563EB',    // Deeper blue
  primaryLight: '#60A5FA',   // Light blue accent
  
  // Neutral palette - Professional greys
  background: '#FFFFFF',      // Clean white
  surface: '#F8FAFC',        // Subtle grey
  surfaceElevated: '#FFFFFF', // White cards
  
  // Text hierarchy
  text: '#0F172A',           // Near black
  textSecondary: '#475569',  // Medium grey
  textTertiary: '#94A3B8',   // Light grey
  
  // Glass effects
  glassLight: 'rgba(255, 255, 255, 0.9)',
  glassDark: 'rgba(15, 23, 42, 0.05)',
  glassBorder: 'rgba(15, 23, 42, 0.08)',
  
  // Accent colors - Refined
  success: '#22c55e',        // Gamification green (#22c55e)
  successDark: '#16a34a',    // Darker green
  successLight: '#4ade80',  // Lighter green
  warning: '#F59E0B',        // Refined amber
  error: '#EF4444',          // Refined red
  info: '#3B82F6',           // Clean blue
  
  // Gamification - Subtle & sophisticated
  streak: '#F59E0B',         // Refined gold
  xp: '#3B82F6',             // Clean blue
  gold: '#F59E0B',           // Refined gold
  silver: '#94A3B8',         // Elegant silver
  
  // Overlay
  overlay: 'rgba(15, 23, 42, 0.4)',
  overlayLight: 'rgba(15, 23, 42, 0.2)',
};

export const Typography = {
  // Refined type scale
  displayLarge: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '600' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  title: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  headline: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.2,
    color: Colors.text,
  },
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 24,
    letterSpacing: 0,
    color: Colors.text,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0,
    color: Colors.textSecondary,
  },
  caption: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0,
    color: Colors.textTertiary,
  },
  label: {
    fontSize: 15,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
    color: Colors.textSecondary,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  xl: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Sophisticated gradients - subtle and professional
export const Gradients = {
  primary: ['#3B82F6', '#2563EB'],           // Blue gradient
  subtle: ['#F8FAFC', '#F1F5F9'],           // Grey gradient
  glass: ['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)'], // Glass effect
  overlay: ['rgba(15,23,42,0)', 'rgba(15,23,42,0.4)'], // Dark overlay
};
