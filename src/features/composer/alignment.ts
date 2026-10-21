import type { Rect } from '@/types/common'

/**
 * Alignment guides.
 *
 * Comics live or die on panel edges lining up, and doing it by eye at 60%
 * zoom does not work. While a panel is dragged or resized, its edges and
 * centres are compared against every other panel and the page margins, and
 * anything within the threshold both snaps and draws a line.
 *
 * Snapping without a visible line is worse than no snapping: the panel moves
 * somewhere the user did not put it, with no explanation.
 */

/** How close, in page units, before an edge snaps. */
export const SNAP_THRESHOLD = 6

export interface Guide {
  axis: 'x' | 'y'
  /** Position of the guide line in page coordinates. */
  position: number
}

/** The candidate positions one rectangle offers on each axis. */
function edgesOf(rect: Rect) {
  return {
    x: [rect.x, rect.x + rect.width / 2, rect.x + rect.width],
    y: [rect.y, rect.y + rect.height / 2, rect.y + rect.height],
  }
}

export interface SnapResult {
  rect: Rect
  guides: Guide[]
}

/**
 * Snaps a moving rectangle to nearby edges.
 *
 * `others` are the static rectangles to align against; `extra` carries the
 * page margins so panels snap to the live area as well as to each other.
 */
export function snapRect(
  moving: Rect,
  others: Rect[],
  extra: { x: number[]; y: number[] } = { x: [], y: [] },
  threshold = SNAP_THRESHOLD,
): SnapResult {
  const targetsX = [...extra.x, ...others.flatMap((rect) => edgesOf(rect).x)]
  const targetsY = [...extra.y, ...others.flatMap((rect) => edgesOf(rect).y)]

  const movingEdges = edgesOf(moving)
  const guides: Guide[] = []

  let offsetX = 0
  let bestX = threshold

  // Each of the moving rect's three x positions is tested against every
  // target; the closest match within the threshold wins and moves the whole
  // rectangle, so snapping never resizes it.
  movingEdges.x.forEach((edge, index) => {
    for (const target of targetsX) {
      const distance = Math.abs(target - edge)
      if (distance >= bestX) continue
      bestX = distance
      offsetX = target - edge
      guides.length = 0
      guides.push({ axis: 'x', position: target })
      void index
    }
  })

  let offsetY = 0
  let bestY = threshold
  const guidesY: Guide[] = []

  movingEdges.y.forEach((edge) => {
    for (const target of targetsY) {
      const distance = Math.abs(target - edge)
      if (distance >= bestY) continue
      bestY = distance
      offsetY = target - edge
      guidesY.length = 0
      guidesY.push({ axis: 'y', position: target })
    }
  })

  return {
    rect: { ...moving, x: moving.x + offsetX, y: moving.y + offsetY },
    guides: [...guides, ...guidesY],
  }
}

/** Keeps a rectangle inside the page, without changing its size. */
export function containRect(rect: Rect, width: number, height: number): Rect {
  return {
    ...rect,
    x: Math.min(Math.max(0, rect.x), Math.max(0, width - rect.width)),
    y: Math.min(Math.max(0, rect.y), Math.max(0, height - rect.height)),
  }
}

/** The eight resize handles, by the corner or edge they control. */
export const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
export type ResizeHandle = (typeof RESIZE_HANDLES)[number]

/** Minimum panel size, so a panel can never be resized out of existence. */
export const MIN_PANEL_SIZE = 24

/**
 * Applies a resize to a rectangle.
 *
 * Opposite edges stay put: dragging the west handle moves the left edge and
 * leaves the right where it is. Sizes are clamped at the minimum rather than
 * being allowed to invert, which is what produces negative-width rectangles
 * that then render as nothing.
 */
export function resizeRect(
  rect: Rect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  minimum = MIN_PANEL_SIZE,
): Rect {
  let { x, y, width, height } = rect

  if (handle.includes('w')) {
    const next = Math.min(x + deltaX, x + width - minimum)
    width += x - next
    x = next
  }
  if (handle.includes('e')) {
    width = Math.max(minimum, width + deltaX)
  }
  if (handle.includes('n')) {
    const next = Math.min(y + deltaY, y + height - minimum)
    height += y - next
    y = next
  }
  if (handle.includes('s')) {
    height = Math.max(minimum, height + deltaY)
  }

  return { x, y, width, height }
}
