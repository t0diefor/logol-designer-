import { newId, nowIso } from '@/lib/id'
import type { Character, CharacterVersion } from '@/types/character'
import type { CharacterSlice, WorkspaceSliceCreator } from './types'

/** How many snapshots to keep per character before the oldest is dropped. */
const MAX_VERSIONS = 25

export function makeCharacter(projectId: string, name: string): Character {
  const timestamp = nowIso()
  return {
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: null,
    projectId,
    name,
    role: '',
    pronouns: '',
    ageRange: '',
    appearance: {
      hair: '',
      eyes: '',
      skinTone: '',
      bodyType: '',
      height: '',
      distinguishingMarks: '',
      general: '',
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
  }
}

/**
 * Fields captured in a version snapshot.
 *
 * `versions` is excluded deliberately: including it would nest every previous
 * snapshot inside the next one, so storage would grow quadratically with the
 * number of saves. Identity and timestamps are excluded because restoring must
 * not change which character this is or when it was created.
 */
function snapshotPayload(character: Character) {
  const { id: _id, createdAt: _c, updatedAt: _u, ownerId: _o, projectId: _p, versions: _v, ...rest } =
    character
  return rest
}

type SnapshotPayload = ReturnType<typeof snapshotPayload>

function makeVersion(character: Character, label: string): CharacterVersion {
  return {
    id: newId(),
    createdAt: nowIso(),
    label,
    snapshot: JSON.stringify(snapshotPayload(character)),
  }
}

/** Appends a version, trimming the oldest once the cap is reached. */
function withVersion(character: Character, label: string): CharacterVersion[] {
  const next = [...character.versions, makeVersion(character, label)]
  return next.length > MAX_VERSIONS ? next.slice(next.length - MAX_VERSIONS) : next
}

export const createCharacterSlice: WorkspaceSliceCreator<CharacterSlice> = (set, get) => ({
  characters: {},

  createCharacter: (projectId, name) => {
    const character = makeCharacter(projectId, name)
    set((state) => ({ characters: { ...state.characters, [character.id]: character } }))
    return character
  },

  updateCharacter: (id, changes) =>
    set((state) => {
      const existing = state.characters[id]
      if (!existing) return state
      return {
        characters: {
          ...state.characters,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  deleteCharacter: (id) =>
    set((state) => {
      const characters = { ...state.characters }
      delete characters[id]

      /*
       * Relationships pointing at the deleted character are rewritten rather
       * than dropped: the connection was real, and the remaining character's
       * sheet should still say "sister: Mira" instead of silently losing a
       * line the writer wrote. The id is cleared and the name kept.
       */
      const removedName = state.characters[id]?.name ?? ''
      for (const [characterId, character] of Object.entries(characters)) {
        if (!character.relationships.some((r) => r.targetCharacterId === id)) continue
        characters[characterId] = {
          ...character,
          relationships: character.relationships.map((relationship) =>
            relationship.targetCharacterId === id
              ? {
                  ...relationship,
                  targetCharacterId: null,
                  targetName: relationship.targetName || removedName,
                }
              : relationship,
          ),
          updatedAt: nowIso(),
        }
      }

      return { characters }
    }),

  duplicateCharacter: (id) => {
    const source = get().characters[id]
    if (!source) return null

    const timestamp = nowIso()
    const copy: Character = {
      ...source,
      id: newId(),
      name: `${source.name} (copy)`,
      createdAt: timestamp,
      updatedAt: timestamp,
      // Outfits and expressions get fresh ids so editing the copy cannot
      // reach into the original through a shared id.
      outfits: source.outfits.map((outfit) => ({ ...outfit, id: newId() })),
      expressions: source.expressions.map((expression) => ({ ...expression, id: newId() })),
      relationships: source.relationships.map((relationship) => ({
        ...relationship,
        id: newId(),
      })),
      notes: source.notes.map((note) => ({ ...note, id: newId() })),
      // History belongs to the original, not the copy.
      versions: [],
    }

    set((state) => ({ characters: { ...state.characters, [copy.id]: copy } }))
    return copy
  },

  snapshotCharacter: (id, label) =>
    set((state) => {
      const existing = state.characters[id]
      if (!existing) return state
      return {
        characters: {
          ...state.characters,
          [id]: { ...existing, versions: withVersion(existing, label) },
        },
      }
    }),

  restoreCharacterVersion: (characterId, versionId) => {
    const character = get().characters[characterId]
    if (!character) return false

    const version = character.versions.find((v) => v.id === versionId)
    if (!version) return false

    let payload: SnapshotPayload
    try {
      payload = JSON.parse(version.snapshot) as SnapshotPayload
    } catch {
      // A corrupted snapshot must not take the character with it.
      return false
    }

    /*
     * Restoring is itself an undoable step: the current state is snapshotted
     * first, so a restore can always be reversed. Without this, "restore" is a
     * destructive action disguised as a safe one.
     */
    const versions = withVersion(character, 'Before restore')

    set((state) => ({
      characters: {
        ...state.characters,
        [characterId]: {
          ...character,
          ...payload,
          id: character.id,
          projectId: character.projectId,
          createdAt: character.createdAt,
          updatedAt: nowIso(),
          versions,
        },
      },
    }))

    return true
  },

  deleteCharacterVersion: (characterId, versionId) =>
    set((state) => {
      const character = state.characters[characterId]
      if (!character) return state
      return {
        characters: {
          ...state.characters,
          [characterId]: {
            ...character,
            versions: character.versions.filter((version) => version.id !== versionId),
          },
        },
      }
    }),
})
