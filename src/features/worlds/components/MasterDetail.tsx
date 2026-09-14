import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon, type IconName } from '@/components/ui/Icon'
import { SearchInput } from '@/components/ui/Input'
import { cn } from '@/lib/cn'

export interface MasterDetailItem {
  id: string
  name: string
  /** Secondary line in the list, e.g. a kind or category. */
  meta?: string
}

export interface MasterDetailProps<T extends MasterDetailItem> {
  items: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  /** Label for the create button, e.g. "Add location". */
  createLabel: string
  icon: IconName
  emptyTitle: string
  emptyDescription: string
  searchPlaceholder: string
  renderDetail: (item: T) => ReactNode
}

/**
 * List on the left, editor on the right.
 *
 * Used by locations, factions, systems and objects. They differ only in their
 * fields, so the selection, search and empty-state behaviour lives here once
 * rather than being reimplemented four times with four subtly different bugs.
 *
 * Below `md` the two panes stack and the list collapses once something is
 * selected, because a 280px rail plus an editor does not fit on a phone.
 */
export function MasterDetail<T extends MasterDetailItem>({
  items,
  selectedId,
  onSelect,
  onCreate,
  createLabel,
  icon,
  emptyTitle,
  emptyDescription,
  searchPlaceholder,
  renderDetail,
}: MasterDetailProps<T>) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(needle) ||
        (item.meta ?? '').toLowerCase().includes(needle),
    )
  }, [items, query])

  const selected = items.find((item) => item.id === selectedId) ?? null

  if (items.length === 0) {
    return (
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        action={
          <Button variant="primary" icon="plus" onClick={onCreate}>
            {createLabel}
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(200px,260px)_minmax(0,1fr)]">
      {/* List pane. Hidden on phones once an item is open. */}
      <div className={cn('flex flex-col gap-3', selected && 'hidden md:flex')}>
        <Button icon="plus" onClick={onCreate} fullWidth>
          {createLabel}
        </Button>

        {items.length > 5 ? (
          <SearchInput
            label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        ) : null}

        {visible.length === 0 ? (
          <p className="px-1 py-3 text-sm text-ink-faint">Nothing matches that search.</p>
        ) : (
          <ul className="flex flex-col gap-0.5" role="list">
            {visible.map((item) => {
              const active = item.id === selectedId
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'w-full rounded-md px-3 py-2 text-left',
                      'transition-colors duration-[var(--pf-duration-fast)]',
                      active
                        ? 'bg-primary text-primary-fg'
                        : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
                    )}
                  >
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    {item.meta ? (
                      <span
                        className={cn(
                          'block truncate text-xs',
                          active ? 'opacity-80' : 'text-ink-faint',
                        )}
                      >
                        {item.meta}
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Detail pane. */}
      <div className="min-w-0">
        {selected ? (
          <>
            {/* Back control, only meaningful on the stacked phone layout. */}
            <button
              type="button"
              onClick={() => onSelect('')}
              className="mb-4 flex items-center gap-1.5 rounded-sm text-sm text-ink-muted hover:text-ink md:hidden"
            >
              <Icon name="chevronLeft" size={14} />
              Back to list
            </button>
            {renderDetail(selected)}
          </>
        ) : (
          <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
            <p className="text-sm text-ink-muted">
              Select an entry from the list to edit it, or add a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
