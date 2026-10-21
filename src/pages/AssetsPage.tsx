import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Input, SearchInput, Select } from '@/components/ui/Input'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { AssetDetail } from '@/features/assets/components/AssetDetail'
import { AssetThumb } from '@/features/assets/components/AssetThumb'
import { UploadZone } from '@/features/assets/components/UploadZone'
import { createPlaceholderAssets, PLACEHOLDER_COUNT } from '@/features/assets/placeholders'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import {
  useAssetsForProject,
  useAssetTagCounts,
  useAssetUsageCounts,
  useCollectionsForProject,
  useCurrentProject,
} from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ASSET_KIND_LABELS, type Asset, type AssetKind } from '@/types/asset'

type ViewMode = 'grid' | 'list'
type SortKey = 'recent' | 'name' | 'size' | 'unused'

export function AssetsPage() {
  const navigate = useNavigate()
  const kit = useMotionKit()
  const project = useCurrentProject()

  const assets = useAssetsForProject(project?.id ?? null)
  const collections = useCollectionsForProject(project?.id ?? null)
  const tagCounts = useAssetTagCounts(project?.id ?? null)
  const usageCounts = useAssetUsageCounts()

  const addAsset = useWorkspaceStore((state) => state.addAsset)
  const deleteAsset = useWorkspaceStore((state) => state.deleteAsset)
  const createCollection = useWorkspaceStore((state) => state.createCollection)
  const deleteCollection = useWorkspaceStore((state) => state.deleteCollection)

  const [view, setView] = useState<ViewMode>('grid')
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState<AssetKind | 'all'>('all')
  const [collectionFilter, setCollectionFilter] = useState<string | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [favouritesOnly, setFavouritesOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('recent')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null)
  const [newCollection, setNewCollection] = useState('')
  const [seeding, setSeeding] = useState(false)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = assets.filter((asset) => {
      if (favouritesOnly && !asset.favorite) return false
      if (kindFilter !== 'all' && asset.kind !== kindFilter) return false
      if (collectionFilter !== 'all' && !asset.collectionIds.includes(collectionFilter)) return false
      if (tagFilter && !asset.tags.includes(tagFilter)) return false
      if (!needle) return true
      return (
        asset.name.toLowerCase().includes(needle) ||
        asset.description.toLowerCase().includes(needle) ||
        asset.tags.some((tag) => tag.includes(needle))
      )
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'size') return b.byteSize - a.byteSize
      if (sort === 'unused') {
        // Unused first: these are the ones worth reviewing before an export.
        return (usageCounts.get(a.id) ?? 0) - (usageCounts.get(b.id) ?? 0)
      }
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [assets, query, kindFilter, collectionFilter, tagFilter, favouritesOnly, sort, usageCounts])

  const selected = assets.find((asset) => asset.id === selectedId) ?? null
  const totalBytes = assets.reduce((sum, asset) => sum + asset.byteSize, 0)
  const unusedCount = assets.filter((asset) => (usageCounts.get(asset.id) ?? 0) === 0).length

  async function seedPlaceholders() {
    if (!project) return
    setSeeding(true)
    try {
      for (const asset of await createPlaceholderAssets(project.id)) addAsset(asset)
    } finally {
      setSeeding(false)
    }
  }

  if (!project) {
    return (
      <>
        <PageHeader title="Assets" />
        <EmptyState
          icon="folder"
          title="No project selected"
          description="Assets belong to a project. Pick one first and its images will appear here."
          action={
            <Button variant="primary" onClick={() => navigate('/projects')}>
              Choose a project
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Assets"
        description={`Every image in ${project.title}. Files stay in this browser — nothing is uploaded anywhere.`}
        actions={
          <div className="flex items-center gap-1 rounded-md border border-line p-0.5 border-[length:var(--pf-border-width)]">
            <IconButton
              icon="grid"
              label="Grid view"
              size="sm"
              variant={view === 'grid' ? 'surface' : 'ghost'}
              onClick={() => setView('grid')}
            />
            <IconButton
              icon="list"
              label="List view"
              size="sm"
              variant={view === 'list' ? 'surface' : 'ghost'}
              onClick={() => setView('list')}
            />
          </div>
        }
      />

      {assets.length === 0 ? (
        <>
          <EmptyState
            icon="image"
            title="No assets yet"
            description="Reference photos, backgrounds, props, logos — anything you would hand an artist. Drop files below, or generate a set of placeholders so the composer has something to work with."
            action={
              <Button variant="primary" icon="image" loading={seeding} onClick={() => void seedPlaceholders()}>
                Generate {PLACEHOLDER_COUNT} placeholders
              </Button>
            }
          />
          <div className="mt-6">
            <UploadZone projectId={project.id} kind="other" />
          </div>
        </>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {/* Filters */}
            <div className="mb-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-56 flex-1">
                  <SearchInput
                    label="Search assets"
                    placeholder="Search name, description or tags"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </div>
                <Select
                  aria-label="Filter by kind"
                  value={kindFilter}
                  onChange={(event) => setKindFilter(event.target.value as AssetKind | 'all')}
                  fullWidth={false}
                >
                  <option value="all">All kinds</option>
                  {Object.entries(ASSET_KIND_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Sort assets"
                  value={sort}
                  onChange={(event) => setSort(event.target.value as SortKey)}
                  fullWidth={false}
                >
                  <option value="recent">Newest first</option>
                  <option value="name">A to Z</option>
                  <option value="size">Largest first</option>
                  <option value="unused">Unused first</option>
                </Select>
                <Button
                  size="sm"
                  variant={favouritesOnly ? 'primary' : 'secondary'}
                  icon="star"
                  onClick={() => setFavouritesOnly((value) => !value)}
                >
                  Favourites
                </Button>
              </div>

              {collections.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-ink-faint">Collections</span>
                  <button
                    type="button"
                    onClick={() => setCollectionFilter('all')}
                    aria-pressed={collectionFilter === 'all'}
                    className={cn(
                      'rounded-pill border px-2.5 py-0.5 text-xs border-[length:var(--pf-border-width)]',
                      collectionFilter === 'all'
                        ? 'border-transparent bg-primary text-primary-fg'
                        : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                    )}
                  >
                    All
                  </button>
                  {collections.map((collection) => (
                    <span key={collection.id} className="inline-flex items-center">
                      <button
                        type="button"
                        onClick={() => setCollectionFilter(collection.id)}
                        aria-pressed={collectionFilter === collection.id}
                        className={cn(
                          'rounded-l-pill border py-0.5 pl-2.5 pr-1.5 text-xs border-[length:var(--pf-border-width)]',
                          collectionFilter === collection.id
                            ? 'border-transparent bg-primary text-primary-fg'
                            : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                        )}
                      >
                        {collection.name}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete collection ${collection.name}`}
                        onClick={() => {
                          deleteCollection(collection.id)
                          if (collectionFilter === collection.id) setCollectionFilter('all')
                        }}
                        className="rounded-r-pill border border-l-0 border-line bg-bg-inset px-1.5 py-0.5 text-ink-faint hover:text-danger border-[length:var(--pf-border-width)]"
                      >
                        <Icon name="close" size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {tagCounts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-ink-faint">Tags</span>
                  {tagCounts.slice(0, 12).map(({ tag, count }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                      aria-pressed={tagFilter === tag}
                      className={cn(
                        'rounded-pill border px-2.5 py-0.5 text-xs border-[length:var(--pf-border-width)]',
                        tagFilter === tag
                          ? 'border-transparent bg-accent text-accent-fg'
                          : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                      )}
                    >
                      {tag} <span className="text-[10px] opacity-70">{count}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <p className="mb-3 text-xs text-ink-faint" role="status">
              {visible.length} of {assets.length} &middot; {formatBytes(totalBytes)} total
              {unusedCount > 0 ? ` · ${unusedCount} unused` : ''}
            </p>

            {visible.length === 0 ? (
              <EmptyState
                icon="search"
                title="Nothing matches"
                description="No asset matches that combination of search, kind, collection and tag."
                action={
                  <Button
                    onClick={() => {
                      setQuery('')
                      setKindFilter('all')
                      setCollectionFilter('all')
                      setTagFilter(null)
                      setFavouritesOnly(false)
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : view === 'grid' ? (
              <motion.ul
                initial="hidden"
                animate="visible"
                variants={kit.stagger}
                className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4"
              >
                {visible.map((asset) => {
                  const uses = usageCounts.get(asset.id) ?? 0
                  return (
                    <motion.li key={asset.id} variants={kit.item}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(asset.id)}
                        aria-pressed={selectedId === asset.id}
                        className={cn(
                          'w-full overflow-hidden rounded-lg border text-left border-[length:var(--pf-border-width)]',
                          'transition-colors duration-[var(--pf-duration-fast)]',
                          selectedId === asset.id
                            ? 'border-primary bg-surface-raised'
                            : 'border-line bg-surface hover:border-line-strong',
                        )}
                      >
                        <AssetThumb asset={asset} rounded={false} className="aspect-[4/3] w-full" />
                        <span className="block p-2.5">
                          <span className="flex items-center gap-1.5">
                            {asset.favorite ? (
                              <span className="shrink-0 text-accent">
                                <Icon name="star" size={12} title="Favourite" />
                              </span>
                            ) : null}
                            <span className="min-w-0 flex-1 truncate text-sm text-ink">
                              {asset.name}
                            </span>
                          </span>
                          <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-faint">
                            <span>{ASSET_KIND_LABELS[asset.kind]}</span>
                            <span className={uses === 0 ? 'text-warning' : undefined}>
                              {uses === 0 ? 'unused' : `${uses} use${uses === 1 ? '' : 's'}`}
                            </span>
                          </span>
                        </span>
                      </button>
                    </motion.li>
                  )
                })}
              </motion.ul>
            ) : (
              <div className="scroller overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs text-ink-faint">
                      <th className="py-2 pr-3 font-medium">Preview</th>
                      <th className="py-2 pr-3 font-medium">Name</th>
                      <th className="py-2 pr-3 font-medium">Kind</th>
                      <th className="py-2 pr-3 font-medium">Size</th>
                      <th className="py-2 pr-3 font-medium">Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((asset) => {
                      const uses = usageCounts.get(asset.id) ?? 0
                      return (
                        <tr
                          key={asset.id}
                          className={cn(
                            'border-b border-line last:border-b-0',
                            selectedId === asset.id && 'bg-surface-raised',
                          )}
                        >
                          <td className="py-2 pr-3">
                            <AssetThumb asset={asset} className="h-10 w-14" />
                          </td>
                          <td className="py-2 pr-3">
                            <button
                              type="button"
                              onClick={() => setSelectedId(asset.id)}
                              className="max-w-full truncate rounded-sm text-left text-ink hover:underline"
                            >
                              {asset.name}
                            </button>
                          </td>
                          <td className="py-2 pr-3 text-ink-muted">
                            {ASSET_KIND_LABELS[asset.kind]}
                          </td>
                          <td className="py-2 pr-3 text-ink-muted tabular-nums">
                            {formatBytes(asset.byteSize)}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {uses === 0 ? (
                              <span className="text-warning">unused</span>
                            ) : (
                              <span className="text-ink-muted">{uses}</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-8">
              <UploadZone projectId={project.id} kind="other" compact />
            </div>
          </div>

          {/* Sidebar: detail, or collection management when nothing is selected. */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card>
              {selected ? (
                <AssetDetail
                  asset={selected}
                  onClose={() => setSelectedId(null)}
                  onDelete={() => setPendingDelete(selected)}
                />
              ) : (
                <div className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-base text-ink">Collections</h2>
                    <p className="mt-1 text-sm leading-6 text-ink-muted">
                      Group assets however you work. An asset can sit in several, and deleting a
                      collection never deletes what is in it.
                    </p>
                  </div>

                  {collections.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {collections.map((collection) => (
                        <li
                          key={collection.id}
                          className="flex items-center justify-between gap-2 border-b border-line py-1.5 last:border-b-0"
                        >
                          <span className="min-w-0 truncate text-sm text-ink">
                            {collection.name}
                          </span>
                          <span className="shrink-0 text-xs text-ink-faint tabular-nums">
                            {assets.filter((a) => a.collectionIds.includes(collection.id)).length}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-ink-faint">No collections yet.</p>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={newCollection}
                      onChange={(event) => setNewCollection(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' || !newCollection.trim()) return
                        event.preventDefault()
                        createCollection(project.id, newCollection.trim())
                        setNewCollection('')
                      }}
                      placeholder="New collection"
                      aria-label="New collection name"
                    />
                    <Button
                      icon="plus"
                      disabled={!newCollection.trim()}
                      onClick={() => {
                        createCollection(project.id, newCollection.trim())
                        setNewCollection('')
                      }}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="border-t border-line pt-4">
                    <SectionLabel>Library</SectionLabel>
                    <dl className="mt-2 grid grid-cols-2 gap-y-1.5 text-xs">
                      <dt className="text-ink-muted">Assets</dt>
                      <dd className="text-ink tabular-nums">{assets.length}</dd>
                      <dt className="text-ink-muted">On disk</dt>
                      <dd className="text-ink tabular-nums">{formatBytes(totalBytes)}</dd>
                      <dt className="text-ink-muted">Unused</dt>
                      <dd className={cn('tabular-nums', unusedCount > 0 ? 'text-warning' : 'text-ink')}>
                        {unusedCount}
                      </dd>
                    </dl>
                    {assets.every((asset) => asset.source !== 'placeholder') ? (
                      <Button
                        className="mt-3"
                        size="sm"
                        icon="image"
                        loading={seeding}
                        onClick={() => void seedPlaceholders()}
                      >
                        Add placeholders
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </Card>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this asset?"
        description={
          pendingDelete
            ? (() => {
                const uses = usageCounts.get(pendingDelete.id) ?? 0
                return uses === 0
                  ? `"${pendingDelete.name}" is not used anywhere. The image will be removed from this browser permanently.`
                  : `"${pendingDelete.name}" is used in ${uses} place${uses === 1 ? '' : 's'}. Deleting it will remove it from ${uses === 1 ? 'that one' : 'all of them'} as well. This cannot be undone.`
              })()
            : ''
        }
        confirmLabel="Delete asset"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteAsset(pendingDelete.id)
            if (selectedId === pendingDelete.id) setSelectedId(null)
          }
          setPendingDelete(null)
        }}
      />
    </>
  )
}
