import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { buildConsistencyChecklist, type Character } from '@/types/character'

/**
 * The consistency checklist.
 *
 * Worth being precise about what this is: a deterministic completeness check
 * over the character record. No model is involved and none is needed. It
 * answers one question -- "have I written down enough for an artist to draw
 * this person the same way twice?" -- and every item states why it matters, so
 * it teaches rather than just scoring.
 *
 * It is explicitly NOT a claim that generated images will be consistent. That
 * is not a capability PanelForge has, and the wording here never implies it.
 */
export function ConsistencyPanel({
  character,
  className,
}: {
  character: Character
  className?: string
}) {
  const items = useMemo(() => buildConsistencyChecklist(character), [character])
  const done = items.filter((item) => item.complete).length
  const total = items.length
  const percent = Math.round((done / total) * 100)

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-labelledby="pf-consistency">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="pf-consistency" className="text-sm font-medium text-ink">
          Consistency checklist
        </h3>
        <span className="text-xs text-ink-muted tabular-nums">
          {done} of {total}
        </span>
      </div>

      <div
        className="h-1.5 w-full overflow-hidden rounded-pill bg-bg-inset"
        role="img"
        aria-label={`${percent} percent of the consistency checklist complete`}
      >
        <div
          className={cn(
            'h-full rounded-pill transition-[width] duration-[var(--pf-duration-slow)]',
            done === total ? 'bg-success' : 'bg-primary',
          )}
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>

      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5 border-b border-line py-2 last:border-b-0"
          >
            <span
              className={cn('mt-0.5 shrink-0', item.complete ? 'text-success' : 'text-ink-faint')}
              aria-hidden="true"
            >
              <Icon name={item.complete ? 'check' : 'close'} size={14} />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-xs font-medium',
                  item.complete ? 'text-ink-muted line-through' : 'text-ink',
                )}
              >
                {item.label}
              </span>
              {!item.complete ? (
                <span className="mt-0.5 block text-xs leading-5 text-ink-faint">{item.reason}</span>
              ) : null}
              <span className="sr-only">{item.complete ? 'Complete' : 'Not yet done'}</span>
            </span>
          </li>
        ))}
      </ul>

      {done === total ? (
        <p className="rounded-md border border-success/40 bg-bg-inset px-3 py-2 text-xs text-ink-muted">
          Every item is covered. An artist has enough here to draw {character.name} the same way
          twice.
        </p>
      ) : null}
    </section>
  )
}
