import { newId, nowIso } from '@/lib/id'
import { US_COMIC_PAGE, type Comic } from '@/types/comic'
import type { Project, ProjectDraft } from '@/types/project'
import type { ProjectSlice, WorkspaceSliceCreator } from './types'

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

export const createProjectSlice: WorkspaceSliceCreator<ProjectSlice> = (set, get) => ({
  projects: {},
  comics: {},

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

      /*
       * Cascade. A comic, character or asset whose project is gone is
       * unreachable, and leaving orphans behind would inflate every
       * subsequent save with data no screen can ever show.
       */
      const belongsElsewhere = <T extends { projectId: string }>(record: Record<string, T>) =>
        Object.fromEntries(Object.entries(record).filter(([, item]) => item.projectId !== id))

      const comics = belongsElsewhere(state.comics)
      const characters = belongsElsewhere(state.characters)
      const assets = belongsElsewhere(state.assets)

      const droppedCurrentComic =
        state.currentComicId !== null && !(state.currentComicId in comics)

      return {
        projects,
        comics,
        characters,
        assets,
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
})
