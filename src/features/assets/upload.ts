import { newId, nowIso } from '@/lib/id'
import { assetPut } from '@/lib/idb'
import { assetSchema, type Asset, type AssetKind } from '@/types/asset'

/**
 * Turning a user's file into a stored asset.
 *
 * The bytes go to the IndexedDB `assets` store as a Blob; only metadata goes
 * into the workspace document. Two reasons this split matters:
 *
 *  1. Autosave. A document that embedded image bytes would rewrite megabytes
 *     on every keystroke.
 *  2. Export. Phase 7 rasterises the page through a canvas, and a canvas is
 *     tainted by any cross-origin image. Blobs held locally can be inlined as
 *     data URLs at export time, which is what keeps PNG export possible at all.
 */

/** Formats a browser can reliably decode, draw to a canvas and export. */
export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
] as const

/** Per-file ceiling. Large enough for a scanned reference, small enough not to fill quota. */
export const MAX_ASSET_BYTES = 12 * 1024 * 1024

export type UploadFailure =
  | { kind: 'unsupported-type'; message: string }
  | { kind: 'too-large'; message: string }
  | { kind: 'decode-failed'; message: string }
  | { kind: 'storage-failed'; message: string }

export type UploadResult = { ok: true; asset: Asset } | { ok: false; error: UploadFailure }

/** Reads intrinsic pixel dimensions, so the library can show them without re-decoding. */
function readImageSize(file: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('The browser could not decode this image.'))
    }
    image.src = url
  })
}

export interface UploadOptions {
  projectId: string
  kind: AssetKind
  /** Defaults to the file name with its extension removed. */
  name?: string
  tags?: string[]
}

/**
 * Validates, measures and stores one file.
 *
 * Returns a result rather than throwing, because every failure here is
 * something the user can act on and therefore needs a message, not a stack.
 */
export async function uploadImageAsset(
  file: File,
  { projectId, kind, name, tags = [] }: UploadOptions,
): Promise<UploadResult> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return {
      ok: false,
      error: {
        kind: 'unsupported-type',
        message: `${file.name} is a ${file.type || 'unknown'} file. Use PNG, JPEG, WebP, GIF or SVG.`,
      },
    }
  }

  if (file.size > MAX_ASSET_BYTES) {
    return {
      ok: false,
      error: {
        kind: 'too-large',
        message: `${file.name} is larger than the 12 MB limit for a single image.`,
      },
    }
  }

  let size = { width: 0, height: 0 }
  try {
    size = await readImageSize(file)
  } catch {
    // SVGs without an intrinsic size land here and are still perfectly usable,
    // so a failed measurement is recorded as 0x0 rather than rejected.
    if (file.type !== 'image/svg+xml') {
      return {
        ok: false,
        error: { kind: 'decode-failed', message: `${file.name} could not be read as an image.` },
      }
    }
  }

  const id = newId()
  const timestamp = nowIso()

  const asset: Asset = assetSchema.parse({
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: null,
    projectId,
    name: name ?? file.name.replace(/\.[^.]+$/, ''),
    kind,
    source: 'uploaded',
    mimeType: file.type,
    byteSize: file.size,
    width: size.width,
    height: size.height,
    blobKey: id,
    tags,
  })

  try {
    await assetPut({
      id,
      blob: file,
      mimeType: file.type,
      byteSize: file.size,
      createdAt: timestamp,
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown storage error'
    return {
      ok: false,
      error: {
        kind: 'storage-failed',
        message: /quota/i.test(reason)
          ? 'Storage is full. Remove some assets and try again.'
          : `Could not save ${file.name}: ${reason}`,
      },
    }
  }

  return { ok: true, asset }
}
