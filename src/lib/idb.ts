import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * IndexedDB access layer.
 *
 * Why not localStorage: it caps at roughly 5MB, stores strings only, and is
 * synchronous (so every write blocks the main thread). A single comic page
 * with a few embedded references would exceed that budget on its own.
 * localStorage is used only for theme preferences, which are tiny and must be
 * read synchronously on first paint.
 *
 * Two stores, kept separate on purpose:
 *  - `kv`     JSON documents (projects, characters, worlds, stories, pages).
 *  - `assets` binary Blobs. Keeping these out of the document store means
 *             saving a document never rewrites megabytes of image data, and
 *             it mirrors the eventual split between Postgres and Supabase
 *             Storage in Phase 9.
 */

const DB_NAME = 'panelforge'
const DB_VERSION = 1

export interface StoredAsset {
  id: string
  blob: Blob
  mimeType: string
  byteSize: number
  createdAt: string
}

interface PanelForgeDB extends DBSchema {
  kv: {
    key: string
    value: unknown
  }
  assets: {
    key: string
    value: StoredAsset
  }
}

let dbPromise: Promise<IDBPDatabase<PanelForgeDB>> | null = null

/** Opens (and upgrades) the database. Safe to call repeatedly. */
export function getDb(): Promise<IDBPDatabase<PanelForgeDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PanelForgeDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('kv')) {
          db.createObjectStore('kv')
        }
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' })
        }
      },
      blocked() {
        console.warn('[panelforge] Another tab is holding an old database version open.')
      },
    })
  }
  return dbPromise
}

/**
 * True when IndexedDB is usable at all.
 *
 * It is absent in some server contexts and blocked outright by Firefox in
 * private browsing, so every caller needs a path for "storage is unavailable"
 * rather than assuming persistence always works.
 */
export function isIdbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb()
  return (await db.get('kv', key)) as T | undefined
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDb()
  await db.put('kv', value, key)
}

export async function kvDelete(key: string): Promise<void> {
  const db = await getDb()
  await db.delete('kv', key)
}

export async function assetPut(asset: StoredAsset): Promise<void> {
  const db = await getDb()
  await db.put('assets', asset)
}

export async function assetGet(id: string): Promise<StoredAsset | undefined> {
  const db = await getDb()
  return db.get('assets', id)
}

export async function assetDelete(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('assets', id)
}

/** Rough total of stored asset bytes, for the storage meter in Settings. */
export async function assetTotalBytes(): Promise<number> {
  const db = await getDb()
  const all = await db.getAll('assets')
  return all.reduce((total, asset) => total + asset.byteSize, 0)
}

/**
 * Browser-reported storage usage and quota, when available.
 * Returns null where the Storage API is unsupported.
 */
export async function getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) return null
  const estimate = await navigator.storage.estimate()
  return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
}
