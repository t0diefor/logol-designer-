import { z } from 'zod'
import { assetRefSchema, baseEntitySchema, idSchema, noteSchema, paletteSchema, tagSchema } from './common'

/**
 * Character model.
 *
 * Appearance is broken into named fields rather than one prose blob. That
 * costs more form UI, but it is what makes a character sheet reusable: the
 * fields can be diffed between versions, checked for consistency, and
 * assembled into an image-generation prompt without re-parsing English.
 */

export const appearanceSchema = z.object({
  hair: z.string().max(300).default(''),
  eyes: z.string().max(300).default(''),
  skinTone: z.string().max(300).default(''),
  bodyType: z.string().max(300).default(''),
  height: z.string().max(80).default(''),
  distinguishingMarks: z.string().max(600).default(''),
  /** Everything not covered above, e.g. posture or silhouette notes. */
  general: z.string().max(2_000).default(''),
})

export type Appearance = z.infer<typeof appearanceSchema>

/** A named outfit, so a character can be drawn consistently across scenes. */
export const outfitSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(80),
  description: z.string().max(1_500).default(''),
  accessories: z.string().max(800).default(''),
  palette: paletteSchema,
  references: z.array(assetRefSchema).max(12).default([]),
  isDefault: z.boolean().default(false),
})

export type Outfit = z.infer<typeof outfitSchema>

/** A named expression with a reference image, used by the panel composer. */
export const expressionSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(60),
  description: z.string().max(600).default(''),
  reference: assetRefSchema.nullable().default(null),
})

export type Expression = z.infer<typeof expressionSchema>

export const relationshipSchema = z.object({
  id: idSchema,
  /** The other character. Null while the user is still typing a name. */
  targetCharacterId: idSchema.nullable().default(null),
  /** Used when the other party is not a tracked character. */
  targetName: z.string().max(120).default(''),
  kind: z.string().max(80).default(''),
  description: z.string().max(1_500).default(''),
})

export type Relationship = z.infer<typeof relationshipSchema>

/**
 * A saved snapshot of a character, written whenever the user asks for one or
 * accepts an AI expansion. This is what makes AI suggestions safe to accept:
 * there is always a prior version to return to.
 */
export const characterVersionSchema = z.object({
  id: idSchema,
  createdAt: z.iso.datetime(),
  /** Why this version exists, e.g. "Before AI expansion". */
  label: z.string().max(200).default(''),
  /** The full character record as it stood, serialised. */
  snapshot: z.string(),
})

export type CharacterVersion = z.infer<typeof characterVersionSchema>

export const characterSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1, 'A character needs a name').max(120),
  role: z.string().trim().max(80).default(''),
  pronouns: z.string().trim().max(40).default(''),
  ageRange: z.string().trim().max(60).default(''),

  appearance: appearanceSchema.prefault({}),
  outfits: z.array(outfitSchema).max(30).default([]),
  expressions: z.array(expressionSchema).max(40).default([]),

  personality: z.array(z.string().max(80)).max(20).default([]),
  powers: z.string().max(3_000).default(''),
  weaknesses: z.string().max(3_000).default(''),
  goals: z.string().max(3_000).default(''),
  backstory: z.string().max(10_000).default(''),
  dialogueStyle: z.string().max(2_000).default(''),

  relationships: z.array(relationshipSchema).max(50).default([]),
  references: z.array(assetRefSchema).max(40).default([]),
  palette: paletteSchema,
  notes: z.array(noteSchema).default([]),
  tags: z.array(tagSchema).max(30).default([]),
  versions: z.array(characterVersionSchema).max(50).default([]),
})

export type Character = z.infer<typeof characterSchema>

/**
 * The consistency checklist.
 *
 * This is a deterministic completeness check over the character record -- not
 * an AI feature and not a promise about generated images. It answers "have I
 * written down enough for an artist to draw this person the same way twice?".
 */
export interface ConsistencyCheckItem {
  id: string
  label: string
  /** Why this field matters for drawing the character consistently. */
  reason: string
  complete: boolean
}

export function buildConsistencyChecklist(character: Character): ConsistencyCheckItem[] {
  const { appearance } = character
  const hasDefaultOutfit = character.outfits.some((outfit) => outfit.isDefault)

  return [
    {
      id: 'hair',
      label: 'Hair described',
      reason: 'Hair silhouette is the fastest way a reader re-identifies a character.',
      complete: appearance.hair.trim().length > 0,
    },
    {
      id: 'eyes',
      label: 'Eyes described',
      reason: 'Eye shape and colour anchor close-up panels.',
      complete: appearance.eyes.trim().length > 0,
    },
    {
      id: 'skinTone',
      label: 'Skin tone described',
      reason: 'Prevents drift in colouring between issues.',
      complete: appearance.skinTone.trim().length > 0,
    },
    {
      id: 'bodyType',
      label: 'Body type described',
      reason: 'Proportions drive the character at wide shot, where the face is unreadable.',
      complete: appearance.bodyType.trim().length > 0,
    },
    {
      id: 'marks',
      label: 'Distinguishing marks noted',
      reason: 'Scars, tattoos and asymmetries are the details most often forgotten.',
      complete: appearance.distinguishingMarks.trim().length > 0,
    },
    {
      id: 'outfit',
      label: 'A default outfit is set',
      reason: 'Gives every panel a fallback costume instead of an improvised one.',
      complete: hasDefaultOutfit,
    },
    {
      id: 'expressions',
      label: 'At least three expressions',
      reason: 'One reference face leads to a character who only ever has one mood.',
      complete: character.expressions.length >= 3,
    },
    {
      id: 'palette',
      label: 'Colour palette chosen',
      reason: 'Fixes the character colours so they survive a change of colourist.',
      complete: character.palette.colors.length > 0,
    },
    {
      id: 'references',
      label: 'A reference image attached',
      reason: 'Written description alone drifts; an image is the tiebreaker.',
      complete: character.references.length > 0,
    },
    {
      id: 'voice',
      label: 'Dialogue style written',
      reason: 'Keeps the character recognisable in the script, not just the art.',
      complete: character.dialogueStyle.trim().length > 0,
    },
  ]
}
