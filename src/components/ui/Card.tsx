import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * `glass` is translucent and only honoured by themes that enable glass;
   * others fall back to an opaque surface automatically via the `.pf-glass`
   * rule in global.css. Used sparingly -- overlays and the AI panel, not
   * every card on the page.
   */
  surface?: 'default' | 'raised' | 'glass'
  /** Adds hover lift. Themes with `components.lift: false` suppress the movement. */
  interactive?: boolean
  padded?: boolean
  children?: ReactNode
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { surface = 'default', interactive = false, padded = true, className, children, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-[length:var(--pf-border-width)]',
        'transition-[background-color,border-color,box-shadow,transform]',
        'duration-[var(--pf-duration-fast)] ease-[var(--pf-easing)]',
        surface === 'glass' ? 'pf-glass' : 'border-line',
        surface === 'default' && 'bg-surface',
        surface === 'raised' && 'bg-surface-raised shadow-md',
        interactive &&
          'cursor-pointer hover:border-line-strong hover:bg-surface-raised hover:shadow-md',
        padded && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
})

/** Card header with a title, optional description and an actions slot. */
export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h3 className="truncate text-lg text-ink">{title}</h3>
        {description ? <p className="mt-1 text-sm text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
