import { create } from 'zustand'
import { nowIso } from '@/lib/id'

/**
 * Tracks whether the user's work is safely written to disk.
 *
 * This exists so the autosave indicator tells the truth. An indicator that
 * always says "Saved" is worse than no indicator at all -- it teaches the user
 * to trust a signal that carries no information.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'unavailable'

interface PersistenceState {
  status: SaveStatus
  lastSavedAt: string | null
  /** Human-readable reason, shown when status is `error` or `unavailable`. */
  message: string | null
  /** True once the persisted state has been read back from IndexedDB. */
  hydrated: boolean

  markSaving: () => void
  markSaved: () => void
  markError: (message: string) => void
  markUnavailable: (message: string) => void
  markHydrated: () => void
}

export const usePersistenceStore = create<PersistenceState>()((set) => ({
  status: 'idle',
  lastSavedAt: null,
  message: null,
  hydrated: false,

  markSaving: () => set({ status: 'saving', message: null }),
  markSaved: () => set({ status: 'saved', lastSavedAt: nowIso(), message: null }),
  markError: (message) => set({ status: 'error', message }),
  markUnavailable: (message) => set({ status: 'unavailable', message }),
  markHydrated: () => set({ hydrated: true }),
}))
