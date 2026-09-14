import type { Character } from '@/types/character'
import type { FieldAdapter } from '../types'

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
  weaknesses: 'Weaknesses',
  powers: 'Powers and abilities',
  goals: 'Goals',
  backstory: 'Backstory',
  dialogueStyle: 'Dialogue style',
}

/** Reads a field as a string, flattening the one array field for a uniform UI. */
export function readCharacterField(character: Character, key: string): string {
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
    default: {
      const value = character[key as keyof Character]
      return typeof value === 'string' ? value : ''
    }
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
  key: string,
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

export const characterAdapter: FieldAdapter<Character> = {
  read: readCharacterField,
  write: writeCharacterField,
}
