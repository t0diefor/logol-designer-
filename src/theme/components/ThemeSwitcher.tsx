import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { THEME_LIST } from '../themes'
import { useThemeStore, type MotionPreference } from '../theme-store'
import type { Theme } from '../theme-types'

/** Four-swatch preview so a theme can be recognised without applying it. */
function ThemePreview({ theme }: { theme: Theme }) {
  return (
    <div
      className="flex h-16 w-full items-end gap-1.5 rounded-md p-2"
      style={{ backgroundColor: theme.colors.bg, border: `1px solid ${theme.colors.border}` }}
      aria-hidden="true"
    >
      <span
        className="h-8 flex-1 rounded-sm"
        style={{ backgroundColor: theme.colors.surface, borderRadius: theme.radii.sm }}
      />
      <span
        className="h-5 w-5 rounded-sm"
        style={{ backgroundColor: theme.colors.primary, borderRadius: theme.radii.sm }}
      />
      <span
        className="h-5 w-5 rounded-sm"
        style={{ backgroundColor: theme.colors.accent, borderRadius: theme.radii.sm }}
      />
    </div>
  )
}

const MOTION_OPTIONS: { value: MotionPreference; label: string; description: string }[] = [
  {
    value: 'system',
    label: 'Match my system',
    description: 'Follows your operating system’s reduced-motion setting.',
  },
  { value: 'full', label: 'Full motion', description: 'All transitions and micro-interactions.' },
  {
    value: 'reduced',
    label: 'Reduced motion',
    description: 'Removes movement. Content still fades in and out.',
  },
]

/**
 * Theme and motion picker.
 *
 * Built on the Modal (native `<dialog>`) rather than a custom dropdown so it
 * gets focus trapping and Escape handling from the platform, and so the
 * previews have room to be legible.
 */
export function ThemeSwitcher({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const themeId = useThemeStore((state) => state.themeId)
  const setTheme = useThemeStore((state) => state.setTheme)
  const motionPreference = useThemeStore((state) => state.motionPreference)
  const setMotionPreference = useThemeStore((state) => state.setMotionPreference)

  const active = THEME_LIST.find((theme) => theme.id === themeId)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface px-3',
          'border-[length:var(--pf-border-width)] text-sm text-ink',
          'transition-colors duration-[var(--pf-duration-fast)] hover:bg-surface-raised',
          className,
        )}
      >
        <Icon name="palette" size={16} />
        <span className="hidden sm:inline">{active?.name ?? 'Theme'}</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Appearance"
        description="Themes apply instantly and are remembered on this device."
        size="lg"
      >
        <fieldset className="border-0 p-0">
          <legend className="mb-3 text-sm font-medium text-ink">Theme</legend>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEME_LIST.map((theme) => {
              const selected = theme.id === themeId
              return (
                <label
                  key={theme.id}
                  className={cn(
                    'cursor-pointer rounded-lg border p-3 text-left',
                    'border-[length:var(--pf-border-width)]',
                    'transition-colors duration-[var(--pf-duration-fast)]',
                    selected
                      ? 'border-primary bg-surface-raised'
                      : 'border-line bg-surface hover:border-line-strong',
                    // Focus lands on the visually hidden radio, so the ring is
                    // drawn on this label instead.
                    'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
                  )}
                >
                  <input
                    type="radio"
                    name="pf-theme"
                    value={theme.id}
                    checked={selected}
                    onChange={() => setTheme(theme.id)}
                    className="sr-only"
                  />
                  <ThemePreview theme={theme} />
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{theme.name}</span>
                    {selected ? (
                      <span className="text-primary">
                        <Icon name="check" size={16} title="Current theme" />
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">{theme.description}</p>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="mt-7 border-0 p-0">
          <legend className="mb-3 text-sm font-medium text-ink">Motion</legend>
          <div className="flex flex-col gap-2">
            {MOTION_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border p-3',
                  'border-[length:var(--pf-border-width)]',
                  'focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring',
                  motionPreference === option.value
                    ? 'border-primary bg-surface-raised'
                    : 'border-line bg-surface hover:border-line-strong',
                )}
              >
                <input
                  type="radio"
                  name="pf-motion"
                  value={option.value}
                  checked={motionPreference === option.value}
                  onChange={() => setMotionPreference(option.value)}
                  className="mt-0.5 accent-[var(--pf-primary)]"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{option.label}</span>
                  <span className="block text-xs text-ink-muted">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Modal>
    </>
  )
}
