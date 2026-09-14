import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

export interface EmptyStateProps {
  icon?: IconName
  title: string
  /** Say what this area is for and what the first step is -- not just "No items". */
  description: string
  action?: ReactNode
  className?: string
}

/**
 * The empty state shown before a user has created anything.
 *
 * Treated as a real screen rather than an afterthought: for a new user this is
 * the first thing they see in most areas of the app, so it carries the
 * explanation and the call to action.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-line',
        'bg-surface/40 px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-bg-inset text-ink-muted">
          <Icon name={icon} size={22} />
        </div>
      ) : null}
      <h3 className="text-xl text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
