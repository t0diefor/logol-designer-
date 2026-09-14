import { usePersistenceStore } from '@/stores/persistence-store'
import { formatClockTime } from '@/lib/format'
import { Icon, type IconName } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

/**
 * Reports whether work is actually written to disk.
 *
 * It reflects real storage results rather than optimistically claiming
 * success: an indicator that always reads "Saved" trains people to ignore it,
 * which makes it worse than showing nothing.
 */
export function AutosaveIndicator({ className }: { className?: string }) {
  const status = usePersistenceStore((state) => state.status)
  const lastSavedAt = usePersistenceStore((state) => state.lastSavedAt)
  const message = usePersistenceStore((state) => state.message)

  const view: { icon: IconName; label: string; tone: string; detail?: string } = (() => {
    switch (status) {
      case 'saving':
        return { icon: 'cloud', label: 'Saving...', tone: 'text-ink-muted' }
      case 'saved':
        return {
          icon: 'check',
          label: 'Saved',
          tone: 'text-success',
          detail: lastSavedAt ? `at ${formatClockTime(lastSavedAt)}` : undefined,
        }
      case 'error':
        return { icon: 'alert', label: 'Not saved', tone: 'text-danger', detail: message ?? undefined }
      case 'unavailable':
        return {
          icon: 'alert',
          label: 'Saving off',
          tone: 'text-warning',
          detail: message ?? undefined,
        }
      default:
        return { icon: 'cloud', label: 'No changes yet', tone: 'text-ink-faint' }
    }
  })()

  return (
    <div
      // Polite so it never interrupts what a screen reader is currently reading,
      // but errors still get announced.
      role="status"
      aria-live="polite"
      title={view.detail ?? view.label}
      className={cn('flex items-center gap-1.5 text-xs', view.tone, className)}
    >
      <Icon name={view.icon} size={14} />
      <span className="hidden md:inline">{view.label}</span>
      {view.detail && status !== 'error' && status !== 'unavailable' ? (
        <span className="hidden text-ink-faint lg:inline">{view.detail}</span>
      ) : null}
    </div>
  )
}
