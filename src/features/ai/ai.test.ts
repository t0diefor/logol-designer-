import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { mockProvider } from './providers/mock-provider'
import {
  buildPatch,
  isProposalStale,
  readCharacterField,
  writeCharacterField,
  type ReviewableProposal,
} from './types'
import { buildConsistencyChecklist, type Character } from '@/types/character'

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  useWorkspaceStore.setState({ characters: {} })
  const base = useWorkspaceStore.getState().createCharacter('p1', 'Mira Halloway')
  return { ...base, ...overrides }
}

const liveSignal = () => new AbortController().signal

describe('AI field mapping', () => {
  it('flattens the personality array for a uniform review UI', () => {
    const character = makeTestCharacter({ personality: ['stubborn', 'watchful'] })
    expect(readCharacterField(character, 'personality')).toBe('stubborn, watchful')
  })

  it('splits personality back into an array on write', () => {
    const character = makeTestCharacter()
    const patch = writeCharacterField(character, 'personality', ' stubborn , watchful ,, ')
    expect(patch.personality).toEqual(['stubborn', 'watchful'])
  })

  it('writes nested appearance fields without dropping their siblings', () => {
    const character = makeTestCharacter({
      appearance: {
        hair: 'auburn',
        eyes: 'brown',
        skinTone: '',
        bodyType: '',
        height: '',
        distinguishingMarks: '',
        general: '',
      },
    })

    const patch = writeCharacterField(character, 'appearance.eyes', 'grey')
    expect(patch.appearance?.eyes).toBe('grey')
    expect(patch.appearance?.hair).toBe('auburn')
  })
})

describe('buildPatch', () => {
  const proposal = (over: Partial<ReviewableProposal>): ReviewableProposal => ({
    key: 'goals',
    label: 'Goals',
    current: '',
    proposed: 'p',
    rationale: 'r',
    decision: 'pending',
    edited: 'p',
    ...over,
  })

  it('includes only accepted proposals', () => {
    const character = makeTestCharacter()
    const patch = buildPatch(character, [
      proposal({ key: 'goals', decision: 'accepted', edited: 'Wants out' }),
      proposal({ key: 'weaknesses', decision: 'rejected', edited: 'Should not appear' }),
      proposal({ key: 'powers', decision: 'pending', edited: 'Should not appear either' }),
    ])

    expect(patch.patch).toEqual({ goals: 'Wants out' })
    expect(patch.appliedCount).toBe(1)
  })

  it('uses the user’s edited text, not the original suggestion', () => {
    const character = makeTestCharacter()
    const patch = buildPatch(character, [
      proposal({ decision: 'accepted', proposed: 'Original', edited: 'What I actually want' }),
    ])
    expect(patch.patch.goals).toBe('What I actually want')
  })

  it('merges several accepted appearance fields instead of keeping only the last', () => {
    const character = makeTestCharacter()
    const patch = buildPatch(character, [
      proposal({ key: 'appearance.hair', decision: 'accepted', edited: 'Auburn' }),
      proposal({ key: 'appearance.eyes', decision: 'accepted', edited: 'Brown' }),
    ])

    expect(patch.patch.appearance?.hair).toBe('Auburn')
    expect(patch.patch.appearance?.eyes).toBe('Brown')
  })

  it('refuses a proposal whose field changed after it was generated', () => {
    // The proposal was made against an empty field...
    const character = makeTestCharacter({ goals: 'Something I typed while reviewing' })
    const result = buildPatch(character, [
      proposal({ key: 'goals', decision: 'accepted', current: '', edited: 'The suggestion' }),
    ])

    // ...so it must not overwrite what the user has since written.
    expect(result.patch).toEqual({})
    expect(result.skipped).toEqual(['goals'])
    expect(result.appliedCount).toBe(0)
  })

  it('applies a stale proposal once it has been re-based onto the live value', () => {
    const character = makeTestCharacter({ goals: 'Something I typed while reviewing' })
    const result = buildPatch(character, [
      proposal({
        key: 'goals',
        decision: 'accepted',
        // A rebase rewrites `current` to the live value, which is the explicit
        // "yes, replace what I wrote" action.
        current: 'Something I typed while reviewing',
        edited: 'The suggestion',
      }),
    ])

    expect(result.patch.goals).toBe('The suggestion')
    expect(result.skipped).toEqual([])
  })

  it('applies fresh proposals even when a sibling has gone stale', () => {
    const character = makeTestCharacter({ goals: 'Typed since' })
    const result = buildPatch(character, [
      proposal({ key: 'goals', decision: 'accepted', current: '', edited: 'Stale one' }),
      proposal({ key: 'weaknesses', decision: 'accepted', current: '', edited: 'Fresh one' }),
    ])

    expect(result.patch).toEqual({ weaknesses: 'Fresh one' })
    expect(result.skipped).toEqual(['goals'])
    expect(result.appliedCount).toBe(1)
  })

  it('skips an accepted proposal the user emptied out', () => {
    const character = makeTestCharacter()
    const patch = buildPatch(character, [proposal({ decision: 'accepted', edited: '   ' })])
    expect(patch.patch).toEqual({})
    expect(patch.appliedCount).toBe(0)
  })
})

