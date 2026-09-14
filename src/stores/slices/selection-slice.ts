import type { SelectionSlice, WorkspaceSliceCreator } from './types'

export const createSelectionSlice: WorkspaceSliceCreator<SelectionSlice> = (set) => ({
  currentProjectId: null,
  currentComicId: null,

  setCurrentProject: (id) =>
    set((state) => ({
      currentProjectId: id,
      // Clear the comic when moving to a different project, so the header can
      // never show a comic that belongs somewhere else.
      currentComicId:
        state.currentComicId && state.comics[state.currentComicId]?.projectId === id
          ? state.currentComicId
          : null,
    })),

  setCurrentComic: (id) => set({ currentComicId: id }),

  replaceAll: ({ projects, comics, characters, assets }) =>
    set({ projects, comics, characters, assets, currentProjectId: null, currentComicId: null }),
})
