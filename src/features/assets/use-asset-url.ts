import { useEffect, useState } from 'react'
import { assetGet } from '@/lib/idb'

interface Resolved {
  /** Which asset this result belongs to, so a stale result is ignored. */
  id: string
  url: string | null
  missing: boolean
}

/**
 * Resolves a stored asset id to a displayable object URL.
 *
 * Two details that matter:
 *
 * 1. Object URLs pin their Blob in memory until revoked, so every one created
 *    here is revoked on cleanup. Without that, scrolling a character list
 *    would leak a copy of every image it passed.
 *
 * 2. The result carries the id it was fetched for, and staleness is worked out
 *    during render rather than by resetting state inside the effect. Clearing
 *    state in an effect body causes a second render pass on every id change,
 *    and briefly reports "loaded, no image" for the previous asset.
 */
export function useAssetUrl(assetId: string | null | undefined): {
  url: string | null
  loading: boolean
  missing: boolean
} {
  const [resolved, setResolved] = useState<Resolved | null>(null)

  useEffect(() => {
    if (!assetId) return

    let cancelled = false
    let objectUrl: string | null = null

    void assetGet(assetId)
      .then((stored) => {
        if (cancelled) return
        if (!stored) {
          setResolved({ id: assetId, url: null, missing: true })
          return
        }
        objectUrl = URL.createObjectURL(stored.blob)
        setResolved({ id: assetId, url: objectUrl, missing: false })
      })
      .catch(() => {
        if (!cancelled) setResolved({ id: assetId, url: null, missing: true })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [assetId])

  // A result for a different id is stale and counts as "still loading".
  const current = assetId && resolved?.id === assetId ? resolved : null

  return {
    url: current?.url ?? null,
    loading: Boolean(assetId) && current === null,
    missing: current?.missing ?? false,
  }
}
