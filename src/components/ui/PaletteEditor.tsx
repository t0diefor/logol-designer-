import { useState } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'
import { hexColorSchema, type Palette } from '@/types/common'

export interface PaletteEditorProps {
  value: Palette
  onChange: (palette: Palette) => void
  max?: number
}

/**
 * Colour palette editor.
 *
 * Uses the native colour input, which brings the OS picker, keyboard support
 * and (on most platforms) an eyedropper for free. The hex is shown as text
 * beside each swatch because that is the value an artist actually copies into
 * their own tool.
 */
export function PaletteEditor({ value, onChange, max = 8 }: PaletteEditorProps) {
  const [draft, setDraft] = useState('#7B4FA8')

  const colors = value.colors

  function setColor(index: number, hex: string) {
    onChange({ ...value, colors: colors.map((color, i) => (i === index ? hex : color)) })
  }

  function addColor() {
    if (colors.length >= max) return
    if (!hexColorSchema.safeParse(draft).success) return
    onChange({ ...value, colors: [...colors, draft] })
  }

  return (
    <div className="flex flex-col gap-3">
      {colors.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {colors.map((color, index) => (
            <li key={`${color}-${index}`} className="flex flex-col items-center gap-1">
              <div className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(event) => setColor(index, event.target.value)}
                  aria-label={`Palette colour ${index + 1}, currently ${color}`}
                  className={cn(
                    'h-12 w-12 cursor-pointer rounded-md border border-line bg-transparent p-0.5',
                    'border-[length:var(--pf-border-width)]',
                  )}
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...value, colors: colors.filter((_, i) => i !== index) })}
                  aria-label={`Remove colour ${color}`}
                  className={cn(
                    'absolute -right-1.5 -top-1.5 rounded-pill border border-line bg-surface p-0.5',
                    'text-ink-faint hover:text-danger',
                  )}
                >
                  <Icon name="close" size={11} />
                </button>
              </div>
              <code className="text-[10px] text-ink-faint">{color.toUpperCase()}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-faint">
          No colours yet. A fixed palette keeps a character consistent across colourists.
        </p>
      )}

      {colors.length < max ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Choose a colour to add"
            className="h-9 w-12 cursor-pointer rounded-md border border-line bg-transparent p-0.5"
          />
          <button
            type="button"
            onClick={addColor}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-surface px-3',
              'border-[length:var(--pf-border-width)] text-sm text-ink hover:bg-surface-raised',
            )}
          >
            <Icon name="plus" size={15} />
            Add colour
          </button>
        </div>
      ) : null}
    </div>
  )
}
