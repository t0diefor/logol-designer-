import type { Theme } from '../theme-types'

/**
 * Brutalist -- raw, architectural, direct.
 *
 * Grayscale with a single orange accent, zero radius, 3px black borders and
 * almost no motion. Hover lifts are switched off on purpose: this theme states
 * structure rather than suggesting depth.
 *
 * Deviation from a pure reading of the brief: display type and UI labels are
 * monospaced, but long-form prose (story editor, notes) uses a sans face.
 * Monospace at paragraph length measurably slows reading, and this app is
 * partly a writing tool. The monospace character stays where it is seen most.
 */
export const brutalist: Theme = {
  id: 'brutalist',
  name: 'Brutalist',
  description: 'Raw and architectural. Grayscale, hard edges, one loud accent.',
  scheme: 'light',

  colors: {
    bg: '#F2F2F0',
    bgSubtle: '#E4E4E1',
    bgInset: '#D8D8D4',

    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    surfaceOverlay: '#FFFFFF',

    border: '#111111',
    borderStrong: '#000000',

    text: '#0A0A0A',
    textMuted: '#3A3A3A',
    textFaint: '#5E5E5E',
    textInverse: '#FFFFFF',

    primary: '#111111',
    primaryFg: '#FFFFFF',
    primaryHover: '#000000',

    accent: '#C63A00',
    accentFg: '#FFFFFF',

    success: '#1F6B34',
    successFg: '#FFFFFF',
    warning: '#7A5200',
    warningFg: '#FFFFFF',
    danger: '#B3261E',
    dangerFg: '#FFFFFF',

    ring: '#C63A00',

    glassBg: 'rgba(255, 255, 255, 0.92)',
    glassBorder: '#111111',

    canvas: '#FFFFFF',
    canvasGrid: 'rgba(10, 10, 10, 0.16)',
  },

  fonts: {
    display: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    body: "'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    displayWeight: '600',
    displayTracking: '-0.01em',
    displayTransform: 'uppercase',
  },

  radii: { sm: '0px', md: '0px', lg: '0px', xl: '0px', pill: '0px' },

  shadows: {
    // Hard offset shadows, no blur -- the only kind this theme permits.
    sm: '2px 2px 0 #111111',
    md: '4px 4px 0 #111111',
    lg: '8px 8px 0 #111111',
    focus: '0 0 0 4px rgba(198, 58, 0, 0.30)',
  },

  motion: {
    style: 'mechanical',
    fast: 80,
    base: 120,
    slow: 200,
    easing: 'linear',
  },

  texture: { backgroundImage: 'none', backgroundSize: 'auto', opacity: 0 },

  components: { borderWidth: '3px', glass: false, glassBlur: 'none', lift: false },

  webfont:
    'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
}
