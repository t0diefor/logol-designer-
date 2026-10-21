/**
 * Word wrapping for SVG text.
 *
 * Why this exists at all: SVG has no text wrapping. The usual escape hatch is
 * `<foreignObject>` with HTML inside, which Safari rasterises inconsistently
 * and some renderers ignore entirely -- so a page that looked right on screen
 * would export wrong, or blank. PanelForge therefore lays out every balloon as
 * real `<text>`/`<tspan>` elements, which means measuring and breaking lines
 * here, by hand.
 *
 * This was called out as a real cost in the phase 0 plan. It is the price of
 * one renderer serving both the screen and the export.
 */

/** A 1x1 canvas reused for every measurement; creating one per call is slow. */
let measureContext: CanvasRenderingContext2D | null | undefined

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (measureContext !== undefined) return measureContext

  try {
    const canvas = document.createElement('canvas')
    measureContext = canvas.getContext('2d')
  } catch {
    measureContext = null
  }

  return measureContext
}

/**
 * Average character width as a fraction of font size, used when canvas
 * measurement is unavailable (jsdom, a locked-down environment).
 *
 * 0.5 is close for the condensed sans faces used in lettering. The fallback
 * only has to be good enough to avoid absurd layout; anything rendering for
 * real has a canvas.
 */
const FALLBACK_ADVANCE = 0.5

/** Measures a string in the given CSS font shorthand, in px. */
export function measureTextWidth(text: string, font: string, fontSize: number): number {
  const context = getMeasureContext()
  if (!context) return text.length * fontSize * FALLBACK_ADVANCE

  context.font = font
  const measured = context.measureText(text).width

  // jsdom's stub returns 0 for everything, which would wrap every word onto
  // its own line. Treat a zero width on non-empty text as "no measurement".
  if (measured === 0 && text.length > 0) return text.length * fontSize * FALLBACK_ADVANCE
  return measured
}

export interface WrapOptions {
  /** Maximum line width in user units. */
  maxWidth: number
  fontSize: number
  /** CSS font shorthand, e.g. `600 13px Inter, sans-serif`. */
  font: string
  /** Hard cap on lines. Beyond this, the last line is ellipsised. */
  maxLines?: number
}

/**
 * Breaks text into lines that fit `maxWidth`.
 *
 * Explicit newlines are honoured as hard breaks -- a letterer who typed a
 * line break meant it. A single word longer than the line is broken mid-word
 * rather than allowed to overflow the balloon.
 */
export function wrapText(text: string, options: WrapOptions): string[] {
  const { maxWidth, font, fontSize, maxLines } = options
  if (!text.trim()) return []
  if (maxWidth <= 0) return [text]

  const lines: string[] = []

  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    let current = ''

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word

      if (measureTextWidth(candidate, font, fontSize) <= maxWidth) {
        current = candidate
        continue
      }

      // Flush the line in progress. No need to clear `current` -- both
      // branches below assign it unconditionally.
      if (current) lines.push(current)

      // A word that cannot fit on a line of its own has to be split, or it
      // runs outside the balloon.
      if (measureTextWidth(word, font, fontSize) > maxWidth) {
        let chunk = ''
        for (const character of word) {
          if (measureTextWidth(chunk + character, font, fontSize) > maxWidth && chunk) {
            lines.push(chunk)
            chunk = character
          } else {
            chunk += character
          }
        }
        current = chunk
      } else {
        current = word
      }
    }

    if (current) lines.push(current)
  }

  if (maxLines && lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    const last = kept[maxLines - 1] ?? ''
    kept[maxLines - 1] = `${last.replace(/\s+\S*$/, '')}…`
    return kept
  }

  return lines
}

/** CSS font shorthand for a balloon, matching what the renderer draws with. */
export function balloonFont(fontSize: number, family: string, weight = 400): string {
  return `${weight} ${fontSize}px ${family}`
}

export interface LaidOutText {
  lines: string[]
  lineHeight: number
  /** Total height of the block, for vertical centring. */
  height: number
}

/**
 * Lays text out for a balloon, returning the lines and the metrics needed to
 * centre them vertically inside it.
 */
export function layOutBalloonText(
  text: string,
  options: WrapOptions & { lineHeightRatio?: number },
): LaidOutText {
  const lineHeight = options.fontSize * (options.lineHeightRatio ?? 1.25)
  const lines = wrapText(text, options)
  return { lines, lineHeight, height: lines.length * lineHeight }
}