describe('isProposalStale', () => {
  const base = {
    key: 'goals' as const,
    label: 'Goals',
    proposed: 'p',
    rationale: 'r',
  }

  it('is false while the field still holds what the proposal saw', () => {
    const character = makeTestCharacter({ goals: '' })
    expect(isProposalStale(character, { ...base, current: '' })).toBe(false)
  })

  it('is true once the field has been edited underneath', () => {
    const character = makeTestCharacter({ goals: 'Edited in another tab' })
    expect(isProposalStale(character, { ...base, current: '' })).toBe(true)
  })

  it('handles the array-backed personality field', () => {
    const character = makeTestCharacter({ personality: ['stubborn'] })
    expect(
      isProposalStale(character, { ...base, key: 'personality', current: '' }),
    ).toBe(true)
    expect(
      isProposalStale(character, { ...base, key: 'personality', current: 'stubborn' }),
    ).toBe(false)
  })
})

describe('mock provider', () => {
  beforeEach(() => useWorkspaceStore.setState({ characters: {} }))

  it('reports itself as unconfigured, so the UI shows mock mode', () => {
    expect(mockProvider.status.configured).toBe(false)
    expect(mockProvider.status.estimatedCostCad).toBe(0)
  })

  it('only claims the tools it can actually perform', () => {
    // Overstating capability is the failure mode this guards against.
    expect(mockProvider.status.supports).not.toContain('image.generate')
    expect(mockProvider.status.supports).toContain('character.expand')
  })

  it('never proposes a change to a field the user has written', async () => {
    const character = makeTestCharacter({
      goals: 'Already written by the user',
      dialogueStyle: 'Also written',
    })

    const proposals = await mockProvider.expandCharacter(character, { signal: liveSignal() })
    const keys = proposals.map((proposal) => proposal.key)

    expect(keys).not.toContain('goals')
    expect(keys).not.toContain('dialogueStyle')
    // And every proposal it does make is against an empty field.
    for (const proposal of proposals) {
      expect(proposal.current).toBe('')
    }
  })

  it('is deterministic for the same character', async () => {
    const character = makeTestCharacter()
    const first = await mockProvider.expandCharacter(character, { signal: liveSignal() })
    const second = await mockProvider.expandCharacter(character, { signal: liveSignal() })
    expect(first.map((p) => p.proposed)).toEqual(second.map((p) => p.proposed))
  })

  it('differs between characters', async () => {
    const mira = makeTestCharacter({ name: 'Mira Halloway', role: 'Protagonist' })
    const elias = { ...mira, name: 'Elias Warde', role: 'Antagonist' }

    const a = await mockProvider.expandCharacter(mira, { signal: liveSignal() })
    const b = await mockProvider.expandCharacter(elias, { signal: liveSignal() })
    expect(a.map((p) => p.proposed)).not.toEqual(b.map((p) => p.proposed))
  })

  it('rejects with AbortError when cancelled', async () => {
    const character = makeTestCharacter()
    const controller = new AbortController()
    const pending = mockProvider.expandCharacter(character, { signal: controller.signal })
    controller.abort()

    await expect(pending).rejects.toThrow(/cancelled/i)
  })

  it('returns nothing when the sheet is already complete', async () => {
    const character = makeTestCharacter({
      role: 'x',
      pronouns: 'x',
      ageRange: 'x',
      appearance: {
        hair: 'x',
        eyes: 'x',
        skinTone: 'x',
        bodyType: 'x',
        height: 'x',
        distinguishingMarks: 'x',
        general: 'x',
      },
      personality: ['x'],
      powers: 'x',
      weaknesses: 'x',
      goals: 'x',
      backstory: 'x',
      dialogueStyle: 'x',
    })

    const proposals = await mockProvider.expandCharacter(character, { signal: liveSignal() })
    expect(proposals).toEqual([])
  })
})

describe('consistency checklist', () => {
  it('is empty-handed on a new character and explains every gap', () => {
    const character = makeTestCharacter()
    const items = buildConsistencyChecklist(character)

    expect(items.every((item) => !item.complete)).toBe(true)
    expect(items.every((item) => item.reason.length > 0)).toBe(true)
  })

  it('requires three expressions, not one', () => {
    const character = makeTestCharacter({
      expressions: [
        { id: '1', name: 'Neutral', description: '', reference: null },
        { id: '2', name: 'Angry', description: '', reference: null },
      ],
    })

    const item = buildConsistencyChecklist(character).find((i) => i.id === 'expressions')!
    expect(item.complete).toBe(false)
  })

  it('counts a default outfit only when one is actually marked default', () => {
    const outfit = {
      id: '1',
      name: 'Everyday',
      description: '',
      accessories: '',
      palette: { name: '', colors: [] },
      references: [],
      isDefault: false,
    }

    expect(
      buildConsistencyChecklist(makeTestCharacter({ outfits: [outfit] })).find(
        (i) => i.id === 'outfit',
      )!.complete,
    ).toBe(false)

    expect(
      buildConsistencyChecklist(
        makeTestCharacter({ outfits: [{ ...outfit, isDefault: true }] }),
      ).find((i) => i.id === 'outfit')!.complete,
    ).toBe(true)
  })
})
