import type { Character } from '@/types/character'
import {
  CHARACTER_FIELD_LABELS,
  readCharacterField,
  type AIProvider,
  type AIRequestContext,
  type FieldProposal,
} from '../types'

/**
 * The offline provider.
 *
 * It composes suggestions from templates, seeded by the character's own name
 * and role so the same character always gets the same suggestions and two
 * characters get different ones. It is NOT a language model and the UI says so
 * everywhere it appears.
 *
 * Why it exists rather than just disabling the feature without a key:
 *  - The whole review-and-accept flow can be built and tested with no account.
 *  - The prompts are genuinely useful as writing scaffolding.
 *  - It proves the "nothing is applied without a decision" path end to end.
 *
 * It only ever proposes values for fields that are **empty**. Overwriting
 * something the user wrote, even as a suggestion, is the behaviour the product
 * brief rules out, and the safest way to guarantee that is to never generate a
 * proposal against a non-empty field in the first place.
 */

/** Small deterministic string hash, so suggestions are stable per character. */
function seedFrom(text: string): number {
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash)
}

function pick<T>(options: readonly T[], seed: number, salt: number): T {
  return options[(seed + salt) % options.length]!
}

const HAIR = [
  'Shoulder-length and dark auburn, usually tied back, with a few strands that never stay put.',
  'Close-cropped black hair, greying at the temples, cut by their own hand rather than a barber.',
  'A heavy pale braid worn over one shoulder, rewoven whenever they are thinking.',
  'Short copper curls kept under a cap in public, entirely unmanageable out of it.',
] as const

const EYES = [
  'Deep brown, set close, with a habit of narrowing before they speak rather than after.',
  'Pale grey and slow-blinking, which people mistake for calm.',
  'Hazel, heavy-lidded, ringed by the kind of shadows that do not come from one bad night.',
  'Dark and very steady; they hold eye contact a beat longer than is comfortable.',
] as const

const SKIN = [
  'Warm brown, weathered across the nose and forearms from working outdoors.',
  'Olive-toned, with an old burn scar mottling the left wrist.',
  'Fair and quick to flush, which gives away every lie they tell.',
  'Deep brown with a faint dusting of soot that never fully washes out.',
] as const

const BODY = [
  'Lean and wiry, built for climbing rather than fighting; stands with weight on the back foot.',
  'Broad through the shoulders and slightly stooped, as though ducking a low doorway.',
  'Small and compact, faster than anyone expects, with hands that are never quite still.',
  'Tall and slightly hollow, all elbows, moving like someone still growing into themselves.',
] as const

const MARKS = [
  'A thin white scar splitting the right eyebrow. They will not say where it came from.',
  'Ink stains permanently worked into the first two fingers of the writing hand.',
  'A missing little finger on the left hand, healed long ago and never mentioned.',
  'A faded tattoo on the inside of the forearm, deliberately kept covered.',
] as const

const PERSONALITY = [
  'stubborn, watchful, dryly funny, slow to trust',
  'restless, generous, prone to overpromising, secretly anxious',
  'meticulous, guarded, unexpectedly sentimental, impatient with fools',
  'warm in public, withdrawn in private, fiercely loyal, bad at apologising',
] as const

const WEAKNESSES = [
  'Cannot walk away from an unfinished argument, which has cost them more than one ally.',
  'Trusts competence over character, and is repeatedly taken in by people who are good at their jobs.',
  'Physically brave and emotionally evasive; will face down a mob before a difficult conversation.',
  'Keeps promises to strangers more reliably than to the people who depend on them.',
] as const

const GOALS = [
  'Wants to be the one who fixes it, and cannot say out loud why that matters so much.',
  'Wants to get someone back, and has not yet admitted that the person may not want returning.',
  'Wants to be believed, by one specific person, about one specific thing.',
  'Wants out -- and is quietly terrified of what they would be without this.',
] as const

const DIALOGUE = [
  'Short sentences. Answers questions with questions. Says "fine" when it is not.',
  'Over-explains under pressure, then stops mid-sentence when they hear themselves doing it.',
  'Formal, slightly archaic phrasing; never uses contractions when angry.',
  'Deflects with jokes, and the jokes get worse the closer a conversation gets to the truth.',
] as const

const BACKSTORY_OPENERS = [
  'Grew up somewhere the reader has not seen yet, in a household that ran on unspoken rules.',
  'Left a trade behind, and still reaches for the tools of it when nervous.',
  'Was the one who survived something the rest of the cast only heard about.',
  'Came into this life sideways, through a favour owed to someone now dead.',
] as const

const MOCK_DELAY_MS = 550

export const mockProvider: AIProvider = {
  status: {
    id: 'mock',
    name: 'Mock mode',
    configured: false,
    // Only the tools this offline provider can honestly perform.
    supports: ['character.expand', 'character.consistency'],
    description:
      'No AI provider is configured, so suggestions are composed locally from writing templates. They are not model output. Configure a provider in phase 8 for real generation.',
    estimatedCostCad: 0,
  },

  async expandCharacter(character: Character, { signal }: AIRequestContext) {
    // A short delay so the loading, cancel and error states are real rather
    // than theoretical -- they have to be exercisable before a provider exists.
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, MOCK_DELAY_MS)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Cancelled by the user', 'AbortError'))
      })
    })

    const seed = seedFrom(`${character.name}|${character.role}`)

    const candidates: { key: FieldProposal['key']; value: string; rationale: string }[] = [
      {
        key: 'appearance.hair',
        value: pick(HAIR, seed, 1),
        rationale: 'Hair silhouette is how a reader re-identifies a character at a glance.',
      },
      {
        key: 'appearance.eyes',
        value: pick(EYES, seed, 2),
        rationale: 'Anchors close-up panels, where the face carries the whole beat.',
      },
      {
        key: 'appearance.skinTone',
        value: pick(SKIN, seed, 3),
        rationale: 'Fixes colouring so it does not drift between issues or colourists.',
      },
      {
        key: 'appearance.bodyType',
        value: pick(BODY, seed, 4),
        rationale: 'Proportion and posture carry the character at wide shot, where the face cannot.',
      },
      {
        key: 'appearance.distinguishingMarks',
        value: pick(MARKS, seed, 5),
        rationale: 'The detail most often forgotten between artists, and the most noticed when it changes.',
      },
      {
        key: 'personality',
        value: pick(PERSONALITY, seed, 6),
        rationale: 'A short trait list keeps dialogue consistent across writers.',
      },
      {
        key: 'weaknesses',
        value: pick(WEAKNESSES, seed, 7),
        rationale: 'A weakness that creates plot is more useful than one that only creates sympathy.',
      },
      {
        key: 'goals',
        value: pick(GOALS, seed, 8),
        rationale: 'A want the character cannot state plainly gives scenes something to be about.',
      },
      {
        key: 'dialogueStyle',
        value: pick(DIALOGUE, seed, 9),
        rationale: 'Keeps the character recognisable in the script, not only in the art.',
      },
      {
        key: 'backstory',
        value: pick(BACKSTORY_OPENERS, seed, 10),
        rationale: 'A starting point to react against. Replace it with the real history when you have it.',
      },
    ]

    // Empty fields only. Anything the user has written is left strictly alone.
    return candidates
      .filter(({ key }) => readCharacterField(character, key).trim().length === 0)
      .map<FieldProposal>(({ key, value, rationale }) => ({
        key,
        label: CHARACTER_FIELD_LABELS[key],
        current: '',
        proposed: value,
        rationale,
      }))
  },
}
