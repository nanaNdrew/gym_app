/**
 * Shared dark-theme design tokens.
 * Deep slate surfaces, crisp white type, emerald for success states.
 */
export const colors = {
  /** App background — deep slate. */
  bg: '#0F172A',
  /** Card / panel surface. */
  surface: '#1E293B',
  /** Slightly raised surface (inputs, chips). */
  surfaceAlt: '#283548',
  /** Hairline borders and dividers. */
  border: '#334155',
  /** Primary text. */
  text: '#F8FAFC',
  /** Secondary / muted text. */
  textMuted: '#94A3B8',
  /** Success — completed sets, primary actions. */
  emerald: '#10B981',
  /** Translucent emerald fill for selected states. */
  emeraldSoft: 'rgba(16, 185, 129, 0.16)',
  /** Partial / failed-set amber. */
  amber: '#F59E0B',
  /** Translucent amber fill. */
  amberSoft: 'rgba(245, 158, 11, 0.16)',
  /** Destructive actions. */
  danger: '#F43F5E',
} as const;

/** Minimum touch target (dp) for gym-friendly tapping. */
export const TOUCH_TARGET = 48;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;
