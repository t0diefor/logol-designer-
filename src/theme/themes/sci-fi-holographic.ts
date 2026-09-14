import type { Theme } from '../theme-types'

/**
 * Sci-Fi Holographic -- futuristic, translucent, spatial.
 *
 * The most glass-heavy theme: layered translucent panels with cyan/magenta
 * energy borders. Every translucent surface still sits on an opaque dark base,
 * so text contrast is computed against a known colour rather than whatever
 * happens to be behind the panel.
 */
export const sciFiHolographic: Theme = {
  id: 'sci-fi-holographic',
  name: 'Sci-Fi Holographic',
  description: 'Translucent and spatial. Cyan, magenta and layered glass.',
  scheme: 'dark',

  colors: {
    bg: '#04080F',
    bgSubtle: '#08141F',
    bgInset: '#020509',

    surface: '#0A1826',
    surfaceRaised: '#102333',
    surfaceOverlay: '#14293B',

    border: '#1C3A52',
    borderStrong: '#2F6488',

    text: '#EAF7FF',
    textMuted: '#A6C4D8',
    textFaint: '#84A3B8',
    textInverse: '#04121A',

    primary: '#3BD9F0',
    primaryFg: '#04121A',
    primaryHover: '#74E6F7',

    accent: '#E879F9',
    accentFg: '#1A0620',

    success: '#4BE3A2',
    successFg: '#03140C',
    warning: '#F0C04B',
    warningFg: '#1A1303',
    danger: '#FF7085',
    dangerFg: '#1A0308',

    ring: '#3BD9F0',

    glassBg: 'rgba(16, 35, 51, 0.58)',
    glassBorder: 'rgba(59, 217, 240, 0.30)',

    canvas: '#F4FAFF',
    canvasGrid: 'rgba(4, 8, 15, 0.13)',
  },

  fonts: {
    display: "'Exo 2', 'Eurostile', 'Segoe UI', sans-serif",
    body: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    displayWeight: '600',
    displayTracking: '0.02em',
    displayTransform: 'none',
  },

  radii: { sm: '4px', md: '8px', lg: '14px', xl: '20px', pill: '999px' },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.6)',
    md: '0 6px 20px rgba(0, 0, 0, 0.5)',
    lg: '0 24px 56px rgba(0, 0, 0, 0.6)',
    focus: '0 0 0 3px rgba(59, 217, 240, 0.32)',
  },

  motion: {
    style: 'floating',
    fast: 160,
    base: 300,
    slow: 560,
    easing: 'cubic-bezier(0.22, 0.8, 0.28, 1)',
  },

  texture: {
    backgroundImage:
      'linear-gradient(122deg, rgba(59, 217, 240, 0.09) 0%, transparent 34%, rgba(232, 121, 249, 0.09) 68%, transparent 100%), radial-gradient(1000px 560px at 50% -14%, rgba(59, 217, 240, 0.13), transparent 64%)',
    backgroundSize: 'cover',
    opacity: 1,
  },

  components: { borderWidth: '1px', glass: true, glassBlur: 'blur(18px)', lift: true },

  webfont:
    'https://fonts.googleapis.com/css2?family=Exo+2:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
}
