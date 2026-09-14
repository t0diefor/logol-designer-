import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { IconButton } from './IconButton'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const

/**
 * Modal dialog built on the native `<dialog>` element.
 *
 * Using the platform element rather than a div gives focus trapping, Escape to
 * close, inert background content and correct `role="dialog"` semantics for
 * free -- all of which are easy to implement badly by hand, and all of which
 * users depending on a keyboard or screen reader actually need.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    // Fires for Escape as well as programmatic close, so parent state stays in sync.
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="pf-modal-title"
      aria-describedby={description ? 'pf-modal-description' : undefined}
      // Clicking the backdrop closes; clicks inside the panel stop propagating.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
      className={cn(
        'm-auto w-[calc(100vw-2rem)] rounded-lg border border-line bg-surface-overlay p-0 text-ink shadow-lg',
        'border-[length:var(--pf-border-width)]',
        'backdrop:bg-black/60 backdrop:backdrop-blur-sm',
        SIZES[size],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h2 id="pf-modal-title" className="text-xl text-ink">
            {title}
          </h2>
          {description ? (
            <p id="pf-modal-description" className="mt-1 text-sm text-ink-muted">
              {description}
            </p>
          ) : null}
        </div>
        <IconButton icon="close" label="Close dialog" size="sm" onClick={onClose} />
      </div>

      {children ? <div className="px-5 py-5">{children}</div> : null}

      {footer ? (
        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>
      ) : null}
    </dialog>
  )
}
