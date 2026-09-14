import type { Theme, ThemeId } from '../theme-types'
import { darkFantasy } from './dark-fantasy'
import { cyberpunkNeon } from './cyberpunk-neon'
import { animatedStorybook } from './animated-storybook'
import { brutalist } from './brutalist'
import { cozyPastel } from './cozy-pastel'
import { sciFiHolographic } from './sci-fi-holographic'

export const THEMES: Record<ThemeId, Theme> = {
  'dark-fantasy': darkFantasy,
  'cyberpunk-neon': cyberpunkNeon,
  'animated-storybook': animatedStorybook,
  brutalist,
  'cozy-pastel': cozyPastel,
  'sci-fi-holographic': sciFiHolographic,
}

/** Dark mode by default, per the product brief. */
export const DEFAULT_THEME_ID: ThemeId = 'dark-fantasy'

export const THEME_LIST: Theme[] = Object.values(THEMES)

export { darkFantasy, cyberpunkNeon, animatedStorybook, brutalist, cozyPastel, sciFiHolographic }
