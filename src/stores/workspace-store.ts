import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { idbStorage } from '@/lib/persist'
import { usePersistenceStore } from './persistence-store'
import { createProjectSlice } from './slices/project-slice'
import { createCharacterSlice } from './slices/character-slice'
import { createAssetSlice } from './slices/asset-slice'
import { createWorldSlice } from './slices/world-slice'
import { createSelectionSlice } from './slices/selection-slice'
import type { WorkspaceState } from './slices/types'

/**
 * The workspace store: every entity the user has created, plus what they are
 * currently looking at.
 *
 * Shape notes:
 *
 * - Entities live in id-keyed records, not arrays. Lookups are the most common
 *   operation by far (every panel resolves a character, every page resolves
 *   its episode), and O(1) beats scanning an array each render. Ordering,
 *   where it matters, is carried by an explicit `index` field.
 *
 * - The state is plain JSON. No class instances, no Dates, no Maps -- all of
 *   which break structured serialisation. This is what lets the whole store
 *   round-trip through IndexedDB and, later, through a Postgres jsonb column
 *   or a project export file with no conversion layer.
 *
 * - Behaviour is split into slices under `slices/`, one per entity family.
 *   Each is typed against the whole store so cascades (deleting a project has
 *   to reach comics, characters and assets) stay in one place.
 *
 * Derived views (sorted lists, filtered lists) deliberately live in
 * `workspace-selectors.ts` as memoised hooks rather than as selector functions
 * here. Passing a function that builds a new array straight into
 * `useWorkspaceStore(...)` causes an infinite render loop under Zustand v5,
 * which compares results by reference. See that file for the full explanation.
 */
export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (...args) => ({
      ...createProjectSlice(...args),
      ...createCharacterSlice(...args),
      ...createAssetSlice(...args),
      ...createWorldSlice(...args),
      ...createSelectionSlice(...args),
    }),
    {
      name: 'panelforge.workspace',
      version: 3,
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        projects: state.projects,
        comics: state.comics,
        characters: state.characters,
        assets: state.assets,
        locations: state.locations,
        factions: state.factions,
        systems: state.systems,
        worldEvents: state.worldEvents,
        worldObjects: state.worldObjects,
        currentProjectId: state.currentProjectId,
        currentComicId: state.currentComicId,
      }),
      /*
       * Each phase adds collections. Rather than discard a user's work on
       * upgrade, missing collections are filled in with empty records.
       * v1 (phase 1): projects and comics only.
       * v2 (phase 2): + characters, assets.
       * v3 (phase 3): + locations, factions, systems, worldEvents, worldObjects.
       */
      migrate: (persisted, fromVersion) => {
        const state = (persisted ?? {}) as Partial<WorkspaceState>
        const filled = { ...state }
        if (fromVersion < 2) {
          filled.characters = filled.characters ?? {}
          filled.assets = filled.assets ?? {}
        }
        if (fromVersion < 3) {
          filled.locations = filled.locations ?? {}
          filled.factions = filled.factions ?? {}
          filled.systems = filled.systems ?? {}
          filled.worldEvents = filled.worldEvents ?? {}
          filled.worldObjects = filled.worldObjects ?? {}
        }
        return filled
      },
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

export type { WorkspaceState, WorkspaceData } from './slices/types'
export { EMPTY_WORKSPACE } from './slices/types'
