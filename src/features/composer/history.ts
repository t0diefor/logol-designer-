import { create } from 'zustand'
import type { Page } from '@/types/comic'

/**
 * Undo and redo for the composer, scoped to one page.
 *
 * Why a focused stack rather than a store-wide time-travel middleware: undo in
 * the composer should reverse the last thing you did *to this page*. A global
 * history would let Ctrl+Z in the composer rewind a character-sheet edit made
 * ten minutes earlier in another tab, which is the kind of undo people learn
 * to stop trusting.
 *
 * Snapshots are whole pages. A page is small -- a few hundred panel, balloon
 * and placement records -- so storing the full document is cheaper than
 * computing, storing and replaying patches, and it cannot drift out of sync
 * with the live state the way a patch log can.
 */

/** Snapshots kept per page. Deep enough to cover a work session. */
const HISTORY_LIMIT = 60

interface HistoryState {
  past: Record<string, Page[]>
  future: Record<string, Page[]>

  /** Records the state *before* a change. Call it immediately before mutating. */
  record: (page: Page) => void
  /** Returns the page to restore, or null when there is nothing to undo. */
  undo: (pageId: string, current: Page) => Page | null
  redo: (pageId: string, current: Page) => Page | null
  canUndo: (pageId: string) => boolean
  canRedo: (pageId: string) => boolean
  /** Drops a page's history, e.g. when it is deleted. */
  clear: (pageId: string) => void
}

export const useComposerHistory = create<HistoryState>()((set, get) => ({
  past: {},
  future: {},

  record: (page) =>
    set((state) => {
      const stack = [...(state.past[page.id] ?? []), page]
      return {
        past: {
          ...state.past,
          [page.id]: stack.length > HISTORY_LIMIT ? stack.slice(-HISTORY_LIMIT) : stack,
        },
        // A new action invalidates anything that was undone: the user has
        // branched, and keeping the old future would redo into a different
        // document than the one they are now editing.
        future: { ...state.future, [page.id]: [] },
      }
    }),

  undo: (pageId, current) => {
    const stack = get().past[pageId] ?? []
    const previous = stack[stack.length - 1]
    if (!previous) return null

    set((state) => ({
      past: { ...state.past, [pageId]: stack.slice(0, -1) },
      future: { ...state.future, [pageId]: [...(state.future[pageId] ?? []), current] },
    }))

    return previous
  },

  redo: (pageId, current) => {
    const stack = get().future[pageId] ?? []
    const next = stack[stack.length - 1]
    if (!next) return null

    set((state) => ({
      future: { ...state.future, [pageId]: stack.slice(0, -1) },
      past: { ...state.past, [pageId]: [...(state.past[pageId] ?? []), current] },
    }))

    return next
  },

  canUndo: (pageId) => (get().past[pageId]?.length ?? 0) > 0,
  canRedo: (pageId) => (get().future[pageId]?.length ?? 0) > 0,

  clear: (pageId) =>
    set((state) => {
      const past = { ...state.past }
      const future = { ...state.future }
      delete past[pageId]
      delete future[pageId]
      return { past, future }
    }),
}))
