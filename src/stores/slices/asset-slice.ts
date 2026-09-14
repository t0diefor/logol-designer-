import { nowIso } from '@/lib/id'
import { assetDelete } from '@/lib/idb'
import type { AssetSlice, WorkspaceSliceCreator } from './types'

export const createAssetSlice: WorkspaceSliceCreator<AssetSlice> = (set) => ({
  assets: {},

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
