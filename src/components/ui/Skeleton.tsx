import { cn } from '@/lib/cn'

/**
 * Loading placeholder.
 *
 * `aria-hidden` because a screen reader should hear the loading *status* from
 * a live region, not a description of grey boxes. Pair with a visually hidden
 * "Loading..." message where the wait is user-visible.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-bg-inset', className)}
    />
  )
}
