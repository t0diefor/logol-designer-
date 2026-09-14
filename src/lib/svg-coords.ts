/**
 * Screen-to-SVG coordinate conversion.
 *
 * Pointer events report client coordinates; SVG shapes live in user-space
 * coordinates defined by the viewBox. Any drag interaction on an SVG canvas
 * has to convert between them, and getting it wrong shows up as a cursor that
 * drifts away from the thing it is dragging once the canvas is scaled.
 *
 * `getScreenCTM()` returns the matrix mapping user space to screen space, so
 * its inverse maps the other way. This handles viewBox scaling, page scroll
 * and any CSS transform on an ancestor in one step, which manual arithmetic
 * on `getBoundingClientRect` does not.
 *
 * The composer in phase 6 drags panels the same way, so this lives in lib/
 * rather than inside the world feature.
 */

export interface Point {
  x: number
  y: number
}

/** Converts a client (screen) point into the SVG's user-space coordinates. */
export function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const matrix = svg.getScreenCTM()

  // Absent in a detached or display:none SVG, and in jsdom. Returning the raw
  // point keeps callers total rather than forcing a null check at every site.
  if (!matrix) return { x: clientX, y: clientY }

  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY

  const transformed = point.matrixTransform(matrix.inverse())
  return { x: transformed.x, y: transformed.y }
}

/** Rounds a value to the nearest multiple of `step`. */
export function snap(value: number, step: number): number {
  if (step <= 0) return value
  return Math.round(value / step) * step
}

/** Rounds a point to the nearest grid intersection. */
export function snapPoint(point: Point, step: number): Point {
  return { x: snap(point.x, step), y: snap(point.y, step) }
}

/** Keeps a value inside an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
