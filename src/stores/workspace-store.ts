import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/persist'
import { newId, nowIso } from '@/lib/id'
import { usePersistenceStore } from './persistence-store'
import { US_COMIC_PAGE, type Comic } from '@/types/comic'
import type { Project, ProjectDraft } from '@/types/project'

/**
 * The workspace store: every entity the user has created, plus what they are
 * currently looking at.
 *
 * Shape notes:
 *
 * - Entities are stored in id-keyed records, not arrays. Lookups are the most
 *   common operation by far (every panel resolves a character, every page
 *   resolves its episode), and O(1) beats scanning an array each render.
 *   Ordering, where it matters, is carried by an explicit `index` field.
 *
 * - The state is plain JSON. No class instances, no Dates, no Maps -- all of
 *   which break structured serialisation. This is what lets the whole store
 *   round-trip through IndexedDB and, later, through a Postgres jsonb column
 *   or a project export file with no conversion layer.
 *
 * Phase 1 wires up projects and comics. The remaining collections are declared
 * now and filled in by later phases, so adding them needs no migration.
 */

export interface WorkspaceState {
  projects: Record<string, Project>
  comics: Record<string, Comic>

  /** Which project and comic the navigation bar is currently scoped to. */
  currentProjectId: string | null
  currentComicId: string | null

  createProject: (draft: ProjectDraft) => Project
  updateProject: (id: string, changes: Partial<Project>) => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => Project | null

  createComic: (projectId: string, title: string) => Comic
  updateComic: (id: string, changes: Partial<Comic>) => void
  deleteComic: (id: string) => void

  setCurrentProject: (id: string | null) => void
  setCurrentComic: (id: string | null) => void

  /** Replaces the entire workspace. Used by project import in the Export Center. */
  replaceAll: (state: Pick<WorkspaceState, 'projects' | 'comics'>) => void
}

function makeProject(draft: ProjectDraft): Project {
  const timestamp = nowIso()
  return {
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: null,
    title: draft.title,
    logline: draft.logline,
    genre: draft.genre,
    description: '',
    status: 'planning',
    palette: { name: '', colors: [] },
    tags: [],
    coverAssetId: null,
    preferredThemeId: null,
  }
}

function makeComic(projectId: string, title: string): Comic {
  const timestamp = nowIso()
  return {
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: null,
    projectId,
    title,
    subtitle: '',
    synopsis: '',
    defaultPageSize: US_COMIC_PAGE,
    coverAsset: null,
    tags: [],
  }
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      projects: {},
      comics: {},
      currentProjectId: null,
      currentComicId: null,

      createProject: (draft) => {
        const project = makeProject(draft)
        set((state) => ({
          projects: { ...state.projects, [project.id]: project },
          currentProjectId: project.id,
          currentComicId: null,
        }))
        return project
      },

      updateProject: (id, changes) =>
        set((state) => {
          const existing = state.projects[id]
          if (!existing) return state
          return {
            projects: {
              ...state.projects,
              [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
            },
          }
        }),

      deleteProject: (id) =>
        set((state) => {
          const projects = { ...state.projects }
          delete projects[id]

          // Cascade: a comic without its project is unreachable, so remove it
          // rather than leaving an orphan that inflates every save.
          const comics = Object.fromEntries(
            Object.entries(state.comics).filter(([, comic]) => comic.projectId !== id),
          )

          const droppedCurrentComic =
            state.currentComicId !== null && !(state.currentComicId in comics)

          return {
            projects,
            comics,
            currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
            currentComicId: droppedCurrentComic ? null : state.currentComicId,
          }
        }),

      duplicateProject: (id) => {
        const source = get().projects[id]
        if (!source) return null

        const timestamp = nowIso()
        const copy: Project = {
          ...source,
          id: newId(),
          title: `${source.title} (copy)`,
          createdAt: timestamp,
          updatedAt: timestamp,
        }

        // Comics are copied with fresh ids so the two projects stay independent.
        const copiedComics = Object.values(get().comics)
          .filter((comic) => comic.projectId === id)
          .map<Comic>((comic) => ({
            ...comic,
            id: newId(),
            projectId: copy.id,
            createdAt: timestamp,
            updatedAt: timestamp,
          }))

        set((state) => ({
          projects: { ...state.projects, [copy.id]: copy },
          comics: {
            ...state.comics,
            ...Object.fromEntries(copiedComics.map((comic) => [comic.id, comic])),
          },
        }))

        return copy
      },

      createComic: (projectId, title) => {
        const comic = makeComic(projectId, title)
        set((state) => ({
          comics: { ...state.comics, [comic.id]: comic },
          currentComicId: comic.id,
        }))
        return comic
      },

      updateComic: (id, changes) =>
        set((state) => {
          const existing = state.comics[id]
          if (!existing) return state
          return {
            comics: {
              ...state.comics,
              [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
            },
          }
        }),

      deleteComic: (id) =>
        set((state) => {
          const comics = { ...state.comics }
          delete comics[id]
          return {
            comics,
            currentComicId: state.currentComicId === id ? null : state.currentComicId,
          }
        }),

      setCurrentProject: (id) =>
        set((state) => ({
          currentProjectId: id,
          // Clear the comic when moving to a different project, so the header
          // can never show a comic that belongs somewhere else.
          currentComicId:
            state.currentComicId && state.comics[state.currentComicId]?.projectId === id
              ? state.currentComicId
              : null,
        })),

      setCurrentComic: (id) => set({ currentComicId: id }),

      replaceAll: ({ projects, comics }) =>
        set({ projects, comics, currentProjectId: null, currentComicId: null }),
    }),
    {
      name: 'panelforge.workspace',
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        projects: state.projects,
        comics: state.comics,
        currentProjectId: state.currentProjectId,
        currentComicId: state.currentComicId,
      }),
      onRehydrateStorage: () => (_state, error) => {
        // Hydration finishing is what unblocks the UI, so it is reported either
        // way -- a failed load must not leave the app stuck on a spinner.
        if (error) {
          const reason = error instanceof Error ? error.message : 'Unknown error'
          usePersistenceStore.getState().markError(`Could not restore your work: ${reason}`)
        }
        usePersistenceStore.getState().markHydrated()
      },
    },
  ),
)

/*
 * Derived views (sorted lists, filtered lists) deliberately live in
 * `workspace-selectors.ts` as memoised hooks rather than as selector functions
 * here. Passing a function that builds a new array straight into
 * `useWorkspaceStore(...)` causes an infinite render loop under Zustand v5,
 * which compares results by reference. See that file for the full explanation.
 */
