import { newId, nowIso } from '@/lib/id'
import { US_COMIC_PAGE, type Balloon, type Episode, type Page, type Panel, type Placement } from '@/types/comic'
import type { PageSlice, WorkspaceSliceCreator } from './types'

/**
 * Episodes and pages: the comic document.
 *
 * The rule this file exists to enforce: a page is *data*. Every panel,
 * balloon and placement is a serialisable record, never a mark on a raster
 * image. That is what keeps the work editable indefinitely, and it is what
 * makes export (phase 7) a pure function from this state to pixels rather
 * than a second, divergent drawing path.
 */

/** Applies a change to one panel inside a page, leaving the rest alone. */
function mapPanel(page: Page, panelId: string, change: (panel: Panel) => Panel): Page {
  return {
    ...page,
    panels: page.panels.map((panel) => (panel.id === panelId ? change(panel) : panel)),
    updatedAt: nowIso(),
  }
}

export function makePanel(rect: Panel['rect'], z: number): Panel {
  return {
    id: newId(),
    rect,
    z,
    radius: 0,
    borderWidth: 2,
    fill: null,
    description: '',
    shot: '',
    placements: [],
    balloons: [],
    notes: [],
    sceneId: null,
  }
}

export const createPageSlice: WorkspaceSliceCreator<PageSlice> = (set, get) => ({
  episodes: {},
  pages: {},

  createEpisode: (comicId, title) => {
    const timestamp = nowIso()
    const siblings = Object.values(get().episodes).filter((e) => e.comicId === comicId)

    const episode: Episode = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      comicId,
      volumeId: null,
      number: siblings.length + 1,
      title,
      synopsis: '',
      status: 'outline',
      tags: [],
    }
    set((state) => ({ episodes: { ...state.episodes, [episode.id]: episode } }))
    return episode
  },

  updateEpisode: (id, changes) =>
    set((state) => {
      const existing = state.episodes[id]
      if (!existing) return state
      return {
        episodes: { ...state.episodes, [id]: { ...existing, ...changes, id, updatedAt: nowIso() } },
      }
    }),

  deleteEpisode: (id) =>
    set((state) => {
      const episodes = { ...state.episodes }
      delete episodes[id]
      // A page without its episode is unreachable.
      const pages = Object.fromEntries(
        Object.entries(state.pages).filter(([, page]) => page.episodeId !== id),
      )
      return { episodes, pages }
    }),

  createPage: (episodeId, size) => {
    const timestamp = nowIso()
    const siblings = Object.values(get().pages).filter((page) => page.episodeId === episodeId)

    const page: Page = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      episodeId,
      // Pages are 1-based: comic pages are referred to by their printed number.
      index: siblings.length + 1,
      size: size ?? US_COMIC_PAGE,
      margin: 24,
      gutter: 12,
      background: null,
      panels: [],
      notes: [],
      templateId: null,
    }
    set((state) => ({ pages: { ...state.pages, [page.id]: page } }))
    return page
  },

  updatePage: (id, changes) =>
    set((state) => {
      const existing = state.pages[id]
      if (!existing) return state
      return { pages: { ...state.pages, [id]: { ...existing, ...changes, id, updatedAt: nowIso() } } }
    }),

  /** Replaces a page wholesale. Used by undo and redo. */
  replacePage: (page) =>
    set((state) => (state.pages[page.id] ? { pages: { ...state.pages, [page.id]: page } } : state)),

  deletePage: (id) =>
    set((state) => {
      const target = state.pages[id]
      if (!target) return state

      const pages = { ...state.pages }
      delete pages[id]

      // Close the gap: page numbers are printed, so they must stay contiguous.
      const timestamp = nowIso()
      for (const [pageId, page] of Object.entries(pages)) {
        if (page.episodeId !== target.episodeId) continue
        if (page.index < target.index) continue
        pages[pageId] = { ...page, index: page.index - 1, updatedAt: timestamp }
      }

      return { pages }
    }),

  movePage: (id, direction) =>
    set((state) => {
      const page = state.pages[id]
      if (!page) return state

      const ordered = Object.values(state.pages)
        .filter((candidate) => candidate.episodeId === page.episodeId)
        .sort((a, b) => a.index - b.index)

      const position = ordered.findIndex((candidate) => candidate.id === id)
      const swapWith = ordered[direction === 'up' ? position - 1 : position + 1]
      if (!swapWith) return state

      const timestamp = nowIso()
      return {
        pages: {
          ...state.pages,
          [page.id]: { ...page, index: swapWith.index, updatedAt: timestamp },
          [swapWith.id]: { ...swapWith, index: page.index, updatedAt: timestamp },
        },
      }
    }),

  duplicatePage: (id) => {
    const source = get().pages[id]
    if (!source) return null

    const timestamp = nowIso()
    const siblings = Object.values(get().pages).filter(
      (page) => page.episodeId === source.episodeId,
    )

    /*
     * Everything nested gets a fresh id. Sharing a panel id between two pages
     * would mean selecting a panel on one page highlights it on the other, and
     * deleting it from one removes it from both.
     */
    const copy: Page = {
      ...source,
      id: newId(),
      index: siblings.length + 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      panels: source.panels.map((panel) => ({
        ...panel,
        id: newId(),
        placements: panel.placements.map((placement) => ({ ...placement, id: newId() })),
        balloons: panel.balloons.map((balloon) => ({ ...balloon, id: newId() })),
        notes: panel.notes.map((note) => ({ ...note, id: newId() })),
      })),
      notes: source.notes.map((note) => ({ ...note, id: newId() })),
    }

    set((state) => ({ pages: { ...state.pages, [copy.id]: copy } }))
    return copy
  },

  /* ---------------- Panels ---------------- */

  addPanel: (pageId, rect) => {
    const page = get().pages[pageId]
    if (!page) return null

    const topZ = page.panels.reduce((max, panel) => Math.max(max, panel.z), -1)
    const panel = makePanel(rect, topZ + 1)

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...page, panels: [...page.panels, panel], updatedAt: nowIso() },
      },
    }))
    return panel
  },

  updatePanel: (pageId, panelId, changes) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state
      return {
        pages: {
          ...state.pages,
          [pageId]: mapPanel(page, panelId, (panel) => {
            const moved = { ...panel, ...changes, id: panelId }

            // A panel is a container, so its art and lettering travel with it.
            // Placements and balloons hold page-space rectangles, so moving
            // the panel alone used to strand them where they were: drag a
            // finished panel across the page and the picture stayed behind.
            //
            // Only translation carries the contents. Resizing deliberately
            // does not scale them -- a resize crops or reveals, which is what
            // a letterer adjusting a panel edge expects.
            if (!changes.rect) return moved
            const dx = moved.rect.x - panel.rect.x
            const dy = moved.rect.y - panel.rect.y
            if (dx === 0 && dy === 0) return moved

            return {
              ...moved,
              placements: moved.placements.map((placement) => ({
                ...placement,
                rect: { ...placement.rect, x: placement.rect.x + dx, y: placement.rect.y + dy },
              })),
              balloons: moved.balloons.map((balloon) => ({
                ...balloon,
                rect: { ...balloon.rect, x: balloon.rect.x + dx, y: balloon.rect.y + dy },
              })),
            }
          }),
        },
      }
    }),

  deletePanel: (pageId, panelId) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state
      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            panels: page.panels.filter((panel) => panel.id !== panelId),
            updatedAt: nowIso(),
          },
        },
      }
    }),

  duplicatePanel: (pageId, panelId) => {
    const page = get().pages[pageId]
    const source = page?.panels.find((panel) => panel.id === panelId)
    if (!page || !source) return null

    const topZ = page.panels.reduce((max, panel) => Math.max(max, panel.z), -1)
    const OFFSET = 16

    const copy: Panel = {
      ...source,
      id: newId(),
      z: topZ + 1,
      // Offset so the copy is visibly a separate object rather than hidden
      // exactly behind the original.
      rect: { ...source.rect, x: source.rect.x + OFFSET, y: source.rect.y + OFFSET },
      placements: source.placements.map((placement) => ({ ...placement, id: newId() })),
      balloons: source.balloons.map((balloon) => ({ ...balloon, id: newId() })),
      notes: source.notes.map((note) => ({ ...note, id: newId() })),
    }

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: { ...page, panels: [...page.panels, copy], updatedAt: nowIso() },
      },
    }))
    return copy
  },

  /**
   * Moves a panel through the stack.
   *
   * Z values are renormalised to 0..n-1 afterwards, so repeated reordering
   * cannot drift into sparse or duplicate values that make "is this in front?"
   * ambiguous.
   */
  reorderPanel: (pageId, panelId, direction) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state

      const ordered = [...page.panels].sort((a, b) => a.z - b.z)
      const position = ordered.findIndex((panel) => panel.id === panelId)
      if (position === -1) return state

      let target = position
      if (direction === 'forward') target = Math.min(ordered.length - 1, position + 1)
      if (direction === 'backward') target = Math.max(0, position - 1)
      if (direction === 'front') target = ordered.length - 1
      if (direction === 'back') target = 0
      if (target === position) return state

      const reordered = [...ordered]
      const [moved] = reordered.splice(position, 1)
      reordered.splice(target, 0, moved!)

      return {
        pages: {
          ...state.pages,
          [pageId]: {
            ...page,
            panels: reordered.map((panel, index) => ({ ...panel, z: index })),
            updatedAt: nowIso(),
          },
        },
      }
    }),

  /* ---------------- Balloons ---------------- */

  addBalloon: (pageId, panelId, balloon) => {
    const page = get().pages[pageId]
    const panel = page?.panels.find((candidate) => candidate.id === panelId)
    if (!page || !panel) return null

    const topZ = panel.balloons.reduce((max, candidate) => Math.max(max, candidate.z), -1)
    const created: Balloon = { ...balloon, id: newId(), z: topZ + 1 }

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: mapPanel(page, panelId, (target) => ({
          ...target,
          balloons: [...target.balloons, created],
        })),
      },
    }))
    return created
  },

  updateBalloon: (pageId, panelId, balloonId, changes) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state
      return {
        pages: {
          ...state.pages,
          [pageId]: mapPanel(page, panelId, (panel) => ({
            ...panel,
            balloons: panel.balloons.map((balloon) =>
              balloon.id === balloonId ? { ...balloon, ...changes, id: balloonId } : balloon,
            ),
          })),
        },
      }
    }),

  deleteBalloon: (pageId, panelId, balloonId) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state
      return {
        pages: {
          ...state.pages,
          [pageId]: mapPanel(page, panelId, (panel) => ({
            ...panel,
            balloons: panel.balloons.filter((balloon) => balloon.id !== balloonId),
          })),
        },
      }
    }),

  /* ---------------- Placements ---------------- */

  addPlacement: (pageId, panelId, placement) => {
    const page = get().pages[pageId]
    const panel = page?.panels.find((candidate) => candidate.id === panelId)
    if (!page || !panel) return null

    const topZ = panel.placements.reduce((max, candidate) => Math.max(max, candidate.z), -1)
    const created: Placement = { ...placement, id: newId(), z: topZ + 1 }

    set((state) => ({
      pages: {
        ...state.pages,
        [pageId]: mapPanel(page, panelId, (target) => ({
          ...target,
          placements: [...target.placements, created],
        })),
      },
    }))
    return created
  },

  updatePlacement: (pageId, panelId, placementId, changes) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state
      return {
        pages: {
          ...state.pages,
          [pageId]: mapPanel(page, panelId, (panel) => ({
            ...panel,
            placements: panel.placements.map((placement) =>
              placement.id === placementId
                ? { ...placement, ...changes, id: placementId }
                : placement,
            ),
          })),
        },
      }
    }),

  deletePlacement: (pageId, panelId, placementId) =>
    set((state) => {
      const page = state.pages[pageId]
      if (!page) return state
      return {
        pages: {
          ...state.pages,
          [pageId]: mapPanel(page, panelId, (panel) => ({
            ...panel,
            placements: panel.placements.filter((placement) => placement.id !== placementId),
          })),
        },
      }
    }),
})
