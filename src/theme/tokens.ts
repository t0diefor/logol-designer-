import type { Theme } from './theme-types'

/**
 * Scales that stay constant across every theme.
 *
 * Themes change colour, personality and roundness. They do not change the
 * rhythm of the layout -- keeping spacing and type scale fixed is what stops
 * six themes from becoming six different products.
 */

/** 4px base unit. Every margin, padding and gap should be a step on this scale. */
export const SPACING = {
  0: '0px',
  px: '1px',
  1: '0.25rem', //  4px
  2: '0.5rem', //  8px
  3: '0.75rem', // 12px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  8: '2rem', // 32px
  10: '2.5rem', // 40px
  12: '3rem', // 48px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
} as const

/**
 * Type scale, roughly a 1.2 minor-third ramp.
 * `size` is the font-size, `lh` the matching line-height.
 */
export const TYPE_SCALE = {
  xs: { size: '0.75rem', lh: '1rem' }, // 12/16 - metadata, badges
  sm: { size: '0.875rem', lh: '1.25rem' }, // 14/20 - secondary UI text
  base: { size: '1rem', lh: '1.5rem' }, // 16/24 - body copy
  lg: { size: '1.125rem', lh: '1.75rem' }, // 18/28 - lead paragraphs
  xl: { size: '1.375rem', lh: '1.875rem' }, // 22/30 - card titles
  '2xl': { size: '1.75rem', lh: '2.25rem' }, // 28/36 - section headings
  '3xl': { size: '2.25rem', lh: '2.625rem' }, // 36/42 - page titles
  '4xl': { size: '3rem', lh: '3.25rem' }, // 48/52 - hero
} as const

/**
 * Responsive breakpoints. Desktop is the primary target, but every screen
 * must remain usable down to 360px.
 */
export const BREAKPOINTS = {
  sm: '640px', // large phone
  md: '768px', // tablet portrait -- sidebar collapses below this
  lg: '1024px', // tablet landscape / small laptop
  xl: '1280px', // desktop
  '2xl': '1600px', // wide desktop
} as const

/** Stacking order. Centralised so overlays never fight each other. */
export const Z_INDEX = {
  base: 0,
  canvasOverlay: 10,
  stickyHeader: 20,
  sidebar: 30,
  drawer: 40,
  dropdown: 50,
  modal: 60,
  toast: 70,
} as const

/**
 * Flattens a Theme object into the CSS custom properties the stylesheet reads.
 *
 * Every key here has a matching `--color-*` / `--radius-*` entry in global.css
 * so Tailwind utilities such as `bg-surface` resolve to the active theme.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  const { colors: c, fonts: f, radii: r, shadows: s, motion: m, texture: t, components: k } = theme

  return {
    '--pf-bg': c.bg,
    '--pf-bg-subtle': c.bgSubtle,
    '--pf-bg-inset': c.bgInset,

    '--pf-surface': c.surface,
    '--pf-surface-raised': c.surfaceRaised,
    '--pf-surface-overlay': c.surfaceOverlay,

    '--pf-border': c.border,
    '--pf-border-strong': c.borderStrong,

    '--pf-text': c.text,
    '--pf-text-muted': c.textMuted,
    '--pf-text-faint': c.textFaint,
    '--pf-text-inverse': c.textInverse,

    '--pf-primary': c.primary,
    '--pf-primary-fg': c.primaryFg,
    '--pf-primary-hover': c.primaryHover,

    '--pf-accent': c.accent,
    '--pf-accent-fg': c.accentFg,

    '--pf-success': c.success,
    '--pf-success-fg': c.successFg,
    '--pf-warning': c.warning,
    '--pf-warning-fg': c.warningFg,
    '--pf-danger': c.danger,
    '--pf-danger-fg': c.dangerFg,

    '--pf-ring': c.ring,
    '--pf-glass-bg': c.glassBg,
    '--pf-glass-border': c.glassBorder,

    '--pf-canvas': c.canvas,
    '--pf-canvas-grid': c.canvasGrid,

    '--pf-font-display': f.display,
    '--pf-font-body': f.body,
    '--pf-font-mono': f.mono,
    '--pf-display-weight': f.displayWeight,
    '--pf-display-tracking': f.displayTracking,
    '--pf-display-transform': f.displayTransform,

    '--pf-radius-sm': r.sm,
    '--pf-radius-md': r.md,
    '--pf-radius-lg': r.lg,
    '--pf-radius-xl': r.xl,
    '--pf-radius-pill': r.pill,

    '--pf-shadow-sm': s.sm,
    '--pf-shadow-md': s.md,
    '--pf-shadow-lg': s.lg,
    '--pf-shadow-focus': s.focus,

    '--pf-duration-fast': `${m.fast}ms`,
    '--pf-duration-base': `${m.base}ms`,
    '--pf-duration-slow': `${m.slow}ms`,
    '--pf-easing': m.easing,

    '--pf-texture-image': t.backgroundImage,
    '--pf-texture-size': t.backgroundSize,
    '--pf-texture-opacity': String(t.opacity),

    '--pf-border-width': k.borderWidth,
    '--pf-glass-blur': k.glass ? k.glassBlur : 'none',
  }
}
