import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/theme/theme-provider'

/**
 * Renders a component inside the providers it needs in the real app.
 *
 * Using this rather than bare `render` means tests exercise the same provider
 * stack as production, so provider-level bugs (an infinite store subscription,
 * a missing theme context) show up in tests instead of in the browser.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', ...options }: RenderOptions & { route?: string } = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </ThemeProvider>
    )
  }

  return render(ui, { wrapper: Wrapper, ...options })
}
