import { describe, expect, it } from 'vitest'
import { containRect, resizeRect, snapRect, MIN_PANEL_SIZE } from './alignment'
import { layoutTemplate, PAGE_TEMPLATES } from './templates'
import type { Page } from '@/types/comic'

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height })

describe('snapRect', () => {
  it('leaves a rectangle alone when nothing is near', () => {
    const result = snapRect(rect(100, 100, 50, 50), [rect(400, 400, 50, 50)])
    expect(result.rect).toEqual(rect(100, 100, 50, 50))
    expect(result.guides).toEqual([])
  })

  it('snaps a left edge to another left edge', () => {
    const result = snapRect(rect(103, 200, 50, 50), [rect(100, 10, 50, 50)])
    expect(result.rect.x).toBe(100)
  })

  it('moves rather than resizes when it snaps', () => {
    const moving = rect(103, 200, 50, 50)
    const result = snapRect(moving, [rect(100, 10, 50, 50)])
    // A snap that changed the size would silently resize the panel.
    expect(result.rect.width).toBe(moving.width)
    expect(result.rect.height).toBe(moving.height)
  })

  it('reports a guide wherever it snapped', () => {
    const result = snapRect(rect(103, 200, 50, 50), [rect(100, 10, 50, 50)])
    expect(result.guides).toContainEqual({ axis: 'x', position: 100 })
  })

  it('snaps on both axes at once', () => {
    const result = snapRect(rect(103, 204, 50, 50), [rect(100, 200, 50, 50)])
    expect(result.rect.x).toBe(100)
    expect(result.rect.y).toBe(200)
    expect(result.guides).toHaveLength(2)
  })

  it('aligns centres, not just edges', () => {
    // Moving centre is at 128; the other rect's centre is at 125.
    const result = snapRect(rect(103, 300, 50, 50), [rect(100, 10, 50, 50)])
    expect(result.rect.x).toBe(100)
  })

  it('snaps to page margins passed as extra targets', () => {
    const result = snapRect(rect(27, 300, 50, 50), [], { x: [24], y: [] })
    expect(result.rect.x).toBe(24)
  })

  it('ignores anything beyond the threshold', () => {
    const result = snapRect(rect(140, 200, 50, 50), [rect(100, 10, 50, 50)], undefined, 6)
    expect(result.rect.x).toBe(140)
  })
})

describe('resizeRect', () => {
  it('moves the east edge and leaves the west alone', () => {
    const result = resizeRect(rect(100, 100, 50, 50), 'e', 20, 0)
    expect(result).toEqual(rect(100, 100, 70, 50))
  })

  it('moves the west edge and leaves the east alone', () => {
    const result = resizeRect(rect(100, 100, 50, 50), 'w', -20, 0)
    expect(result.x).toBe(80)
    expect(result.width).toBe(70)
    // The right edge has not moved.
    expect(result.x + result.width).toBe(150)
  })

  it('resizes both axes from a corner', () => {
    const result = resizeRect(rect(100, 100, 50, 50), 'se', 10, 20)
    expect(result).toEqual(rect(100, 100, 60, 70))
  })

  it('never inverts a rectangle', () => {
    // Dragging the west handle far past the east edge.
    const result = resizeRect(rect(100, 100, 50, 50), 'w', 500, 0)
    expect(result.width).toBeGreaterThanOrEqual(MIN_PANEL_SIZE)
    expect(result.x + result.width).toBe(150)
  })

  it('clamps rather than going below the minimum size', () => {
    const result = resizeRect(rect(100, 100, 50, 50), 'e', -500, 0)
    expect(result.width).toBe(MIN_PANEL_SIZE)
  })
})

describe('containRect', () => {
  it('pulls a rectangle back inside the page', () => {
    expect(containRect(rect(-20, -20, 50, 50), 400, 400)).toEqual(rect(0, 0, 50, 50))
    expect(containRect(rect(500, 500, 50, 50), 400, 400)).toEqual(rect(350, 350, 50, 50))
  })

  it('never changes the size', () => {
    const result = containRect(rect(-100, -100, 50, 50), 400, 400)
    expect(result.width).toBe(50)
    expect(result.height).toBe(50)
  })
})

describe('layoutTemplate', () => {
  const page: Page = {
    id: 'p', createdAt: '', updatedAt: '', ownerId: null, episodeId: 'e', index: 1,
    size: { width: 477, height: 738, label: 'US Comic' },
    margin: 24, gutter: 12, background: null, panels: [], notes: [], templateId: null,
  }

  it('produces one panel per cell', () => {
    const grid = PAGE_TEMPLATES.find((t) => t.id === 'grid-6')!
    expect(layoutTemplate(grid, page)).toHaveLength(6)
  })

  it('keeps every panel inside the margins', () => {
    for (const template of PAGE_TEMPLATES) {
      for (const cell of layoutTemplate(template, page)) {
        expect(cell.x).toBeGreaterThanOrEqual(page.margin - 1)
        expect(cell.y).toBeGreaterThanOrEqual(page.margin - 1)
        expect(cell.x + cell.width).toBeLessThanOrEqual(page.size.width - page.margin + 1)
        expect(cell.y + cell.height).toBeLessThanOrEqual(page.size.height - page.margin + 1)
      }
    }
  })

  it('gives every cell a positive size', () => {
    for (const template of PAGE_TEMPLATES) {
      for (const cell of layoutTemplate(template, page)) {
        expect(cell.width).toBeGreaterThan(0)
        expect(cell.height).toBeGreaterThan(0)
      }
    }
  })

  it('divides a row into equal columns', () => {
    const grid = PAGE_TEMPLATES.find((t) => t.id === 'grid-9')!
    const [a, b, c] = layoutTemplate(grid, page)
    expect(a!.width).toBe(b!.width)
    expect(b!.width).toBe(c!.width)
  })

  it('leaves a gutter between columns', () => {
    const grid = PAGE_TEMPLATES.find((t) => t.id === 'grid-4')!
    const [a, b] = layoutTemplate(grid, page)
    expect(b!.x - (a!.x + a!.width)).toBeCloseTo(page.gutter, 0)
  })

  it('returns nothing when the margin swallows the page', () => {
    const tiny = { ...page, margin: 400 }
    expect(layoutTemplate(PAGE_TEMPLATES[0]!, tiny)).toEqual([])
  })
})
