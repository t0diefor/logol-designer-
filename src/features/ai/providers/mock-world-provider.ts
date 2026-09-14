import type { Location } from '@/types/world'
import {
  LOCATION_FIELD_LABELS,
  readLocationField,
  type LocationFieldKey,
} from '../adapters/location-adapter'
import type { AIRequestContext, FieldProposal } from '../types'

/**
 * Offline worldbuilding suggestions.
 *
 * Same contract as the character mock: templates seeded by the location's own
 * name, proposed only for fields that are empty, and labelled in the UI as
 * template output rather than model output.
 *
 * The templates lean on sensory and functional detail rather than adjectives,
 * because "what does this place smell like and who empties the bins" is the
 * kind of prompt that actually unblocks a writer.
 */

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

const KINDS = ['City district', 'Border settlement', 'Institution', 'Wilderness', 'Vessel'] as const

const SUMMARIES = [
  'A working district that keeps the rest of the city fed, and resents being reminded of it.',
  'The last inhabited place before the map stops being reliable.',
  'Built for one purpose, long since repurposed by people who were not consulted.',
  'Beautiful from a distance, and organised entirely around a danger nobody names.',
] as const

const DESCRIPTIONS = [
  'Narrow streets that flood twice a year, so every ground floor is storage and every family lives above it. The stonework is older than the records that describe it.',
  'A grid laid down by someone who never lived here, gradually bent out of shape by the paths people actually walk. Nothing meets at a right angle any more.',
  'Half-finished and already occupied. Scaffolding has become architecture; the temporary stairs are the only stairs.',
  'Everything is built facing away from the water, which is the first thing a visitor notices and the last thing anyone will explain.',
] as const

const ATMOSPHERES = [
  'Smells of wet rope and coal smoke. Constant low noise -- machinery somewhere below, never visible.',
  'Very quiet, and the quiet is maintained rather than natural. People lower their voices without deciding to.',
  'Too bright. The lights are never switched off, and residents have stopped mentioning it.',
  'Warm, crowded and loud, with the specific cheerfulness of people who have agreed not to discuss something.',
] as const

const MOCK_DELAY_MS = 550

export async function mockExpandLocation(
  location: Location,
  { signal }: AIRequestContext,
): Promise<FieldProposal[]> {
  // A short delay so the loading, cancel and error states are real rather than
  // theoretical -- they have to be exercisable before a provider exists.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, MOCK_DELAY_MS)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Cancelled by the user', 'AbortError'))
    })
  })

  const seed = seedFrom(location.name)

  const candidates: { key: LocationFieldKey; value: string; rationale: string }[] = [
    {
      key: 'kind',
      value: pick(KINDS, seed, 1),
      rationale: 'Categorising the place makes it easier to find later and to group on the map.',
    },
    {
      key: 'summary',
      value: pick(SUMMARIES, seed, 2),
      rationale: 'One line you can drop into a script margin without re-reading the whole entry.',
    },
    {
      key: 'description',
      value: pick(DESCRIPTIONS, seed, 3),
      rationale: 'Physical detail an artist can draw, rather than adjectives they cannot.',
    },
    {
      key: 'atmosphere',
      value: pick(ATMOSPHERES, seed, 4),
      rationale: 'Sound and smell carry a place in a medium that has neither.',
    },
  ]

  // Empty fields only. Anything the user has written is left strictly alone.
  return candidates
    .filter(({ key }) => readLocationField(location, key).trim().length === 0)
    .map<FieldProposal>(({ key, value, rationale }) => ({
      key,
      label: LOCATION_FIELD_LABELS[key],
      current: '',
      proposed: value,
      rationale,
    }))
}
