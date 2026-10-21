import type { Page } from '@/types/comic'
import type { Rect } from '@/types/common'

/**
 * Page layout templates.
 *
 * Expressed as fractions of the live area rather than absolute coordinates, so
 * one definition works for a US comic page, A4 and a webtoon strip. The live
 * area is the page inset by its margin; gutters are subtracted between cells.
 */

export interface PageTemplate {
  id: string
  name: string
  description: string
  /** Rows of column counts. [1] is a splash; [2,2] is a four-panel grid. */
  rows: number[]
  /** Optional per-row height weights. Defaults to equal rows. */
  weights?: number[]
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  { id: 'splash', name: 'Splash', description: 'One full-page panel.', rows: [1] },
  { id: 'two-up', name: 'Two tiers', description: 'Two full-width panels.', rows: [1, 1] },
  { id: 'three-tier', name: 'Three tiers', description: 'Three full-width panels.', rows: [1, 1, 1] },
  { id: 'grid-4', name: 'Four grid', description: 'Two rows of two.', rows: [2, 2] },
  { id: 'grid-6', name: 'Six grid', description: 'Three rows of two.', rows: [2, 2, 2] },
  { id: 'grid-9', name: 'Nine grid', description: 'Three rows of three.', rows: [3, 3, 3] },
  {
    id: 'establishing',
    name: 'Establishing',
    description: 'Wide opener over two rows of two.',
    rows: [1, 2, 2],
    weights: [1.6, 1, 1],
  },
  {
    id: 'climax',
    name: 'Build to a beat',
    description: 'Three small panels over one wide one.',
    rows: [3, 1],
    weights: [1, 1.5],
  },
]

/**
 * Turns a template into panel rectangles for a specific page.
 *
 * Gutters are taken out of the available space before dividing, so cells stay
 * equal rather than the last one in each row absorbing the rounding.
 */
export function layoutTemplate(template: PageTemplate, page: Page): Rect[] {
  const { width, height } = page.size
  const { margin, gutter } = page

  const liveX = margin
  const liveY = margin
  const liveWidth = width - margin * 2
  const liveHeight = height - margin * 2

  if (liveWidth <= 0 || liveHeight <= 0) return []

  const weights = template.weights ?? template.rows.map(() => 1)
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  const verticalGutters = gutter * (template.rows.length - 1)
  const rowSpace = liveHeight - verticalGutters

  const rects: Rect[] = []
  let y = liveY

  template.rows.forEach((columns, rowIndex) => {
    const rowHeight = (rowSpace * (weights[rowIndex] ?? 1)) / totalWeight
    const horizontalGutters = gutter * (columns - 1)
    const columnWidth = (liveWidth - horizontalGutters) / columns

    for (let column = 0; column < columns; column += 1) {
      rects.push({
        x: Math.round(liveX + column * (columnWidth + gutter)),
        y: Math.round(y),
        width: Math.round(columnWidth),
        height: Math.round(rowHeight),
      })
    }

    y += rowHeight + gutter
  })

  return rects
}

/** A rectangle for a new panel dropped onto a page with nothing on it yet. */
export function defaultPanelRect(page: Page): Rect {
  const liveWidth = page.size.width - page.margin * 2
  const liveHeight = page.size.height - page.margin * 2
  return {
    x: Math.round(page.margin + liveWidth * 0.1),
    y: Math.round(page.margin + liveHeight * 0.1),
    width: Math.round(liveWidth * 0.45),
    height: Math.round(liveHeight * 0.3),
  }
}
