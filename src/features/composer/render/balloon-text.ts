import { balloonFont, layOutBalloonText, type LaidOutText } from '@/lib/text-layout'
import type { Balloon } from '@/types/comic'
import type { Rect } from '@/types/common'

/**
 * Where a balloon's text goes, and whether it fits.
 *
 * This lives apart from the renderer because two places need the same answer:
 * the renderer, to draw the lines, and the inspector, to tell the letterer
 * that their dialogue is being cut off and offer to grow the balloon. Two
 * copies of this arithmetic would drift, and the symptom would be an inspector
 * that disagrees with the page.
 */

/**
 * Font stacks for exported content.
 *
 * Deliberately literal rather than CSS custom properties: an exported SVG is
 * serialised away from the document, where `var(--pf-font-body)` resolves to
 * nothing and the text renders in the renderer's default face.
 */
export const BODY_FONT = 'Inter, "Helvetica Neue", Arial, sans-serif'
export const SFX_FONT = '"Chakra Petch", Impact, "Arial Black", sans-serif'

/** Line height as a multiple of the font size. */
export const LINE_HEIGHT_RATIO = 1.22

/**
 * A round balloon is only as wide as its bounding box along the middle line.
 * The largest rectangle that fits inside an ellipse is 1/root-2 of each side,
 * so round kinds lay their text out inside that rectangle. Wrapping to the
 * full box instead put the top and bottom lines straight through the outline.
 */
const ROUND_INSET = Math.SQRT1_2

function isRound(kind: Balloon['kind']): boolean {
  return kind === 'speech' || kind === 'thought' || kind === 'shout'
}

/** Inset from the outline, so letters never touch the stroke. */
function paddingFor(kind: Balloon['kind']): number {
  if (kind === 'sfx') return 0
  return kind === 'caption' ? 6 : 10
}

export interface BalloonTextLayout extends LaidOutText {
  /** Width the text wraps within, in page units. */
  maxWidth: number
  /** Lines the balloon has room for. */
  maxLines: number
  /** True when the text needed more lines than the balloon has room for. */
  truncated: boolean
  /** x for the `<text>` element, honouring the balloon's alignment. */
  textX: number
  /** Baseline of the first line. */
  firstBaseline: number
  textAnchor: 'start' | 'middle' | 'end'
  font: string
  weight: number
}

export function layOutBalloon(balloon: Balloon): BalloonTextLayout {
  const sfx = balloon.kind === 'sfx'
  const font = sfx ? SFX_FONT : BODY_FONT
  const weight = sfx || balloon.kind === 'shout' ? 700 : 400

  const padding = paddingFor(balloon.kind)
  const round = isRound(balloon.kind)
  const usableWidth = round ? balloon.rect.width * ROUND_INSET : balloon.rect.width
  const usableHeight = round ? balloon.rect.height * ROUND_INSET : balloon.rect.height

  const maxWidth = Math.max(8, usableWidth - padding * 2)
  const maxLines = Math.max(
    1,
    Math.floor((usableHeight - padding) / (balloon.fontSize * LINE_HEIGHT_RATIO)),
  )

  const options = {
    maxWidth,
    fontSize: balloon.fontSize,
    font: balloonFont(balloon.fontSize, font, weight),
    lineHeightRatio: LINE_HEIGHT_RATIO,
  }

  // Laid out twice: once unbounded to learn how many lines the text really
  // needs, then clamped for drawing. Comparing the two is what makes
  // `truncated` honest -- the clamped pass alone cannot tell a text that
  // exactly fills the balloon from one that overflowed it.
  const full = layOutBalloonText(balloon.text, options)
  const clamped = layOutBalloonText(balloon.text, { ...options, maxLines })

  const cx = balloon.rect.x + balloon.rect.width / 2
  const cy = balloon.rect.y + balloon.rect.height / 2

  const textAnchor =
    balloon.align === 'left' ? 'start' : balloon.align === 'right' ? 'end' : 'middle'

  return {
    ...clamped,
    maxWidth,
    maxLines,
    truncated: full.lines.length > clamped.lines.length,
    textAnchor,
    textX:
      balloon.align === 'left'
        ? cx - usableWidth / 2 + padding
        : balloon.align === 'right'
          ? cx + usableWidth / 2 - padding
          : cx,
    // Vertically centred: start half the block above the middle, then shift
    // down by roughly the cap height so the first baseline sits correctly.
    firstBaseline: cy - clamped.height / 2 + balloon.fontSize * 0.82,
    font,
    weight,
  }
}

/**
 * A rectangle tall enough to hold all of a balloon's text at its current
 * width, grown about the balloon's centre.
 *
 * Only ever applied when the user asks for it. Resizing a balloon on their
 * behalf because they typed a long line is exactly the kind of silent change
 * that makes a layout tool untrustworthy.
 */
export function fitBalloonRect(balloon: Balloon): Rect {
  const round = isRound(balloon.kind)
  const padding = paddingFor(balloon.kind)

  const usableWidth = round ? balloon.rect.width * ROUND_INSET : balloon.rect.width
  const maxWidth = Math.max(8, usableWidth - padding * 2)

  const laid = layOutBalloonText(balloon.text, {
    maxWidth,
    fontSize: balloon.fontSize,
    font: balloonFont(balloon.fontSize, balloon.kind === 'sfx' ? SFX_FONT : BODY_FONT, 400),
    lineHeightRatio: LINE_HEIGHT_RATIO,
  })

  const needed = laid.height + padding * 2
  const height = Math.max(balloon.rect.height, round ? needed / ROUND_INSET : needed)
  const cy = balloon.rect.y + balloon.rect.height / 2

  return { ...balloon.rect, y: cy - height / 2, height }
}
