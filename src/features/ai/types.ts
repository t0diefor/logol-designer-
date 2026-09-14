import type { Character } from '@/types/character'

/**
 * The AI contract.
 *
 * Two rules shape everything in this folder:
 *
 * 1. **Nothing is applied without an explicit decision.** A tool returns
 *    proposals. The user accepts, edits or rejects each one. There is no code
 *    path that writes a generated value straight onto a record.
 *
 * 2. **Capability is never overstated.** A provider reports what it can
 *    actually do. Mock mode says so in the UI, and tools that need a real
 *    provider are disabled rather than quietly falling back to invented
 *    output presented as the real thing.
 */

export type AIToolId =
  | 'character.expand'
  | 'character.consistency'
  | 'world.expand'
  | 'story.outline'
  | 'story.rewrite'
  | 'panel.describe'
  | 'image.generate'

/**
 * A single suggested change to one field.
 *
 * `current` is captured at proposal time so the review UI can show exactly
 * what would be replaced, and so a proposal generated against stale data can
 * be detected rather than silently clobbering a newer edit.
 */
export interface FieldProposal {
  /** Dotted path into the character, e.g. `appearance.hair`. */
  key: CharacterFieldKey
  /** Human label for the review UI. */
  label: string
  /** The value as it stood when the proposal was made. */
  current: string
  /** What the tool suggests instead. Editable by the user before accepting. */
  proposed: string
  /** Why the tool suggested it. Shown so the user can judge, not just accept. */
  rationale: string
}

export type ProposalDecision = 'pending' | 'accepted' | 'rejected'

export interface ReviewableProposal extends FieldProposal {
  decision: ProposalDecision
  /** The user's edited version, when they have changed the proposed text. */
  edited: string
}

/** Fields the character expansion tool is allowed to propose changes to. */
export const CHARACTER_FIELD_KEYS = [
  'role',
  'pronouns',
  'ageRange',
  'appearance.hair',
  'appearance.eyes',
  'appearance.skinTone',
  'appearance.bodyType',
  'appearance.height',
  'appearance.distinguishingMarks',
  'appearance.general',
  'personality',
  'powers',
  'weaknesses',
  'goals',
  'backstory',
  'dialogueStyle',
] as const

export type CharacterFieldKey = (typeof CHARACTER_FIELD_KEYS)[number]

export const CHARACTER_FIELD_LABELS: Record<CharacterFieldKey, string> = {
  role: 'Role',
  pronouns: 'Pronouns',
  ageRange: 'Age range',
  'appearance.hair': 'Hair',
  'appearance.eyes': 'Eyes',
  'appearance.skinTone': 'Skin tone',
  'appearance.bodyType': 'Body type',
  'appearance.height': 'Height',
  'appearance.distinguishingMarks': 'Distinguishing marks',
  'appearance.general': 'General appearance',
  personality: 'Personality traits',
  powers: 'Powers and abilities',
  weaknesses: 'Weaknesses',
  goals: 'Goals',
  backstory: 'Backstory',
  dialogueStyle: 'Dialogue style',
}

/** Reads a field as a string, flattening the one array field for a uniform UI. */
export function readCharacterField(character: Character, key: CharacterFieldKey): string {
  switch (key) {
    case 'personality':
      return character.personality.join(', ')
    case 'appearance.hair':
      return character.appearance.hair
    case 'appearance.eyes':
      return character.appearance.eyes
    case 'appearance.skinTone':
      return character.appearance.skinTone
    case 'appearance.bodyType':
      return character.appearance.bodyType
    case 'appearance.height':
      return character.appearance.height
    case 'appearance.distinguishingMarks':
      return character.appearance.distinguishingMarks
    case 'appearance.general':
      return character.appearance.general
    default:
      return character[key]
  }
}

/**
 * Builds the patch that applying one accepted proposal would produce.
 *
 * Returns a partial rather than mutating, so the caller can merge several
 * accepted proposals into a single store update and therefore a single undo
 * point and a single autosave write.
 */
export function writeCharacterField(
  character: Character,
  key: CharacterFieldKey,
  value: string,
): Partial<Character> {
  if (key === 'personality') {
    return {
      personality: value
        .split(',')
        .map((trait) => trait.trim())
        .filter(Boolean)
        .slice(0, 20),
    }
  }

  if (key.startsWith('appearance.')) {
    const field = key.slice('appearance.'.length) as keyof Character['appearance']
    return { appearance: { ...character.appearance, [field]: value } }
  }

  return { [key]: value } as Partial<Character>
}

/**
 * Whether the underlying field has changed since the proposal was made.
 *
 * A proposal records the value it was generated against. If the live value no
 * longer matches, the user edited that field in another tab while the review
 * panel was open, and applying the suggestion would destroy an edit they made
 * *after* seeing the suggestion -- exactly the silent overwrite this whole
 * feature exists to prevent.
 *
 * Deliberately a pure function of the live character rather than something
 * tracked in state: staleness is then derived during render and cannot go out
 * of date, and there is no effect writing state back on every store change.
 */
export function isProposalStale(character: Character, proposal: FieldProposal): boolean {
  return readCharacterField(character, proposal.key) !== proposal.current
}

export interface PatchResult {
  /** The changes to write. Never includes a stale proposal. */
  patch: Partial<Character>
  /** Keys that were accepted but skipped because the field changed underneath. */
  skipped: CharacterFieldKey[]
  /** How many proposals will actually be written. */
  appliedCount: number
}

/**
 * Merges every accepted proposal into one patch, refusing stale ones.
 *
 * The UI blocks a stale proposal from being applied before it reaches here;
 * this second check is defence in depth, so no future caller can bypass it.
 */
export function buildPatch(
  character: Character,
  proposals: ReviewableProposal[],
): PatchResult {
  let patch: Partial<Character> = {}
  const skipped: CharacterFieldKey[] = []
  let appliedCount = 0

  for (const proposal of proposals) {
    if (proposal.decision !== 'accepted') continue

    if (isProposalStale(character, proposal)) {
      skipped.push(proposal.key)
      continue
    }

    const value = proposal.edited.trim()
    if (!value) continue

    // Appearance is merged against the running patch, not the original, so
    // accepting several appearance fields at once does not lose all but the last.
    const merged = { ...character, ...patch } as Character
    patch = { ...patch, ...writeCharacterField(merged, proposal.key, value) }
    appliedCount += 1
  }

  return { patch, skipped, appliedCount }
}

export interface AIRequestContext {
  /** Abort signal, so a slow request can be cancelled by the user. */
  signal: AbortSignal
}

export interface ProviderStatus {
  id: string
  name: string
  /** False when no API key or proxy is configured -- the app then runs in mock mode. */
  configured: boolean
  /** Which tools this provider can genuinely perform. */
  supports: AIToolId[]
  /**
   * Shown in the AI panel. For mock mode this states plainly that output is
   * generated locally from templates and is not model output.
   */
  description: string
  /** Estimated cost of one call, in CAD. Zero in mock mode. */
  estimatedCostCad: number
}

export interface AIProvider {
  status: ProviderStatus
  expandCharacter(character: Character, context: AIRequestContext): Promise<FieldProposal[]>
}
