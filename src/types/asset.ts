import { z } from 'zod'
import { baseEntitySchema, idSchema, tagSchema } from './common'

/**
 * Asset metadata.
 *
 * The record here is metadata only -- the bytes live in the IndexedDB `assets`
 * store (and in Phase 9, Supabase Storage). Keeping them apart is what lets a
 * project document stay small enough to autosave on every keystroke.
 */

export const assetKindSchema = z.enum([
  'character-reference',
  'background',
  'location',
  'prop',
  'panel',
  'logo',
  'moodboard',
  'other',
])

export type AssetKind = z.infer<typeof assetKindSchema>

export const ASSET_KIND_LABELS: Record<AssetKind, string> = {
  'character-reference': 'Character reference',
  background: 'Background',
  location: 'Location',
  prop: 'Prop',
  panel: 'Panel',
  logo: 'Logo',
  moodboard: 'Moodboard',
  other: 'Other',
}

/** How the asset got here. Generated assets carry their prompt for reproducibility. */
export const assetSourceSchema = z.enum(['uploaded', 'generated', 'placeholder'])

export const assetSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1, 'An asset needs a name').max(160),
  kind: assetKindSchema.default('other'),
  source: assetSourceSchema.default('uploaded'),

  mimeType: z.string().max(120).default('image/png'),
  byteSize: z.number().int().min(0).default(0),
  width: z.number().int().min(0).default(0),
  height: z.number().int().min(0).default(0),

  /**
   * Key into the IndexedDB `assets` store. Null for placeholder assets, which
   * are drawn procedurally and have no bytes at all.
   */
  blobKey: idSchema.nullable().default(null),

  /** Prompt and provider recorded when `source` is `generated`. */
  generationPrompt: z.string().max(4_000).default(''),
  generationProvider: z.string().max(80).default(''),

  collectionIds: z.array(idSchema).max(30).default([]),
  tags: z.array(tagSchema).max(30).default([]),
  favorite: z.boolean().default(false),
  description: z.string().max(2_000).default(''),
})

export type Asset = z.infer<typeof assetSchema>

export const collectionSchema = baseEntitySchema.extend({
  projectId: idSchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1_000).default(''),
})

export type Collection = z.infer<typeof collectionSchema>
