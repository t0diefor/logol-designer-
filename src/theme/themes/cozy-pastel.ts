import type { Theme } from '../theme-types'

/**
 * Cozy Pastel -- soft, comforting, creative, calm.
 *
 * Pastels carry the surfaces; the text and action colours are deepened
 * versions of the same hues so the theme stays gentle without any pastel-on-
 * pastel contrast failures. Motion is the slowest of the six.
 */
export const cozyPastel: Theme = {
  id: 'cozy-pastel',
  name: 'Cozy Pastel',
  description: 'Soft and comforting. Pastel pink, mint and baby blue.',
  scheme: 'light',

  colors: {
    bg: '#FDF7FA',
    bgSubtle: '#F6EAF1',
    bgInset: '#EFDDE8',

    surface: '#FFFFFF',
    surfaceRaised: '#FFFBFD',
    surfaceOverlay: '#FFFFFF',

    border: '#EBD3E1',
    borderStrong: '#D2A7C0',

    text: '#3A2E38',
    textMuted: '#665160',
    textFaint: '#836D7C',
    textInverse: '#FFFFFF',

    primary: '#A8447A',
    primaryFg: '#FFFFFF',
    primaryHover: '#8E3465',

    accent: '#1F7D74',
    accentFg: '#FFFFFF',

    success: '#2F7A50',
    successFg: '#FFFFFF',
    warning: '#8A5A0A',
    warningFg: '#FFFFFF',
    danger: '#B83A50',
    dangerFg: '#FFFFFF',

    ring: '#A8447A',

    glassBg: 'rgba(255, 255, 255, 0.78)',
    glassBorder: 'rgba(168, 68, 122, 0.18)',

    canvas: '#FFFFFF',
    canvasGrid: 'rgba(58, 46, 56, 0.11)',
  },

  fonts: {
    display: "'Quicksand', 'Trebuchet MS', 'Segoe UI', sans-serif",
    body: "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    displayWeight: '600',
    displayTracking: '0em',
    displayTransform: 'none',
  },

  radii: { sm: '10px', md: '16px', lg: '22px', xl: '30px', pill: '999px' },

  shadows: {
    // Warm-tinted rather than neutral grey, so shadows feel soft not dirty.
    sm: '0 1px 3px rgba(150, 110, 135, 0.16)',
    md: '0 6px 18px rgba(150, 110, 135, 0.18)',
    lg: '0 22px 48px rgba(150, 110, 135, 0.22)',
    focus: '0 0 0 4px rgba(168, 68, 122, 0.24)',
  },

  motion: {
    style: 'soothing',
    fast: 200,
    base: 380,
    slow: 700,
    easing: 'cubic-bezier(0.33, 0, 0.2, 1)',
  },

  texture: {
    backgroundImage:
      'radial-gradient(900px 500px at 100% 0%, rgba(168, 68, 122, 0.07), transparent 60%), radial-gradient(760px 460px at 0% 12%, rgba(31, 125, 116, 0.06), transparent 58%)',
    backgroundSize: 'cover',
    opacity: 1,
  },

  components: { borderWidth: '1px', glass: true, glassBlur: 'blur(10px)', lift: true },

  webfont:
    'https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&family=Nunito:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
}
