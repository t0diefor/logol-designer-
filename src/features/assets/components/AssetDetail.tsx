import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Icon } from '@/components/ui/Icon'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { TagInput } from '@/components/ui/TagInput'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { formatBytes, formatRelativeTime } from '@/lib/format'
import { useAssetUsage, useCollectionsForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ASSET_KIND_LABELS, type Asset, type AssetKind } from '@/types/asset'
import { usageKindLabel } from '../usage'
import { AssetThumb } from './AssetThumb'

export function AssetDetail({
  asset,
  onDelete,
  onClose,
}: {
  asset: Asset
  onDelete: () => void
  onClose: () => void
}) {
  const updateAsset = useWorkspaceStore((state) => state.updateAsset)
  const toggleFavorite = useWorkspaceStore((state) => state.toggleAssetFavorite)
  const setAssetCollections = useWorkspaceStore((state) => state.setAssetCollections)
  const collections = useCollectionsForProject(asset.projectId)
  const usage = useAssetUsage(asset.id)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 truncate text-xl text-ink">{asset.name}</h2>
        <Button size="sm" variant="ghost" icon="close" onClick={onClose} className="lg:hidden">
          Close
        </Button>
      </div>

      <AssetThumb asset={asset} className="aspect-[4/3] w-full border border-line" />

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={asset.favorite ? 'primary' : 'secondary'}
          icon="star"
          onClick={() => toggleFavorite(asset.id)}
        >
          {asset.favorite ? 'Favourite' : 'Add to favourites'}
        </Button>
        <Button size="sm" variant="danger" icon="trash" onClick={onDelete} className="ml-auto">
          Delete
        </Button>
      </div>

      <Field label="Name">
        {({ id }) => (
          <Input
            id={id}
            value={asset.name}
            onChange={(event) => updateAsset(asset.id, { name: event.target.value })}
          />
        )}
      </Field>

      <Field label="Kind" hint="Used by the library filters and, later, by the composer.">
        {({ id }) => (
          <Select
            id={id}
            value={asset.kind}
            onChange={(event) => updateAsset(asset.id, { kind: event.target.value as AssetKind })}
          >
            {Object.entries(ASSET_KIND_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Description">
        {({ id }) => (
          <Textarea
            id={id}
            rows={3}
            value={asset.description}
            onChange={(event) => updateAsset(asset.id, { description: event.target.value })}
            placeholder="What this is, and when to reach for it."
          />
        )}
      </Field>

      <Field label="Tags">
        {({ id, describedBy }) => (
          <TagInput
            id={id}
            describedBy={describedBy}
            value={asset.tags}
            onChange={(tags) => updateAsset(asset.id, { tags })}
          />
        )}
      </Field>

      {collections.length > 0 ? (
        <fieldset className="border-0 p-0">
          <legend className="mb-2 text-sm font-medium text-ink">Collections</legend>
          <div className="flex flex-wrap gap-1.5">
            {collections.map((collection) => {
              const filed = asset.collectionIds.includes(collection.id)
              return (
                <button
                  key={collection.id}
                  type="button"
                  aria-pressed={filed}
                  aria-label={`${filed ? 'Remove from' : 'Add to'} collection ${collection.name}`}
                  onClick={() =>
                    setAssetCollections(
                      asset.id,
                      filed
                        ? asset.collectionIds.filter((id) => id !== collection.id)
                        : [...asset.collectionIds, collection.id],
                    )
                  }
                  className={cn(
                    'rounded-pill border px-2.5 py-0.5 text-xs border-[length:var(--pf-border-width)]',
                    'transition-colors duration-[var(--pf-duration-fast)]',
                    filed
                      ? 'border-transparent bg-primary text-primary-fg'
                      : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                  )}
                >
                  {collection.name}
                </button>
              )
            })}
          </div>
        </fieldset>
      ) : null}

      <div>
        <SectionLabel className="mb-2">
          Used in{' '}
          <span className="text-ink-faint tabular-nums">
            {usage.length} place{usage.length === 1 ? '' : 's'}
          </span>
        </SectionLabel>
        {usage.length === 0 ? (
          <p className="text-xs text-ink-faint">
            Not used anywhere yet. Deleting it will not affect anything.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {usage.map((use, index) => (
              <li key={`${use.ownerId}-${index}`} className="flex items-center gap-2 text-xs">
                <Badge>{usageKindLabel(use.kind)}</Badge>
                {use.href ? (
                  <Link to={use.href} className="truncate text-ink hover:underline">
                    {use.label}
                  </Link>
                ) : (
                  <span className="truncate text-ink">{use.label}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <SectionLabel className="mb-2">File</SectionLabel>
        <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
          <dt className="text-ink-muted">Type</dt>
          <dd className="text-ink">{asset.mimeType}</dd>
          <dt className="text-ink-muted">Size</dt>
          <dd className="text-ink tabular-nums">{formatBytes(asset.byteSize)}</dd>
          {asset.width > 0 ? (
            <>
              <dt className="text-ink-muted">Dimensions</dt>
              <dd className="text-ink tabular-nums">
                {asset.width}&times;{asset.height}
              </dd>
            </>
          ) : null}
          <dt className="text-ink-muted">Source</dt>
          <dd className="text-ink capitalize">{asset.source}</dd>
          <dt className="text-ink-muted">Added</dt>
          <dd className="text-ink">{formatRelativeTime(asset.createdAt)}</dd>
        </dl>

        {asset.source === 'placeholder' ? (
          <p className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-bg-inset px-3 py-2 text-xs leading-5 text-ink-muted">
            <span className="mt-0.5 shrink-0 text-warning">
              <Icon name="alert" size={13} />
            </span>
            Generated placeholder, not artwork. Replace it before exporting anything you intend to
            show someone.
          </p>
        ) : null}
      </div>
    </div>
  )
}
