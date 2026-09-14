import type { ReactNode } from 'react'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'

/**
 * Small building blocks shared by the character sheet sections.
 *
 * These exist so each section file stays about its own content rather than
 * repeating the same label/hint/control wiring eight times over.
 */

export function SectionIntro({ children }: { children: ReactNode }) {
  return <p className="mb-6 max-w-2xl text-sm leading-6 text-ink-muted">{children}</p>
}

export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>
}

export interface TextFieldProps {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean
  rows?: number
  /** Makes the field span both columns of a FieldGrid. */
  wide?: boolean
  placeholder2?: never
  /** A control shown on the label row, e.g. a per-field Rewrite button. */
  action?: ReactNode
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  wide = false,
  action,
}: TextFieldProps) {
  return (
    <Field
      label={label}
      hint={hint}
      action={action}
      className={wide ? 'sm:col-span-2' : undefined}
    >
      {({ id, describedBy }) =>
        multiline ? (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            rows={rows}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <Input
            id={id}
            aria-describedby={describedBy}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
          />
        )
      }
    </Field>
  )
}

/** Header for a repeatable list section (outfits, expressions, relationships). */
export function ListHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base text-ink">{title}</h3>
        <p className="mt-1 max-w-xl text-sm leading-6 text-ink-muted">{description}</p>
      </div>
      {action}
    </div>
  )
}
