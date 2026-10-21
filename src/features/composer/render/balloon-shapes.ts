import type { Balloon } from '@/types/comic'
import type { Rect } from '@/types/common'

/**
 * Balloon outlines, as SVG path data.
 *
 * Drawn as paths rather than as `<ellipse>` plus a separate tail, because a
 * balloon and its tail have to be one filled shape: two overlapping shapes
 * show a seam where the tail meets the body, and the join is exactly where a
 * reader looks.
 */

/** Where the tail points, as an absolute point in panel space. */
function tailTarget(balloon: Balloon): { x: number; y: number } {
  const cx = balloon.rect.x + balloon.rect.width / 2
  const cy = balloon.rect.y + balloon.rect.height / 2
  return { x: cx + balloon.tailX, y: cy + balloon.tailY }
}

/** A rounded rectangle, used by captions and whispers. */
function roundedRect({ x, y, width, height }: Rect, radius: number): string {
  const r = Math.min(radius, width / 2, height / 2)
  return [
    `M${x + r} ${y}`,
    `H${x + width - r}`,
    `A${r} ${r} 0 0 1 ${x + width} ${y + r}`,
    `V${y + height - r}`,
    `A${r} ${r} 0 0 1 ${x + width - r} ${y + height}`,
    `H${x + r}`,
    `A${r} ${r} 0 0 1 ${x} ${y + height - r}`,
    `V${y + r}`,
    `A${r} ${r} 0 0 1 ${x + r} ${y}`,
    'Z',
  ].join(' ')
}

/**
 * An ellipse with a tail cut into it.
 *
 * The ellipse is drawn as two arcs with a gap, and the tail is two straight
 * lines bridging that gap, so the whole thing is a single closed subpath.
 */
function speechPath(balloon: Balloon): string {
  const { x, y, width, height } = balloon.rect
  const cx = x + width / 2
  const cy = y + height / 2
  const rx = width / 2
  const ry = height / 2
  const target = tailTarget(balloon)

  // No tail: a plain ellipse.
  if (balloon.tailX === 0 && balloon.tailY === 0) {
    return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
  }

  const angle = Math.atan2(target.y - cy, target.x - cx)
  // Half-width of the tail's base, in radians around the ellipse.
  const spread = 0.26

  const a1 = angle - spread
  const a2 = angle + spread
  const p1 = { x: cx + rx * Math.cos(a1), y: cy + ry * Math.sin(a1) }
  const p2 = { x: cx + rx * Math.cos(a2), y: cy + ry * Math.sin(a2) }

  return [
    `M${p2.x} ${p2.y}`,
    // The long way round, back to the other side of the tail base.
    `A${rx} ${ry} 0 1 1 ${p1.x} ${p1.y}`,
    `L${target.x} ${target.y}`,
    `L${p2.x} ${p2.y}`,
    'Z',
  ].join(' ')
}

/** A cloud outline, built from arcs around the ellipse. */
function thoughtPath(balloon: Balloon): string {
  const { x, y, width, height } = balloon.rect
  const cx = x + width / 2
  const cy = y + height / 2
  const rx = width / 2
  const ry = height / 2

  const bumps = Math.max(8, Math.round(width / 26))
  const points: string[] = []

  for (let i = 0; i < bumps; i += 1) {
    const angle = (i / bumps) * Math.PI * 2
    const next = ((i + 1) / bumps) * Math.PI * 2
    const from = { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) }
    const to = { x: cx + rx * Math.cos(next), y: cy + ry * Math.sin(next) }
    const bumpRadius = (Math.PI * 2 * Math.min(rx, ry)) / bumps / 1.5

    if (i === 0) points.push(`M${from.x} ${from.y}`)
    points.push(`A${bumpRadius} ${bumpRadius} 0 0 1 ${to.x} ${to.y}`)
  }

  points.push('Z')
  return points.join(' ')
}

/** The trailing bubbles of a thought balloon, drawn as separate circles. */
export function thoughtTailBubbles(balloon: Balloon): { cx: number; cy: number; r: number }[] {
  if (balloon.tailX === 0 && balloon.tailY === 0) return []

  const cx = balloon.rect.x + balloon.rect.width / 2
  const cy = balloon.rect.y + balloon.rect.height / 2
  const target = tailTarget(balloon)

  return [0.55, 0.78, 0.95].map((t, index) => ({
    cx: cx + (target.x - cx) * t,
    cy: cy + (target.y - cy) * t,
    r: 7 - index * 2,
  }))
}

/** A jagged outline for shouted dialogue. */
function shoutPath(balloon: Balloon): string {
  const { x, y, width, height } = balloon.rect
  const cx = x + width / 2
  const cy = y + height / 2
  const points: string[] = []
  const spikes = 16

  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (i / (spikes * 2)) * Math.PI * 2
    // Alternate between the full radius and a shorter one.
    const scale = i % 2 === 0 ? 1 : 0.8
    const px = cx + (width / 2) * scale * Math.cos(angle)
    const py = cy + (height / 2) * scale * Math.sin(angle)
    points.push(`${i === 0 ? 'M' : 'L'}${px} ${py}`)
  }

  points.push('Z')
  return points.join(' ')
}

/** Returns the outline for a balloon of any kind. */
export function balloonPath(balloon: Balloon): string {
  switch (balloon.kind) {
    case 'thought':
      return thoughtPath(balloon)
    case 'shout':
      return shoutPath(balloon)
    case 'caption':
      return roundedRect(balloon.rect, 2)
    case 'whisper':
      return roundedRect(balloon.rect, 10)
    case 'sfx':
      // SFX is drawn as text alone; the outline is never painted.
      return ''
    default:
      return speechPath(balloon)
  }
}

/** Whether this kind of balloon paints an outline at all. */
export function balloonHasOutline(kind: Balloon['kind']): boolean {
  return kind !== 'sfx'
}

/** Dashed outline for whispers, solid for everything else. */
export function balloonDashArray(kind: Balloon['kind']): string | undefined {
  return kind === 'whisper' ? '6 4' : undefined
}
