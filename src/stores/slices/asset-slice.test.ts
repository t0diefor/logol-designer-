import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '../workspace-store'
import { EMPTY_WORKSPACE } from './types'
import { newId, nowIso } from '@/lib/id'
import type { Asset } from '@/types/asset'

const store = () => useWorkspaceStore.getState()

function makeAsset(projectId: string, overrides: Partial<Asset> = {}): Asset {
  const id = newId()
  const timestamp = nowIso()
  return {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: null,
    projectId,
    name: 'Reference',
    kind: 'other',
    source: 'uploaded',
    mimeType: 'image/png',
    byteSize: 1024,
    width: 100,
    height: 100,
    blobKey: id,
    generationPrompt: '',
    generationProvider: '',
    collectionIds: [],
    tags: [],
    favorite: false,
    description: '',
    ...overrides,
  }
}

describe('asset slice', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  it('toggles favourite both ways', () => {
    const asset = makeAsset('p1')
    store().addAsset(asset)

    store().toggleAssetFavorite(asset.id)
    expect(store().assets[asset.id]!.favorite).toBe(true)
    store().toggleAssetFavorite(asset.id)
    expect(store().assets[asset.id]!.favorite).toBe(false)
  })

  describe('collections', () => {
    it('unfiles assets instead of deleting them', () => {
      const collection = store().createCollection('p1', 'Moodboard')
      const asset = makeAsset('p1', { collectionIds: [collection.id] })
      store().addAsset(asset)

      store().deleteCollection(collection.id)

      // A collection groups assets; it does not own them.
      expect(store().assets[asset.id]).toBeDefined()
      expect(store().assets[asset.id]!.collectionIds).toEqual([])
    })

    it('leaves other collections on the asset intact', () => {
      const keep = store().createCollection('p1', 'Keep')
      const drop = store().createCollection('p1', 'Drop')
      const asset = makeAsset('p1', { collectionIds: [keep.id, drop.id] })
      store().addAsset(asset)

      store().deleteCollection(drop.id)
      expect(store().assets[asset.id]!.collectionIds).toEqual([keep.id])
    })

    it('files an asset into several collections at once', () => {
      const a = store().createCollection('p1', 'A')
      const b = store().createCollection('p1', 'B')
      const asset = makeAsset('p1')
      store().addAsset(asset)

      store().setAssetCollections(asset.id, [a.id, b.id])
      expect(store().assets[asset.id]!.collectionIds).toEqual([a.id, b.id])
    })

    it('cascades collections when the project is deleted', () => {
      const project = store().createProject({ title: 'Doomed', logline: '', genre: '' })
      const collection = store().createCollection(project.id, 'Moodboard')

      const other = store().createProject({ title: 'Safe', logline: '', genre: '' })
      const survivor = store().createCollection(other.id, 'Kept')

      store().deleteProject(project.id)

      expect(store().collections[collection.id]).toBeUndefined()
      expect(store().collections[survivor.id]).toBeDefined()
    })
  })

  describe('deletion', () => {
    it('detaches the asset from every character reference site', () => {
      const asset = makeAsset('p1')
      store().addAsset(asset)

      const character = store().createCharacter('p1', 'Mira')
      store().updateCharacter(character.id, {
        references: [{ assetId: asset.id, label: 'face' }],
        outfits: [
          {
            id: newId(),
            name: 'Everyday',
            description: '',
            accessories: '',
            palette: { name: '', colors: [] },
            references: [{ assetId: asset.id, label: '' }],
            isDefault: true,
          },
        ],
        expressions: [
          { id: newId(), name: 'Angry', description: '', reference: { assetId: asset.id, label: '' } },
        ],
      })

      store().deleteAsset(asset.id)

      const updated = store().characters[character.id]!
      // A dangling reference renders as a broken image with no way to clear it.
      expect(updated.references).toEqual([])
      expect(updated.outfits[0]!.references).toEqual([])
      expect(updated.expressions[0]!.reference).toBeNull()
    })

    it('clears a project cover that pointed at it', () => {
      const project = store().createProject({ title: 'P', logline: '', genre: '' })
      const asset = makeAsset(project.id)
      store().addAsset(asset)
      store().updateProject(project.id, { coverAssetId: asset.id })

      store().deleteAsset(asset.id)
      expect(store().projects[project.id]!.coverAssetId).toBeNull()
    })

    it('leaves characters that never referenced it untouched', () => {
      const asset = makeAsset('p1')
      store().addAsset(asset)
      const other = store().createCharacter('p1', 'Elias')
      const before = store().characters[other.id]!.updatedAt

      store().deleteAsset(asset.id)
      expect(store().characters[other.id]!.updatedAt).toBe(before)
    })

    it('cascades assets when the project is deleted', () => {
      const project = store().createProject({ title: 'Doomed', logline: '', genre: '' })
      const asset = makeAsset(project.id)
      store().addAsset(asset)

      store().deleteProject(project.id)
      expect(store().assets[asset.id]).toBeUndefined()
    })
  })
})
