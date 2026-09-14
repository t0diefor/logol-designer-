import { z } from 'zod'
import { baseEntitySchema, idSchema, paletteSchema, tagSchema } from './common'

/**
 * Project -- the top-level container a user works inside.
 *
 * Everything else (comics, characters, worlds, assets) belongs to exactly one
 * project, which is what makes "export this project" and, later, "share this
 * project" tractable.
 */
export const projectSchema = baseEntitySchema.extend({
  title: z.string().trim().min(1, 'A project needs a title').max(120),
  logline: z.string().trim().max(300).default(''),
  description: z.string().max(5_000).default(''),
  /** Free-text genre, e.g. "cosmic horror". Not an enum -- creators invent genres. */
  genre: z.string().trim().max(60).default(''),
  status: z.enum(['planning', 'drafting', 'art', 'complete', 'archived']).default('planning'),
  palette: paletteSchema,
  tags: z.array(tagSchema).max(30).default([]),
  /** Asset id of the cover image, if one has been chosen. */
  coverAssetId: idSchema.nullable().default(null),
  /** Theme this project opens with, overriding the global preference. Null follows the global. */
  preferredThemeId: z.string().nullable().default(null),
})

export type Project = z.infer<typeof projectSchema>

/** Fields a user supplies when creating a project. The rest are generated. */
export const projectDraftSchema = projectSchema.pick({
  title: true,
  logline: true,
  genre: true,
})

export type ProjectDraft = z.infer<typeof projectDraftSchema>

export const PROJECT_STATUS_LABELS: Record<Project['status'], string> = {
  planning: 'Planning',
  drafting: 'Drafting',
  art: 'Art',
  complete: 'Complete',
  archived: 'Archived',
}
