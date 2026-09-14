import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { THEME_IDS, type ThemeId } from './theme-types'
import { DEFAULT_THEME_ID } from './themes'

/**
 * How much animation the user wants.
 * - `system` defers to the OS `prefers-reduced-motion` setting (the default).
 * - `full` and `reduced` are explicit overrides chosen in Settings.
 */
export type MotionPreference = 'system' | 'full' | 'reduced'

interface ThemeState {
  themeId: ThemeId
  motionPreference: MotionPreference
  setTheme: (id: ThemeId) => void
  setMotionPreference: (preference: MotionPreference) => void
}

/** Guards against a stale or hand-edited value in localStorage. */
function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
}

/**
 * Theme preferences live in localStorage rather than IndexedDB: they are tiny,
 * and they must be readable synchronously on first paint to avoid a flash of
 * the wrong theme.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME_ID,
      motionPreference: 'system',
      setTheme: (id) => set({ themeId: id }),
      setMotionPreference: (preference) => set({ motionPreference: preference }),
    }),
    {
      name: 'panelforge.theme',
      version: 1,
      merge: (persisted, current) => {
        const saved = persisted as Partial<ThemeState> | undefined
        return {
          ...current,
          themeId: isThemeId(saved?.themeId) ? saved.themeId : current.themeId,
          motionPreference:
            saved?.motionPreference === 'full' ||
            saved?.motionPreference === 'reduced' ||
            saved?.motionPreference === 'system'
              ? saved.motionPreference
              : current.motionPreference,
        }
      },
    },
  ),
)
