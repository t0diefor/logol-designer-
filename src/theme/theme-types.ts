/**
 * PanelForge theme contract.
 *
 * Every visual decision in the app resolves through one of these tokens.
 * Components must never name a raw colour, shadow or duration -- if a value
 * is missing here, add it here rather than hard-coding it at the call site.
 * That rule is what makes six themes maintainable instead of six times the work.
 */

export const THEME_IDS = [
  'dark-fantasy',
  'cyberpunk-neon',
  'animated-storybook',
  'brutalist',
  'cozy-pastel',
  'sci-fi-holographic',
] as const

export type ThemeId = (typeof THEME_IDS)[number]

/**
 * Semantic colour roles. Named by job, not by hue, so a theme can swap the
 * underlying colour without any component changing.
 */
export interface ThemeColors {
  /** Page background, furthest back. */
  bg: string
  /** Slightly differentiated background for rails, wells and inset regions. */
  bgSubtle: string
  /** Recessed areas: inputs, code blocks, track backgrounds. */
  bgInset: string

  /** Default card/panel surface sitting above the background. */
  surface: string
  /** Hovered or elevated surface. */
  surfaceRaised: string
  /** Modals, popovers, menus -- the highest opaque layer. */
  surfaceOverlay: string

  /** Default hairline border. */
  border: string
  /** Emphasised border: focused fields, selected cards, dividers that matter. */
  borderStrong: string

  /** Primary body text. Must hit >= 4.5:1 against bg and surface. */
  text: string
  /** Secondary text: descriptions, metadata. Must hit >= 4.5:1 for body sizes. */
  textMuted: string
  /** Tertiary text: timestamps, hints. Large or non-essential text only. */
  textFaint: string
  /** Text placed on primary/accent fills. */
  textInverse: string

  /** Main brand action colour. */
  primary: string
  /** Text/icon colour on top of `primary`. */
  primaryFg: string
  /** Hover state for primary fills. */
  primaryHover: string

  /** Secondary emphasis colour, used for highlights and active nav. */
  accent: string
  /** Text/icon colour on top of `accent`. */
  accentFg: string

  success: string
  successFg: string
  warning: string
  warningFg: string
  danger: string
  dangerFg: string

  /** Focus ring. Must be visible against both bg and surface. */
  ring: string

  /** Translucent fill for glass surfaces. Kept separate so glass can be tuned per theme. */
  glassBg: string
  /** Border for glass surfaces. */
  glassBorder: string

  /** The comic page surface in the composer -- usually paper-like, even in dark themes. */
  canvas: string
  /** Grid/guide lines drawn on the composer canvas. */
  canvasGrid: string
}

export interface ThemeFonts {
  /** Headings and display type. */
  display: string
  /** Body copy and UI labels. Readability outranks personality here. */
  body: string
  /** Code, IDs, measurements. */
  mono: string
  /** Applied to display text only. */
  displayWeight: string
  displayTracking: string
  /** 'none' | 'uppercase' -- some themes shout, most do not. */
  displayTransform: 'none' | 'uppercase'
}

export interface ThemeRadii {
  sm: string
  md: string
  lg: string
  xl: string
  pill: string
}

export interface ThemeShadows {
  sm: string
  md: string
  lg: string
  /** Applied alongside the focus ring for themes that want extra emphasis. */
  focus: string
}

/**
 * Motion personality. `style` drives which Framer Motion variant set a
 * component reaches for; the durations scale the whole system at once.
 * All of it is overridden to ~0 when the user prefers reduced motion.
 */
export type MotionStyle = 'ritual' | 'snappy' | 'bouncy' | 'mechanical' | 'soothing' | 'floating'

export interface ThemeMotion {
  style: MotionStyle
  /** Milliseconds. */
  fast: number
  base: number
  slow: number
  /** CSS easing used for non-Framer transitions. */
  easing: string
}

/**
 * Optional decorative layer painted behind the app. Kept as plain CSS so it
 * costs nothing at runtime, and kept low-contrast so it can never interfere
 * with text legibility.
 */
export interface ThemeTexture {
  /** CSS `background-image` value, or 'none'. */
  backgroundImage: string
  /** CSS `background-size` value. */
  backgroundSize: string
  /** 0-1. Themes that want no texture use 0. */
  opacity: number
}

export interface ThemeComponentStyle {
  /** Border width on cards and controls, e.g. '1px' or '3px' for brutalist. */
  borderWidth: string
  /** Whether translucent glass surfaces are used at all in this theme. */
  glass: boolean
  /** backdrop-filter value applied to glass surfaces. */
  glassBlur: string
  /** Whether buttons/cards lift on hover. Brutalist deliberately does not. */
  lift: boolean
}

export interface Theme {
  id: ThemeId
  /** Human-readable name shown in the theme switcher. */
  name: string
  /** One line describing the mood, shown under the name. */
  description: string
  /** Drives the CSS `color-scheme` property so native widgets match. */
  scheme: 'dark' | 'light'
  colors: ThemeColors
  fonts: ThemeFonts
  radii: ThemeRadii
  shadows: ThemeShadows
  motion: ThemeMotion
  texture: ThemeTexture
  components: ThemeComponentStyle
  /**
   * Optional webfont stylesheet loaded only when this theme is activated,
   * so picking one theme never costs you the other five themes' fonts.
   */
  webfont?: string
}
