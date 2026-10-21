import { beforeEach, describe, expect, it } from 'vitest'
import { useComposerHistory } from './history'
import type { Page } from '@/types/comic'

const history = () => useComposerHistory.getState()

function page(id: string, margin: number): Page {
  return {
    id, createdAt: '', updatedAt: '', ownerId: null, episodeId: 'e', index: 1,
    size: { width: 477, height: 738, label: 'US Comic' },
    margin, gutter: 12, background: null, panels: [], notes: [], templateId: null,
  }
}

describe('composer history', () => {
  beforeEach(() => useComposerHistory.setState({ past: {}, future: {} }))

  it('has nothing to undo on a fresh page', () => {
    expect(history().canUndo('p1')).toBe(false)
    expect(history().undo('p1', page('p1', 24))).toBeNull()
  })

  it('returns the recorded state on undo', () => {
    history().record(page('p1', 24))
    const restored = history().undo('p1', page('p1', 99))
    expect(restored?.margin).toBe(24)
  })

  it('redoes back to where it was', () => {
    history().record(page('p1', 24))
    const undone = history().undo('p1', page('p1', 99))!
    const redone = history().redo('p1', undone)
    expect(redone?.margin).toBe(99)
  })

  it('walks back through several steps in order', () => {
    history().record(page('p1', 1))
    history().record(page('p1', 2))
    history().record(page('p1', 3))

    expect(history().undo('p1', page('p1', 4))?.margin).toBe(3)
    expect(history().undo('p1', page('p1', 3))?.margin).toBe(2)
    expect(history().undo('p1', page('p1', 2))?.margin).toBe(1)
    expect(history().undo('p1', page('p1', 1))).toBeNull()
  })

  it('discards the redo stack once a new change is made', () => {
    history().record(page('p1', 1))
    history().undo('p1', page('p1', 2))
    expect(history().canRedo('p1')).toBe(true)

    // The user has branched; redoing into the old future would restore a
    // document they never had.
    history().record(page('p1', 5))
    expect(history().canRedo('p1')).toBe(false)
  })

  it('keeps each page’s history separate', () => {
    history().record(page('p1', 1))
    expect(history().canUndo('p2')).toBe(false)
    expect(history().undo('p2', page('p2', 9))).toBeNull()
  })

  it('caps how far back it keeps, dropping the oldest', () => {
    for (let i = 0; i < 80; i += 1) history().record(page('p1', i))
    expect(history().past.p1!.length).toBeLessThanOrEqual(60)
    // The most recent entry survives; the oldest is what goes.
    expect(history().past.p1!.at(-1)!.margin).toBe(79)
  })

  it('forgets a page when it is cleared', () => {
    history().record(page('p1', 1))
    history().clear('p1')
    expect(history().canUndo('p1')).toBe(false)
  })
})
