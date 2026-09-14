import type { Theme } from '../theme-types'

/**
 * Animated Storybook -- warm, friendly, expressive, playful.
 *
 * An original warm-paper palette: burnt orange as the action colour against
 * cream, with teal for balance. Deliberately generic-friendly rather than
 * evocative of any particular studio's house style.
 *
 * Note: primary and accent are darkened from their "poster" versions so that
 * white text on top of them clears 4.5:1. Playful must still be readable.
 */
export const animatedStorybook: Theme = {
  id: 'animated-storybook',
  name: 'Animated Storybook',
  description: 'Warm and playful. Cream paper, burnt orange, soft rounded shapes.',
  scheme: 'light',

  colors: {
    bg: '#FFF8EE',
    bgSubtle: '#FBEDDA',
    bgInset: '#F5E3CC',

    surface: '#FFFFFF',
    surfaceRaised: '#FFFDF9',
    surfaceOverlay: '#FFFFFF',

    border: '#E8D5B8',
    borderStrong: '#C9A87C',

    text: '#2F2418',
    textMuted: '#5E4B36',
    textFaint: '#7A6752',
    textInverse: '#FFF8EE',

    primary: '#BE511B',
    primaryFg: '#FFFFFF',
    primaryHover: '#A64414',

    accent: '#1F7A6E',
    accentFg: '#FFFFFF',

    success: '#2E7D46',
    successFg: '#FFFFFF',
    warning: '#8A5A06',
    warningFg: '#FFFFFF',
    danger: '#C02B39',
    dangerFg: '#FFFFFF',

    ring: '#BE511B',

    glassBg: 'rgba(255, 255, 255, 0.74)',
    glassBorder: 'rgba(192, 82, 27, 0.20)',

    canvas: '#FFFFFF',
    canvasGrid: 'rgba(47, 36, 24, 0.12)',
  },

  fonts: {
    display: "'Fredoka', 'Trebuchet MS', 'Segoe UI', sans-serif",
    body: "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    displayWeight: '600',
    displayTracking: '0em',
    displayTransform: 'none',
  },

  radii: { sm: '8px', md: '14px', lg: '20px', xl: '28px', pill: '999px' },

  shadows: {
    sm: '0 1px 2px rgba(94, 75, 54, 0.14)',
    md: '0 6px 16px rgba(94, 75, 54, 0.16)',
    lg: '0 20px 44px rgba(94, 75, 54, 0.20)',
    focus: '0 0 0 4px rgba(192, 82, 27, 0.26)',
  },

  motion: {
    style: 'bouncy',
    fast: 140,
    base: 260,
    slow: 460,
    // Slight overshoot -- the squash-and-stretch feel, kept subtle.
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  texture: {
    backgroundImage:
      'radial-gradient(circle at 1px 1px, rgba(192, 82, 27, 0.07) 1px, transparent 0)',
    backgroundSize: '22px 22px',
    opacity: 1,
  },

  components: { borderWidth: '2px', glass: false, glassBlur: 'blur(10px)', lift: true },

  webfont:
    'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
}
