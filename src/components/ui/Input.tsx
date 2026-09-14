import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon } from './Icon'

/*
 * Inputs are identified by an inset fill that differs from the surface, not by
 * their border alone. That is the assumption the theme contrast test relies on
 * when it exempts borders from the 3:1 non-text contrast rule -- so if this
 * ever changes to a borderless-on-surface design, that test must change too.
 */
const CONTROL_BASE = cn(
  'w-full rounded-md border border-line bg-bg-inset text-ink',
  'border-[length:var(--pf-border-width)]',
  'placeholder:text-ink-faint',
  'transition-[border-color,background-color] duration-[var(--pf-duration-fast)]',
  'hover:border-line-strong',
  'disabled:cursor-not-allowed disabled:opacity-60',
  'aria-[invalid=true]:border-danger',
)

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, 'h-10 px-3 text-sm', className)}
      {...props}
    />
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, 'resize-y px-3 py-2 text-sm leading-6', className)}
      {...props}
    />
  )
})

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  /** Accessible name, since search fields often have no visible label. */
  label?: string
}

/** Text input with a leading search icon. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, label = 'Search', placeholder = 'Search...', ...props },
  ref,
) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-faint">
        <Icon name="search" size={16} />
      </span>
      <Input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        className={cn('pl-9', className)}
        {...props}
      />
    </div>
  )
})

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, 'h-10 cursor-pointer px-3 text-sm', className)}
      {...props}
    >
      {children}
    </select>
  )
})
