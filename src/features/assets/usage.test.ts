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

/** A page holding one panel with `placements`, in the shape the store stores. */
function pageWith(placements: { refId: string | null; kind?: 'asset' | 'character' }[]) {
  return {
    p1: {
      id: 'pg1',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      ownerId: null,
      episodeId: 'e1',
      index: 3,
      size: { width: 477, height: 738, label: 'US Comic' },
      margin: 24,
      gutter: 12,
      background: null,
      templateId: null,
      notes: [],
      panels: [
        {
          id: 'pan1',
          rect: { x: 0, y: 0, width: 100, height: 100 },
          z: 0,
          radius: 0,
          borderWidth: 2,
          fill: null,
          description: '',
          shot: '',
          sceneId: null,
          notes: [],
          balloons: [],
          placements: placements.map((placement, index) => ({
            id: `pl${index}`,
            kind: placement.kind ?? ('asset' as const),
            refId: placement.refId,
            rect: { x: 0, y: 0, width: 50, height: 50 },
            rotation: 0,
            flipX: false,
            opacity: 1,
            variant: '',
            z: index,
          })),
        },
      ],
    },
  }
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

describe('panel placements, the reference site phase 6 added', () => {
  it('reports an asset placed in a panel', () => {
    const uses = findAssetUsage(workspace({ pages: pageWith([{ refId: ASSET }]) }), ASSET)

    // Reported, or the delete confirmation says "used nowhere" about an
    // asset that is on a page, and the placement breaks silently.
    expect(uses).toHaveLength(1)
    expect(uses[0]!.kind).toBe('panel-placement')
    expect(uses[0]!.label).toBe('Page 3, panel 1')
  })

  it('counts one use per panel, not per placement', () => {
    const data = workspace({ pages: pageWith([{ refId: ASSET }, { refId: ASSET }]) })

    expect(findAssetUsage(data, ASSET)).toHaveLength(1)
    expect(countAllAssetUsage(data).get(ASSET)).toBe(1)
  })

  it('ignores a character placement that happens to share the id', () => {
    const data = workspace({ pages: pageWith([{ refId: ASSET, kind: 'character' }]) })

    expect(findAssetUsage(data, ASSET)).toEqual([])
    expect(countAllAssetUsage(data).get(ASSET)).toBeUndefined()
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
