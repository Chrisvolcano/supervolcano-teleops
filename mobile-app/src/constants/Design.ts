export const Colors = {
  // Primary - Vibrant gradient palette
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  primaryGradient: ['#8B5CF6', '#6366F1', '#3B82F6'],
  
  // Accent - Multiple accent colors for variety
  accent: '#06B6D4',
  accentPink: '#EC4899',
  accentOrange: '#F59E0B',
  accentGreen: '#10B981',
  accentPurple: '#A855F7',
  
  // Background - Sophisticated light theme
  background: '#FAFAFA',
  backgroundSecondary: '#F5F5F7',
  backgroundTertiary: '#EFEFF0',
  
  // Surface with depth
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  surfaceGlass: 'rgba(255, 255, 255, 0.7)',
  
  // Text hierarchy
  textPrimary: '#1D1D1F',
  textSecondary: '#6E6E73',
  textTertiary: '#86868B',
  textQuaternary: '#AEAEB2',
  
  // Status with gradients
  success: '#10B981',
  successGradient: ['#10B981', '#059669'],
  warning: '#F59E0B',
  warningGradient: ['#F59E0B', '#D97706'],
  error: '#EF4444',
  errorGradient: ['#EF4444', '#DC2626'],
  
  // Priority badges
  priorityHigh: '#FEE2E2',
  priorityHighText: '#991B1B',
  priorityMedium: '#FEF3C7',
  priorityMediumText: '#92400E',
  priorityLow: '#DCFCE7',
  priorityLowText: '#166534',
  
  // Gamification
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  streak: '#FF6B6B',
  xp: '#4ECDC4',
  
  // Special effects
  shimmer: 'rgba(255, 255, 255, 0.5)',
  glow: 'rgba(99, 102, 241, 0.3)',
  
  // Borders
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  
  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const Typography = {
  // Display
  displayLarge: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  
  // Title
  titleLarge: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  titleMedium: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  titleSmall: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  
  // Body
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
  
  // Label
  labelLarge: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const Gradients = {
  primary: ['#8B5CF6', '#6366F1'],
  secondary: ['#06B6D4', '#3B82F6'],
  success: ['#10B981', '#059669'],
  sunset: ['#FF6B6B', '#FFE66D'],
  ocean: ['#2E3192', '#1BFFFF'],
  fire: ['#FF0080', '#FF8C00'],
  purple: ['#667EEA', '#764BA2'],
  mesh: ['#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'],
};

export const Animations = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  gentle: {
    damping: 20,
    stiffness: 90,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 1,
  },
};

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
};

