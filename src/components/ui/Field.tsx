import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  label: string
  /** Guidance shown under the label, before the user makes a mistake. */
  hint?: string
  error?: string
  required?: boolean
  className?: string
  /**
   * Receives the ids to wire onto the control. Using a render prop rather than
   * cloning children keeps the association explicit and works with any input.
   */
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}

/**
 * Label + hint + error wrapper.
 *
 * Exists so that every form control in the app is correctly associated with
 * its label and error text. Doing this by hand at each call site is exactly
 * where accessibility bugs come from.
 */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}

      {children({ id, describedBy, invalid: Boolean(error) })}

      {/* `role="alert"` so the error is announced when it appears. */}
      {error ? (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
