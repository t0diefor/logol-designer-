import type { Theme } from '../theme-types'

/**
 * Cyberpunk Neon -- neon futurism, high-tech, energetic.
 *
 * Cyan is the action colour, hot pink the accent. Glow is applied only to
 * focus rings and the primary action, never to every surface -- a page where
 * everything glows reads as noise and nothing stands out.
 */
export const cyberpunkNeon: Theme = {
  id: 'cyberpunk-neon',
  name: 'Cyberpunk Neon',
  description: 'Neon futurism. Electric cyan, hot pink, dark HUD surfaces.',
  scheme: 'dark',

  colors: {
    bg: '#05070D',
    bgSubtle: '#0A0F1C',
    bgInset: '#03050A',

    surface: '#0D1524',
    surfaceRaised: '#142036',
    surfaceOverlay: '#17263F',

    border: '#1E3355',
    borderStrong: '#2F5380',

    text: '#E6F6FF',
    textMuted: '#9FBCD4',
    textFaint: '#7C9AB4',
    textInverse: '#04121A',

    primary: '#2DE2FF',
    primaryFg: '#04121A',
    primaryHover: '#6DEDFF',

    accent: '#FF4D96',
    accentFg: '#14020A',

    success: '#39FF87',
    successFg: '#04140A',
    warning: '#FFC53D',
    warningFg: '#1A1201',
    danger: '#FF6B7A',
    dangerFg: '#1A0207',

    ring: '#2DE2FF',

    glassBg: 'rgba(20, 32, 54, 0.66)',
    glassBorder: 'rgba(45, 226, 255, 0.26)',

    canvas: '#F2F5F8',
    canvasGrid: 'rgba(5, 7, 13, 0.14)',
  },

  fonts: {
    display: "'Chakra Petch', 'Eurostile', 'Segoe UI', sans-serif",
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    displayWeight: '600',
    displayTracking: '0.04em',
    displayTransform: 'uppercase',
  },

  radii: { sm: '2px', md: '4px', lg: '6px', xl: '10px', pill: '999px' },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.7)',
    md: '0 4px 16px rgba(0, 0, 0, 0.6)',
    lg: '0 20px 48px rgba(0, 0, 0, 0.7)',
    focus: '0 0 0 3px rgba(45, 226, 255, 0.35)',
  },

  motion: {
    style: 'snappy',
    fast: 110,
    base: 200,
    slow: 360,
    easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)',
  },

  // Horizontal scanlines at very low contrast, plus two distant neon pools.
  texture: {
    backgroundImage:
      'repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0px, rgba(255, 255, 255, 0.022) 1px, transparent 1px, transparent 3px), radial-gradient(900px 520px at 84% -8%, rgba(255, 77, 150, 0.12), transparent 62%), radial-gradient(900px 560px at 6% 4%, rgba(45, 226, 255, 0.10), transparent 60%)',
    backgroundSize: 'auto, cover, cover',
    opacity: 1,
  },

  components: { borderWidth: '1px', glass: true, glassBlur: 'blur(12px)', lift: true },

  webfont:
    'https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
}
