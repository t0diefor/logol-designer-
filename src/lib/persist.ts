import type { StateStorage } from 'zustand/middleware'
import { isIdbAvailable, kvDelete, kvGet, kvSet } from './idb'
import { usePersistenceStore } from '@/stores/persistence-store'

/**
 * A Zustand `persist` storage adapter backed by IndexedDB.
 *
 * Two behaviours worth knowing about:
 *
 * 1. Writes are debounced. Zustand calls `setItem` on every state change,
 *    which during a drag in the composer means hundreds of calls per second.
 *    Writing each one would saturate the IndexedDB transaction queue and make
 *    the UI stutter, so writes coalesce into one per `WRITE_DEBOUNCE_MS`.
 *
 * 2. Every write reports into the persistence store, which is what drives the
 *    autosave indicator. Failures surface to the user rather than being
 *    swallowed -- a silent storage failure loses someone's work.
 */

const WRITE_DEBOUNCE_MS = 400

let pendingWrite: ReturnType<typeof setTimeout> | null = null
let pendingValue: { name: string; value: string } | null = null

async function flushPendingWrite(): Promise<void> {
  if (!pendingValue) return
  const { name, value } = pendingValue
  pendingValue = null

  const persistence = usePersistenceStore.getState()
  persistence.markSaving()

  try {
    await kvSet(name, value)
    usePersistenceStore.getState().markSaved()
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown storage error'
    // QuotaExceededError is the realistic failure here, and the user can act
    // on it (delete assets), so the message names the likely cause.
    usePersistenceStore
      .getState()
      .markError(
        reason.includes('Quota') || reason.includes('quota')
          ? 'Storage is full. Remove some assets to keep saving.'
          : `Could not save: ${reason}`,
      )
  }
}

/** Forces any debounced write to disk immediately. Used by the manual Save shortcut. */
export async function flushNow(): Promise<void> {
  if (pendingWrite) {
    clearTimeout(pendingWrite)
    pendingWrite = null
  }
  await flushPendingWrite()
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    if (!isIdbAvailable()) {
      usePersistenceStore
        .getState()
        .markUnavailable('This browser blocks local storage, so changes will not be saved.')
      return null
    }
    try {
      const value = await kvGet<string>(name)
      return value ?? null
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown storage error'
      usePersistenceStore.getState().markError(`Could not load saved work: ${reason}`)
      return null
    }
  },

  setItem: async (name, value) => {
    if (!isIdbAvailable()) return

    pendingValue = { name, value }
    if (pendingWrite) clearTimeout(pendingWrite)
    pendingWrite = setTimeout(() => {
      pendingWrite = null
      void flushPendingWrite()
    }, WRITE_DEBOUNCE_MS)
  },

  removeItem: async (name) => {
    if (!isIdbAvailable()) return
    await kvDelete(name)
  },
}

/**
 * Flush on page hide so a debounced write is never lost to a tab close.
 * `visibilitychange` is used rather than `beforeunload` because it is the one
 * that reliably fires on mobile, where tabs are frozen rather than closed.
 */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushNow()
  })
}
