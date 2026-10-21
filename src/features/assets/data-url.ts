import { assetGet } from '@/lib/idb'

/**
 * Converting a stored asset into something an export can safely draw.
 *
 * This is the single most load-bearing function for phase 7, so it lives here
 * with the asset layer rather than being invented later inside the exporter.
 *
 * The constraint it exists for: `canvas.toBlob()` throws a SecurityError if
 * anything drawn onto the canvas came from another origin. An `<img>` pointing
 * at a blob: URL counts as same-origin, but an SVG serialised with a blob: URL
 * inside it does NOT resolve that reference at all when loaded as an image.
 * Inlining the bytes as a data: URL is the only approach that both resolves
 * and leaves the canvas untainted.
 *
 * The cost is real and worth stating: base64 inflates the bytes by about a
 * third, and a page of references becomes a large string. That is the price of
 * being able to export at all, and it is paid once at export time rather than
 * on every render.
 */

/** Reads a Blob as a `data:` URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read the image as a data URL.'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the image.'))
    reader.readAsDataURL(blob)
  })
}

export type AssetDataUrlResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: 'missing' | 'unreadable'; message: string }

/**
 * Resolves one asset id to an inlineable data URL.
 *
 * Returns a result rather than throwing: an export of forty pages should
 * report which image is missing and carry on, not abort on the first gap.
 */
export async function assetToDataUrl(assetId: string): Promise<AssetDataUrlResult> {
  let stored
  try {
    stored = await assetGet(assetId)
  } catch (error) {
    return {
      ok: false,
      reason: 'unreadable',
      message: error instanceof Error ? error.message : 'Storage could not be read.',
    }
  }

  if (!stored) {
    return {
      ok: false,
      reason: 'missing',
      message: 'The image data for this asset is not in this browser.',
    }
  }

  try {
    return { ok: true, dataUrl: await blobToDataUrl(stored.blob) }
  } catch (error) {
    return {
      ok: false,
      reason: 'unreadable',
      message: error instanceof Error ? error.message : 'The image could not be decoded.',
    }
  }
}

/**
 * Resolves many assets at once, keeping the failures.
 *
 * Deduplicates ids first, because a page that places the same background in
 * six panels should read and encode it once.
 */
export async function assetsToDataUrls(
  assetIds: string[],
): Promise<{ urls: Map<string, string>; failed: { assetId: string; message: string }[] }> {
  const unique = [...new Set(assetIds.filter(Boolean))]
  const urls = new Map<string, string>()
  const failed: { assetId: string; message: string }[] = []

  for (const assetId of unique) {
    const result = await assetToDataUrl(assetId)
    if (result.ok) urls.set(assetId, result.dataUrl)
    else failed.push({ assetId, message: result.message })
  }

  return { urls, failed }
}
