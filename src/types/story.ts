import { z } from 'zod'
import { baseEntitySchema, idSchema, noteSchema, tagSchema } from './common'

/**
 * Story model.
 *
 * Structured deliberately: a scene is not a blob of prose but an object with
 * a goal, a conflict and an outcome. That structure is what lets the app
 * offer useful help -- a beat with no conflict can be flagged, and a scene
 * can be turned into panels because its parts are addressable.
 */

/** One beat of a scene: a single unit of change. */
export const beatSchema = z.object({
  id: idSchema,
  index: z.number().int().min(0),
  summary: z.string().max(1_000).default(''),
  /** What shifts as a result of this beat. A beat that changes nothing is a candidate to cut. */
  change: z.string().max(600).default(''),
})

export type Beat = z.infer<typeof beatSchema>

export const dialogueLineSchema = z.object({
  id: idSchema,
  characterId: idSchema.nullable().default(null),
  /** Used before a character record exists. */
  speakerName: z.string().max(120).default(''),
  /** Stage direction, e.g. "(quietly)". */
  parenthetical: z.string().max(200).default(''),
  text: z.string().max(2_000).default(''),
  kind: z.enum(['dialogue', 'narration', 'caption', 'sfx']).default('dialogue'),
  index: z.number().int().min(0),
})

export type DialogueLine = z.infer<typeof dialogueLineSchema>

export const sceneSchema = baseEntitySchema.extend({
  storyId: idSchema,
  index: z.number().int().min(0),
  title: z.string().trim().max(160).default(''),
  /** Where and when. */
  slug: z.string().max(200).default(''),
  locationId: idSchema.nullable().default(null),
  summary: z.string().max(2_000).default(''),

  /** The dramatic engine of the scene. */
  goal: z.string().max(1_000).default(''),
  conflict: z.string().max(1_000).default(''),
  outcome: z.string().max(1_000).default(''),
  /** What each present character wants here, keyed by character id. */
  characterObjectives: z.record(idSchema, z.string().max(600)).default({}),

  beats: z.array(beatSchema).default([]),
  lines: z.array(dialogueLineSchema).default([]),
  notes: z.array(noteSchema).default([]),
  tags: z.array(tagSchema).max(30).default([]),
  status: z.enum(['idea', 'outlined', 'drafted', 'revised', 'final']).default('idea'),
})

export type Scene = z.infer<typeof sceneSchema>

export const storySchema = baseEntitySchema.extend({
  projectId: idSchema,
  /** The episode this script belongs to, when it has been assigned one. */
  episodeId: idSchema.nullable().default(null),
  title: z.string().trim().min(1, 'A story needs a title').max(160),
  logline: z.string().max(500).default(''),
  /** What the story is arguing. */
  theme: z.string().max(1_000).default(''),
  premise: z.string().max(4_000).default(''),
  outline: z.string().max(20_000).default(''),
  tags: z.array(tagSchema).max(30).default([]),
})

export type Story = z.infer<typeof storySchema>
