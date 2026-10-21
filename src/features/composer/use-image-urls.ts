import { useEffect, useState } from 'react'
import { assetGet } from '@/lib/idb'
import type { Asset } from '@/types/asset'

/**
 * Object URLs for every asset in a project, keyed by asset id.
 *
 * The renderer takes resolved URLs rather than reading storage itself, which
 * is what lets the same component serve the editor and the exporter: the
 * editor passes these object URLs, and phase 7 passes data URLs instead.
 *
 * Every URL created is revoked when the set changes or the component unmounts.
 * Without that, each page switch would leak a copy of every image on it.
 */
export function useProjectAssetUrls(assets: Asset[]): Map<string, string> {
  const [urls, setUrls] = useState<Map<string, string>>(new Map())

  // Keyed on the ids rather than the array, so an unrelated edit to an asset's
  // tags does not tear down and rebuild every object URL on the page.
  const key = assets
    .map((asset) => asset.blobKey)
    .filter(Boolean)
    .join('|')

  useEffect(() => {
    let cancelled = false
    const created: string[] = []

    async function load() {
      const next = new Map<string, string>()

      for (const asset of assets) {
        if (!asset.blobKey) continue
        try {
          const stored = await assetGet(asset.blobKey)
          if (!stored) continue
          const url = URL.createObjectURL(stored.blob)
          created.push(url)
          next.set(asset.id, url)
        } catch {
          // A single unreadable asset must not stop the rest of the page
          // rendering; it shows as a marked gap instead.
        }
      }

      if (cancelled) {
        for (const url of created) URL.revokeObjectURL(url)
        return
      }
      setUrls(next)
    }

    void load()

    return () => {
      cancelled = true
      for (const url of created) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return urls
}
