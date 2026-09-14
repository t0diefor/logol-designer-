import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '../workspace-store'
import { newId } from '@/lib/id'

function reset() {
  useWorkspaceStore.setState({
    projects: {},
    comics: {},
    characters: {},
    assets: {},
    currentProjectId: null,
    currentComicId: null,
  })
}

const store = () => useWorkspaceStore.getState()

describe('character slice', () => {
  beforeEach(reset)

  it('creates a character with an empty but complete sheet', () => {
    const character = store().createCharacter('project-1', 'Mira Halloway')

    expect(character.name).toBe('Mira Halloway')
    expect(character.projectId).toBe('project-1')
    // Every collection must exist, so no section has to guard against undefined.
    expect(character.outfits).toEqual([])
    expect(character.expressions).toEqual([])
    expect(character.appearance.hair).toBe('')
    expect(character.versions).toEqual([])
  })

  it('duplicates with fresh ids so the copy is fully independent', () => {
    const original = store().createCharacter('p1', 'Mira')
    store().updateCharacter(original.id, {
      outfits: [
        {
          id: newId(),
          name: 'Everyday',
          description: 'coat',
          accessories: '',
          palette: { name: '', colors: [] },
          references: [],
          isDefault: true,
        },
      ],
      expressions: [{ id: newId(), name: 'Angry', description: '', reference: null }],
    })

    const copy = store().duplicateCharacter(original.id)
    expect(copy).not.toBeNull()

    const source = store().characters[original.id]!
    const clone = store().characters[copy!.id]!

    expect(clone.name).toBe('Mira (copy)')
    expect(clone.id).not.toBe(source.id)
    expect(clone.outfits[0]!.id).not.toBe(source.outfits[0]!.id)
    expect(clone.expressions[0]!.id).not.toBe(source.expressions[0]!.id)
    // Content is carried over even though the ids are new.
    expect(clone.outfits[0]!.description).toBe('coat')
  })

  it('does not copy version history onto a duplicate', () => {
    const original = store().createCharacter('p1', 'Mira')
    store().snapshotCharacter(original.id, 'A point')

    const copy = store().duplicateCharacter(original.id)!
    expect(store().characters[copy.id]!.versions).toEqual([])
    expect(store().characters[original.id]!.versions).toHaveLength(1)
  })

  it('keeps the written note when a linked character is deleted', () => {
    const mira = store().createCharacter('p1', 'Mira')
    const elias = store().createCharacter('p1', 'Elias')

    store().updateCharacter(mira.id, {
      relationships: [
        {
          id: newId(),
          targetCharacterId: elias.id,
          targetName: '',
          kind: 'Former mentor',
          description: 'He testified against her.',
        },
      ],
    })

    store().deleteCharacter(elias.id)

    const relationship = store().characters[mira.id]!.relationships[0]!
    // The link is cleared but the writing survives, with the name filled in.
    expect(relationship.targetCharacterId).toBeNull()
    expect(relationship.targetName).toBe('Elias')
    expect(relationship.kind).toBe('Former mentor')
    expect(relationship.description).toBe('He testified against her.')
  })

  it('round-trips a snapshot through restore', () => {
    const character = store().createCharacter('p1', 'Mira')
    store().updateCharacter(character.id, { backstory: 'Original history' })
    store().snapshotCharacter(character.id, 'Before rewrite')

    store().updateCharacter(character.id, { backstory: 'Rewritten and worse' })
    expect(store().characters[character.id]!.backstory).toBe('Rewritten and worse')

    const versionId = store().characters[character.id]!.versions[0]!.id
    const ok = store().restoreCharacterVersion(character.id, versionId)

    expect(ok).toBe(true)
    expect(store().characters[character.id]!.backstory).toBe('Original history')
  })

  it('snapshots the current state before restoring, so a restore is undoable', () => {
    const character = store().createCharacter('p1', 'Mira')
    store().updateCharacter(character.id, { backstory: 'First' })
    store().snapshotCharacter(character.id, 'v1')
    store().updateCharacter(character.id, { backstory: 'Second' })

    const v1 = store().characters[character.id]!.versions[0]!.id
    store().restoreCharacterVersion(character.id, v1)

    const versions = store().characters[character.id]!.versions
    expect(versions).toHaveLength(2)
    expect(versions[1]!.label).toBe('Before restore')

    // Restoring that automatic point must bring back the state we left.
    store().restoreCharacterVersion(character.id, versions[1]!.id)
    expect(store().characters[character.id]!.backstory).toBe('Second')
  })

  it('never nests a snapshot inside another snapshot', () => {
    const character = store().createCharacter('p1', 'Mira')
    store().snapshotCharacter(character.id, 'one')
    store().snapshotCharacter(character.id, 'two')

    const second = store().characters[character.id]!.versions[1]!
    const payload = JSON.parse(second.snapshot) as Record<string, unknown>
    // Storage would grow quadratically if versions were included.
    expect(payload).not.toHaveProperty('versions')
  })

  it('caps stored versions so history cannot grow without bound', () => {
    const character = store().createCharacter('p1', 'Mira')
    for (let index = 0; index < 30; index += 1) {
      store().snapshotCharacter(character.id, `v${index}`)
    }

    const versions = store().characters[character.id]!.versions
    expect(versions).toHaveLength(25)
    // The oldest are dropped, not the newest.
    expect(versions[versions.length - 1]!.label).toBe('v29')
  })

  it('refuses to restore a corrupted snapshot instead of destroying the character', () => {
    const character = store().createCharacter('p1', 'Mira')
    store().updateCharacter(character.id, { backstory: 'Intact' })
    store().snapshotCharacter(character.id, 'broken')

    const versionId = store().characters[character.id]!.versions[0]!.id
    store().updateCharacter(character.id, {
      versions: store().characters[character.id]!.versions.map((v) => ({
        ...v,
        snapshot: '{not json',
      })),
    })

    expect(store().restoreCharacterVersion(character.id, versionId)).toBe(false)
    expect(store().characters[character.id]!.backstory).toBe('Intact')
  })

  it('cascades character deletion when the project is deleted', () => {
    const project = store().createProject({ title: 'P', logline: '', genre: '' })
    const character = store().createCharacter(project.id, 'Mira')
    const other = store().createProject({ title: 'Q', logline: '', genre: '' })
    const survivor = store().createCharacter(other.id, 'Elias')

    store().deleteProject(project.id)

    expect(store().characters[character.id]).toBeUndefined()
    expect(store().characters[survivor.id]).toBeDefined()
  })
})
