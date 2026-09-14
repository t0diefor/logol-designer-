import type { Theme } from '../theme-types'

/**
 * Dark Fantasy -- gothic, arcane, atmospheric.
 *
 * Parchment-toned text on near-black, with muted purple as the action colour
 * and tarnished gold reserved for emphasis. The fog texture is deliberately
 * near-invisible: atmosphere should never cost legibility.
 */
export const darkFantasy: Theme = {
  id: 'dark-fantasy',
  name: 'Dark Fantasy',
  description: 'Gothic and arcane. Parchment on black, gold on purple.',
  scheme: 'dark',

  colors: {
    bg: '#0B0A0F',
    bgSubtle: '#12101A',
    bgInset: '#070609',

    surface: '#16131F',
    surfaceRaised: '#1E1A29',
    surfaceOverlay: '#241F31',

    border: '#2E2740',
    borderStrong: '#4A3F63',

    text: '#EDE6D6',
    textMuted: '#B8AC96',
    textFaint: '#94886F',
    textInverse: '#0B0A0F',

    primary: '#9167BC',
    primaryFg: '#0B0612',
    primaryHover: '#A277CC',

    accent: '#C9A227',
    accentFg: '#1A1405',

    success: '#6FBF7F',
    successFg: '#07160A',
    warning: '#D9A441',
    warningFg: '#1A1204',
    danger: '#E05A62',
    dangerFg: '#1A0406',

    ring: '#C9A227',

    glassBg: 'rgba(30, 26, 41, 0.72)',
    glassBorder: 'rgba(201, 162, 39, 0.22)',

    canvas: '#EFE7D6',
    canvasGrid: 'rgba(11, 10, 15, 0.12)',
  },

  fonts: {
    display: "'Cinzel', 'Iowan Old Style', Georgia, serif",
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    displayWeight: '600',
    displayTracking: '0.02em',
    displayTransform: 'none',
  },

  radii: { sm: '3px', md: '5px', lg: '8px', xl: '12px', pill: '999px' },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.6)',
    md: '0 4px 14px rgba(0, 0, 0, 0.55)',
    lg: '0 18px 46px rgba(0, 0, 0, 0.62)',
    focus: '0 0 0 4px rgba(201, 162, 39, 0.22)',
  },

  motion: {
    style: 'ritual',
    fast: 180,
    base: 320,
    slow: 620,
    easing: 'cubic-bezier(0.36, 0.04, 0.22, 1)',
  },

  // A faint pool of violet light, top-left. Opacity is low enough that text
  // contrast is unaffected anywhere on the page.
  texture: {
    backgroundImage:
      'radial-gradient(1100px 620px at 12% -12%, rgba(145, 103, 188, 0.16), transparent 62%), radial-gradient(820px 520px at 88% 8%, rgba(201, 162, 39, 0.07), transparent 60%)',
    backgroundSize: 'cover',
    opacity: 1,
  },

  components: { borderWidth: '1px', glass: true, glassBlur: 'blur(14px)', lift: true },

  webfont:
    'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap',
}
