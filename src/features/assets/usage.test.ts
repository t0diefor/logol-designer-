import { describe, expect, it } from 'vitest'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'
import { countAllAssetUsage, findAssetUsage } from './usage'
import type { WorkspaceData } from '@/stores/slices/types'
import type { Character } from '@/types/character'

const ASSET = 'asset-1'

function character(overrides: Partial<Character>): Character {
  return {
    id: 'c1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ownerId: null,
    projectId: 'p1',
    name: 'Mira',
    role: '',
    pronouns: '',
    ageRange: '',
    appearance: {
      hair: '', eyes: '', skinTone: '', bodyType: '', height: '',
      distinguishingMarks: '', general: '',
    },
    outfits: [],
    expressions: [],
    personality: [],
    powers: '',
    weaknesses: '',
    goals: '',
    backstory: '',
    dialogueStyle: '',
    relationships: [],
    references: [],
    palette: { name: '', colors: [] },
    notes: [],
    tags: [],
    versions: [],
    ...overrides,
  }
}

function workspace(overrides: Partial<WorkspaceData>): WorkspaceData {
  return { ...EMPTY_WORKSPACE, ...overrides }
}

describe('findAssetUsage', () => {
  it('finds nothing for an unused asset', () => {
    expect(findAssetUsage(workspace({}), ASSET)).toEqual([])
  })

  it('finds a character reference', () => {
    const data = workspace({
      characters: {
        c1: character({ references: [{ assetId: ASSET, label: 'face' }] }),
      },
    })

    const uses = findAssetUsage(data, ASSET)
    expect(uses).toHaveLength(1)
    expect(uses[0]!.kind).toBe('character-reference')
    expect(uses[0]!.label).toBe('Mira')
    expect(uses[0]!.href).toBe('/characters/c1')
  })

  it('finds references nested inside outfits and expressions', () => {
    const data = workspace({
      characters: {
        c1: character({
          outfits: [
            {
              id: 'o1',
              name: 'Everyday',
              description: '',
              accessories: '',
              palette: { name: '', colors: [] },
              references: [{ assetId: ASSET, label: '' }],
              isDefault: true,
            },
          ],
          expressions: [
            { id: 'e1', name: 'Angry', description: '', reference: { assetId: ASSET, label: '' } },
          ],
        }),
      },
    })

    const kinds = findAssetUsage(data, ASSET).map((use) => use.kind)
    // Nested references are exactly what a shallow check would miss.
    expect(kinds).toContain('character-outfit')
    expect(kinds).toContain('character-expression')
  })

  it('names the specific outfit or expression, not just the character', () => {
    const data = workspace({
      characters: {
        c1: character({
          expressions: [
            { id: 'e1', name: 'Furious', description: '', reference: { assetId: ASSET, label: '' } },
          ],
        }),
      },
    })

    expect(findAssetUsage(data, ASSET)[0]!.label).toBe('Mira — Furious')
  })

  it('finds a project cover', () => {
    const data = workspace({
      projects: {
        p1: {
          id: 'p1', createdAt: '', updatedAt: '', ownerId: null,
          title: 'Lantern', logline: '', description: '', genre: '',
          status: 'planning', palette: { name: '', colors: [] }, tags: [],
          coverAssetId: ASSET, preferredThemeId: null,
        },
      },
    })

    expect(findAssetUsage(data, ASSET)[0]!.kind).toBe('project-cover')
  })

  it('reports every distinct use of the same asset', () => {
    const data = workspace({
      characters: {
        c1: character({
          references: [{ assetId: ASSET, label: '' }],
          expressions: [
            { id: 'e1', name: 'A', description: '', reference: { assetId: ASSET, label: '' } },
            { id: 'e2', name: 'B', description: '', reference: { assetId: ASSET, label: '' } },
          ],
        }),
      },
    })

    expect(findAssetUsage(data, ASSET)).toHaveLength(3)
  })
})

describe('countAllAssetUsage', () => {
  it('agrees with findAssetUsage, which is what the badges promise', () => {
    const data = workspace({
      characters: {
        c1: character({
          references: [{ assetId: ASSET, label: '' }],
          expressions: [
            { id: 'e1', name: 'A', description: '', reference: { assetId: ASSET, label: '' } },
          ],
        }),
      },
    })

    // The one-pass count and the per-asset walk must never disagree: the count
    // is shown on the card, the walk in the delete confirmation.
    expect(countAllAssetUsage(data).get(ASSET)).toBe(findAssetUsage(data, ASSET).length)
  })

  it('omits assets that are used nowhere', () => {
    expect(countAllAssetUsage(workspace({})).get(ASSET)).toBeUndefined()
  })
})
