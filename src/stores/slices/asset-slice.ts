import { newId, nowIso } from '@/lib/id'
import { assetDelete } from '@/lib/idb'
import type { Collection } from '@/types/asset'
import type { AssetSlice, WorkspaceSliceCreator } from './types'

export const createAssetSlice: WorkspaceSliceCreator<AssetSlice> = (set) => ({
  assets: {},
  collections: {},

  addAsset: (asset) => set((state) => ({ assets: { ...state.assets, [asset.id]: asset } })),

  updateAsset: (id, changes) =>
    set((state) => {
      const existing = state.assets[id]
      if (!existing) return state
      return {
        assets: {
          ...state.assets,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  toggleAssetFavorite: (id) =>
    set((state) => {
      const existing = state.assets[id]
      if (!existing) return state
      return {
        assets: {
          ...state.assets,
          [id]: { ...existing, favorite: !existing.favorite, updatedAt: nowIso() },
        },
      }
    }),

  createCollection: (projectId, name) => {
    const timestamp = nowIso()
    const collection: Collection = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      name,
      description: '',
    }
    set((state) => ({ collections: { ...state.collections, [collection.id]: collection } }))
    return collection
  },

  updateCollection: (id, changes) =>
    set((state) => {
      const existing = state.collections[id]
      if (!existing) return state
      return {
        collections: {
          ...state.collections,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  deleteCollection: (id) =>
    set((state) => {
      const collections = { ...state.collections }
      delete collections[id]

      /*
       * Unfile, never cascade. A collection is a way of grouping assets, not
       * a container that owns them -- deleting the folder must not delete the
       * pictures, and an asset filed nowhere is a perfectly normal state.
       */
      const assets = { ...state.assets }
      for (const [assetId, asset] of Object.entries(assets)) {
        if (!asset.collectionIds.includes(id)) continue
        assets[assetId] = {
          ...asset,
          collectionIds: asset.collectionIds.filter((candidate) => candidate !== id),
          updatedAt: nowIso(),
        }
      }

      return { collections, assets }
    }),

  setAssetCollections: (assetId, collectionIds) =>
    set((state) => {
      const existing = state.assets[assetId]
      if (!existing) return state
      return {
        assets: {
          ...state.assets,
          [assetId]: { ...existing, collectionIds, updatedAt: nowIso() },
        },
      }
    }),

  deleteAsset: (id) => {
    set((state) => {
      const assets = { ...state.assets }
      const removed = assets[id]
      delete assets[id]
      if (!removed) return state

      /*
       * Detach the asset everywhere it is referenced, in the same update.
       * A dangling reference would render as a broken image with no way for
       * the user to clear it, so referential integrity is enforced here
       * rather than defended against at every render site.
       */
      const characters = { ...state.characters }
      for (const [characterId, character] of Object.entries(characters)) {
        const usedInReferences = character.references.some((ref) => ref.assetId === id)
        const usedInOutfits = character.outfits.some((outfit) =>
          outfit.references.some((ref) => ref.assetId === id),
        )
        const usedInExpressions = character.expressions.some(
          (expression) => expression.reference?.assetId === id,
        )
        if (!usedInReferences && !usedInOutfits && !usedInExpressions) continue

        characters[characterId] = {
          ...character,
          references: character.references.filter((ref) => ref.assetId !== id),
          outfits: character.outfits.map((outfit) => ({
            ...outfit,
            references: outfit.references.filter((ref) => ref.assetId !== id),
          })),
          expressions: character.expressions.map((expression) =>
            expression.reference?.assetId === id ? { ...expression, reference: null } : expression,
          ),
          updatedAt: nowIso(),
        }
      }

      const projects = { ...state.projects }
      for (const [projectId, project] of Object.entries(projects)) {
        if (project.coverAssetId !== id) continue
        projects[projectId] = { ...project, coverAssetId: null, updatedAt: nowIso() }
      }

      return { assets, characters, projects }
    })

    /*
     * The blob is deleted after the record, not before. If this fails the
     * user has an orphaned blob wasting quota, which Settings can report and
     * clean up; if it were deleted first and the state update then failed,
     * they would have a record pointing at bytes that no longer exist.
     */
    void assetDelete(id).catch((error: unknown) => {
      console.warn('[panelforge] Could not delete asset blob', id, error)
    })
  },
})
