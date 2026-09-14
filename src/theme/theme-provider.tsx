import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './theme-context'
import { THEMES } from './themes'
import { themeToCssVars } from './tokens'
import { useThemeStore } from './theme-store'

/** Tracks the OS-level `prefers-reduced-motion` setting, reactively. */
function useSystemReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setPrefersReduced(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return prefersReduced
}

/**
 * Loads a theme's webfont stylesheet the first time that theme is activated.
 *
 * Fonts are loaded per theme rather than all at once, so choosing one theme
 * never costs the user the other five themes' font downloads. Each href is
 * injected at most once and then left in place, making theme switching after
 * the first visit instant.
 */
function useWebfont(href: string | undefined): void {
  useEffect(() => {
    if (!href || typeof document === 'undefined') return
    if (document.querySelector(`link[data-pf-font="${href}"]`)) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.dataset.pfFont = href
    // A font that fails to load is not an error: every theme declares a full
    // fallback stack, so the app stays usable offline or behind a strict CSP.
    link.onerror = () => link.remove()
    document.head.appendChild(link)
  }, [href])
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeId = useThemeStore((state) => state.themeId)
  const motionPreference = useThemeStore((state) => state.motionPreference)
  const systemReducedMotion = useSystemReducedMotion()

  const theme = THEMES[themeId]

  const reducedMotion =
    motionPreference === 'reduced' ||
    (motionPreference === 'system' && systemReducedMotion)

  useWebfont(theme.webfont)

  /*
   * Written in a layout effect so the variables land before the browser
   * paints, which prevents a flash of the previous theme on switch.
   */
  useLayoutEffect(() => {
    const root = document.documentElement
    const vars = themeToCssVars(theme)

    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value)
    }
    root.style.setProperty('--pf-color-scheme', theme.scheme)

    // Exposed as attributes so CSS and tests can target the active theme.
    root.dataset.theme = theme.id
    root.dataset.scheme = theme.scheme
    root.dataset.motionStyle = theme.motion.style
  }, [theme])

  useLayoutEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduced' : 'full'
  }, [reducedMotion])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, reducedMotion }),
    [theme, reducedMotion],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
