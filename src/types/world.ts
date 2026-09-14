import { z } from 'zod'
import { assetRefSchema, baseEntitySchema, idSchema, noteSchema, tagSchema } from './common'

/** World-building entities: places, peoples, powers and history. */

export const locationSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1, 'A location needs a name').max(120),
  kind: z.string().trim().max(60).default(''),
  summary: z.string().max(1_000).default(''),
  description: z.string().max(10_000).default(''),
  atmosphere: z.string().max(2_000).default(''),
  /** Somewhere this place sits inside, e.g. a city within a region. */
  parentLocationId: idSchema.nullable().default(null),
  /** Free position on the node map workspace, in workspace units. */
  mapX: z.number().default(0),
  mapY: z.number().default(0),
  references: z.array(assetRefSchema).max(30).default([]),
  notes: z.array(noteSchema).default([]),
  tags: z.array(tagSchema).max(30).default([]),
})

export type Location = z.infer<typeof locationSchema>

export const factionSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1, 'A faction needs a name').max(120),
  kind: z.string().trim().max(60).default(''),
  goal: z.string().max(2_000).default(''),
  beliefs: z.string().max(4_000).default(''),
  structure: z.string().max(4_000).default(''),
  /** Ids of factions this one opposes, used by the relationship graph. */
  rivalFactionIds: z.array(idSchema).max(30).default([]),
  homeLocationId: idSchema.nullable().default(null),
  notes: z.array(noteSchema).default([]),
  tags: z.array(tagSchema).max(30).default([]),
})

export type Faction = z.infer<typeof factionSchema>

/** A culture, technology or magic system -- anything with rules and costs. */
export const worldSystemSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1, 'A system needs a name').max(120),
  category: z.enum(['culture', 'technology', 'magic', 'economy', 'religion', 'other']).default('other'),
  summary: z.string().max(1_000).default(''),
  /** How it works. */
  mechanics: z.string().max(8_000).default(''),
  /** Hard limits. A magic system without costs generates no drama. */
  limits: z.string().max(4_000).default(''),
  /** Numbered, quotable rules for keeping the world self-consistent. */
  rules: z.array(z.string().max(600)).max(40).default([]),
  notes: z.array(noteSchema).default([]),
  tags: z.array(tagSchema).max(30).default([]),
})

export type WorldSystem = z.infer<typeof worldSystemSchema>

export const worldEventSchema = baseEntitySchema.extend({
  projectId: idSchema,
  title: z.string().trim().min(1, 'An event needs a title').max(160),
  /**
   * In-world date as free text ("Third Age, year 412"), because invented
   * calendars do not fit a Date. `sortKey` is what the timeline actually
   * orders by, so the display stays expressive while ordering stays reliable.
   */
  whenLabel: z.string().max(120).default(''),
  sortKey: z.number().default(0),
  summary: z.string().max(2_000).default(''),
  description: z.string().max(8_000).default(''),
  locationId: idSchema.nullable().default(null),
  involvedFactionIds: z.array(idSchema).max(30).default([]),
  involvedCharacterIds: z.array(idSchema).max(30).default([]),
  significance: z.enum(['minor', 'notable', 'major', 'world-changing']).default('notable'),
  tags: z.array(tagSchema).max(30).default([]),
})

export type WorldEvent = z.infer<typeof worldEventSchema>

/** An object that matters: a weapon, a relic, a letter. */
export const worldObjectSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(4_000).default(''),
  significance: z.string().max(2_000).default(''),
  holderCharacterId: idSchema.nullable().default(null),
  references: z.array(assetRefSchema).max(20).default([]),
  tags: z.array(tagSchema).max(30).default([]),
})

export type WorldObject = z.infer<typeof worldObjectSchema>
