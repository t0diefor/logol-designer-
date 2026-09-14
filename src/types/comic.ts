import { z } from 'zod'
import { assetRefSchema, baseEntitySchema, idSchema, noteSchema, rectSchema, tagSchema } from './common'

/**
 * The comic document model.
 *
 * Hierarchy: Project > Comic > Volume > Episode > Page > Panel > Element.
 *
 * Design rule that matters most here: a page is *data*, never a rasterised
 * image. Every visual is described declaratively so it stays editable
 * forever, and export (Phase 7) is a pure function from this data to pixels.
 * The moment we draw to a canvas and keep the canvas, the work stops being
 * editable, so we never do that.
 */

/** Page geometry is expressed in points at 300 DPI-equivalent print sizing. */
export const pageSizeSchema = z.object({
  /** Width in page units. 1 unit = 1/72 inch, matching PDF points. */
  width: z.number().positive(),
  height: z.number().positive(),
  label: z.string().max(60).default('Custom'),
})

export type PageSize = z.infer<typeof pageSizeSchema>

/** Standard North American comic page, 6.625 x 10.25 inches. */
export const US_COMIC_PAGE: PageSize = { width: 477, height: 738, label: 'US Comic' }
export const A4_PAGE: PageSize = { width: 595, height: 842, label: 'A4' }
export const SQUARE_PAGE: PageSize = { width: 612, height: 612, label: 'Square' }
export const WEBTOON_STRIP: PageSize = { width: 480, height: 1600, label: 'Webtoon strip' }

export const PAGE_PRESETS: PageSize[] = [US_COMIC_PAGE, A4_PAGE, SQUARE_PAGE, WEBTOON_STRIP]

/** Text containers that can sit inside a panel. */
export const balloonKindSchema = z.enum(['speech', 'thought', 'caption', 'sfx', 'whisper', 'shout'])
export type BalloonKind = z.infer<typeof balloonKindSchema>

export const textAlignSchema = z.enum(['left', 'center', 'right'])

export const balloonSchema = z.object({
  id: idSchema,
  kind: balloonKindSchema,
  text: z.string().max(2_000).default(''),
  rect: rectSchema,
  /** Which character is speaking, for tail direction and script export. */
  speakerId: idSchema.nullable().default(null),
  /** Where the tail points, in page units relative to the balloon centre. */
  tailX: z.number().default(0),
  tailY: z.number().default(0),
  fontSize: z.number().min(4).max(96).default(13),
  align: textAlignSchema.default('center'),
  /** Draw order within the panel. Higher sits on top. */
  z: z.number().int().default(0),
})

export type Balloon = z.infer<typeof balloonSchema>

/** A character, asset or background placed inside a panel. */
export const placementSchema = z.object({
  id: idSchema,
  kind: z.enum(['character', 'asset', 'background']),
  /** Character id or asset id, depending on `kind`. */
  refId: idSchema.nullable().default(null),
  rect: rectSchema,
  rotation: z.number().default(0),
  flipX: z.boolean().default(false),
  opacity: z.number().min(0).max(1).default(1),
  /** Expression or outfit variant requested for a character placement. */
  variant: z.string().max(60).default(''),
  z: z.number().int().default(0),
})

export type Placement = z.infer<typeof placementSchema>

export const panelSchema = z.object({
  id: idSchema,
  rect: rectSchema,
  /** Draw order on the page. */
  z: z.number().int().default(0),
  /** Corner radius in page units. */
  radius: z.number().min(0).default(0),
  borderWidth: z.number().min(0).default(2),
  /** Panel background fill, or null for the page colour. */
  fill: z.string().nullable().default(null),
  /** Artist-facing description of what happens in this panel. */
  description: z.string().max(4_000).default(''),
  /** Camera/shot note, e.g. "low angle, wide". */
  shot: z.string().max(200).default(''),
  placements: z.array(placementSchema).default([]),
  balloons: z.array(balloonSchema).default([]),
  notes: z.array(noteSchema).default([]),
  /** Links this panel back to the scene it dramatises, for script sync. */
  sceneId: idSchema.nullable().default(null),
})

export type Panel = z.infer<typeof panelSchema>

export const pageSchema = baseEntitySchema.extend({
  episodeId: idSchema,
  /** 1-based position within the episode. */
  index: z.number().int().min(1),
  size: pageSizeSchema,
  /** Safe margin in page units, drawn as a guide and respected by templates. */
  margin: z.number().min(0).default(24),
  /** Gap between panels used by grid templates. */
  gutter: z.number().min(0).default(12),
  background: z.string().nullable().default(null),
  panels: z.array(panelSchema).default([]),
  notes: z.array(noteSchema).default([]),
  /** Name of the template this page was created from, for reapplying it. */
  templateId: z.string().nullable().default(null),
})

export type Page = z.infer<typeof pageSchema>

export const episodeSchema = baseEntitySchema.extend({
  comicId: idSchema,
  volumeId: idSchema.nullable().default(null),
  number: z.number().int().min(0).default(1),
  title: z.string().trim().max(160).default(''),
  synopsis: z.string().max(4_000).default(''),
  status: z.enum(['outline', 'script', 'thumbnails', 'art', 'lettering', 'done']).default('outline'),
  tags: z.array(tagSchema).max(30).default([]),
})

export type Episode = z.infer<typeof episodeSchema>

/** A volume or season: an ordered grouping of episodes. */
export const volumeSchema = baseEntitySchema.extend({
  comicId: idSchema,
  number: z.number().int().min(0).default(1),
  title: z.string().trim().max(160).default(''),
  synopsis: z.string().max(4_000).default(''),
})

export type Volume = z.infer<typeof volumeSchema>

export const comicSchema = baseEntitySchema.extend({
  projectId: idSchema,
  title: z.string().trim().min(1, 'A comic needs a title').max(160),
  subtitle: z.string().trim().max(200).default(''),
  synopsis: z.string().max(5_000).default(''),
  /** Default page size applied to newly created pages. */
  defaultPageSize: pageSizeSchema.default(US_COMIC_PAGE),
  coverAsset: assetRefSchema.nullable().default(null),
  tags: z.array(tagSchema).max(30).default([]),
})

export type Comic = z.infer<typeof comicSchema>
