import { z } from 'zod'

/**
 * Shared primitives for every PanelForge entity.
 *
 * These schemas are the single source of truth for the shape of saved data.
 * TypeScript types are inferred from them rather than declared separately, so
 * a type and its validator can never drift apart.
 */

export const idSchema = z.uuid()
export const isoDateSchema = z.iso.datetime()

/**
 * Fields carried by every stored record.
 *
 * `ownerId` is nullable in local-only mode and is populated in Phase 9 when
 * Supabase auth arrives. Including it from the start means the eventual sync
 * is an upsert rather than a schema migration.
 */
export const baseEntitySchema = z.object({
  id: idSchema,
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  ownerId: idSchema.nullable().default(null),
})

export type BaseEntity = z.infer<typeof baseEntitySchema>

/** A free-form label. Lowercased on save so tag filtering is case-insensitive. */
export const tagSchema = z.string().trim().min(1).max(40).toLowerCase()

/** A hex colour, used by character and project palettes. */
export const hexColorSchema = z
  .string()
  .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour such as #7B4FA8')

export const paletteSchema = z
  .object({
    name: z.string().trim().max(60).default(''),
    colors: z.array(hexColorSchema).max(8).default([]),
  })
  .default({ name: '', colors: [] })

export type Palette = z.infer<typeof paletteSchema>

/** A timestamped note. Used by characters, locations, scenes, panels and pages. */
export const noteSchema = z.object({
  id: idSchema,
  body: z.string().max(10_000).default(''),
  createdAt: isoDateSchema,
})

export type Note = z.infer<typeof noteSchema>

/** Position and size on the comic page, in page units (see composer docs). */
export const rectSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
})

export type Rect = z.infer<typeof rectSchema>

/**
 * Reference to a stored binary asset.
 *
 * Documents never embed image bytes. They hold an asset id, and the bytes live
 * in the IndexedDB `assets` store (later, Supabase Storage). This keeps
 * document writes small and is what makes autosave affordable.
 */
export const assetRefSchema = z.object({
  assetId: idSchema,
  /** Cached for display so a list does not need to open every blob. */
  label: z.string().max(120).default(''),
})

export type AssetRef = z.infer<typeof assetRefSchema>
