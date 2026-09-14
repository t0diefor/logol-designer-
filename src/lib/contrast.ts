/**
 * WCAG 2.1 relative-luminance and contrast-ratio maths.
 *
 * Used by the theme contrast test so that accessibility is enforced by CI
 * rather than by anyone remembering to squint at a screenshot.
 */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Parses `#rgb`, `#rrggbb` or `rgba(r, g, b, a)`. Returns null if unparseable. */
export function parseColor(input: string): Rgb | null {
  const value = input.trim()

  const hexMatch = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)
  if (hexMatch) {
    const hex = hexMatch[1]!
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0]! + hex[0]!, 16),
        g: parseInt(hex[1]! + hex[1]!, 16),
        b: parseInt(hex[2]! + hex[2]!, 16),
      }
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    }
  }

  const rgbMatch = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(value)
  if (rgbMatch) {
    return { r: Number(rgbMatch[1]), g: Number(rgbMatch[2]), b: Number(rgbMatch[3]) }
  }

  return null
}

/** WCAG relative luminance of an sRGB colour. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (raw: number): number => {
    const c = raw / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/**
 * Contrast ratio between two colours, from 1 (identical) to 21 (black/white).
 * WCAG AA needs 4.5 for body text, 3.0 for large text and UI boundaries.
 */
export function contrastRatio(foreground: string, background: string): number {
  const fg = parseColor(foreground)
  const bg = parseColor(background)
  if (!fg || !bg) return 0

  const lighter = Math.max(relativeLuminance(fg), relativeLuminance(bg))
  const darker = Math.min(relativeLuminance(fg), relativeLuminance(bg))
  return (lighter + 0.05) / (darker + 0.05)
}

export const WCAG_AA_BODY = 4.5
export const WCAG_AA_LARGE = 3
