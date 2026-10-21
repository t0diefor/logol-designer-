import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { useAssetUrl } from '../use-asset-url'
import type { Asset } from '@/types/asset'

/**
 * One asset's image, with its three honest states.
 *
 * `missing` matters more than it looks: the record lives in the document while
 * the bytes live in IndexedDB, so a browser whose site data was cleared, or a
 * project exported and re-imported without its blobs, has records pointing at
 * nothing. Saying so is better than a broken-image icon the user cannot act on.
 */
export function AssetThumb({
  asset,
  className,
  rounded = true,
}: {
  asset: Asset
  className?: string
  rounded?: boolean
}) {
  const { url, loading, missing } = useAssetUrl(asset.blobKey)

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-bg-inset',
        rounded && 'rounded-md',
        className,
      )}
    >
      {loading ? (
        <span className="animate-pulse text-xs text-ink-faint">Loading</span>
      ) : missing || !url ? (
        <span className="flex flex-col items-center gap-1 px-2 text-center text-ink-faint">
          <Icon name="alert" size={16} />
          <span className="text-[10px] leading-tight">Image data missing</span>
        </span>
      ) : (
        <img
          src={url}
          alt={asset.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  )
}
