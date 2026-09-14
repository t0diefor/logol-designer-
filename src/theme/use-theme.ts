import { useContext } from 'react'
import { ThemeContext, type ThemeContextValue } from './theme-context'

/**
 * Reads the active theme and the resolved reduced-motion flag.
 * Throws rather than returning a default, so a component rendered outside the
 * provider fails loudly in development instead of silently looking wrong.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used inside <ThemeProvider>')
  }
  return context
}
