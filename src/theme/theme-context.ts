import { createContext } from 'react'
import type { Theme } from './theme-types'

export interface ThemeContextValue {
  theme: Theme
  /** True when animation should be suppressed, from either the OS or Settings. */
  reducedMotion: boolean
}

/**
 * Lives in its own module rather than beside ThemeProvider so that the
 * provider file exports only components, which is what React Fast Refresh
 * needs in order to hot-reload it without dropping state.
 */
export const ThemeContext = createContext<ThemeContextValue | null>(null)
