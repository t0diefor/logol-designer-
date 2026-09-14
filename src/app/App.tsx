import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/theme/theme-provider'
import { router } from './router'

/**
 * Application root.
 *
 * ThemeProvider wraps the router so that theme tokens are applied before any
 * route renders, and so a theme change never remounts the routed tree.
 */
export function App() {
  return (
    <ThemeProvider>
      {/* Lets keyboard users jump past the nav; visible only when focused. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        Skip to main content
      </a>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
