import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconPosition?: 'start' | 'end'
  /** Shows a spinner and blocks interaction. The button stays the same width. */
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

/*
 * Every colour and radius below resolves to a theme token, which is why one
 * button definition serves all six themes. `transition-[...]` durations come
 * from --pf-duration-*, so motion speed follows the theme too.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-fg border-transparent hover:bg-primary-hover active:translate-y-px',
  secondary:
    'bg-surface text-ink border-line hover:bg-surface-raised hover:border-line-strong active:translate-y-px',
  ghost:
    'bg-transparent text-ink-muted border-transparent hover:bg-surface-raised hover:text-ink',
  danger: 'bg-danger text-danger-fg border-transparent hover:opacity-90 active:translate-y-px',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

/** A small inline spinner. Uses `currentColor` so it works on any variant. */
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    iconPosition = 'start',
    loading = false,
    fullWidth = false,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      // Announces the busy state to screen readers, which a spinner alone does not.
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md border font-medium',
        'transition-[background-color,border-color,color,transform,opacity]',
        'duration-[var(--pf-duration-fast)] ease-[var(--pf-easing)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'border-[length:var(--pf-border-width)]',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Spinner size={size === 'lg' ? 18 : 15} /> : null}
      {!loading && icon && iconPosition === 'start' ? (
        <Icon name={icon} size={size === 'lg' ? 19 : 16} />
      ) : null}
      {children}
      {!loading && icon && iconPosition === 'end' ? (
        <Icon name={icon} size={size === 'lg' ? 19 : 16} />
      ) : null}
    </button>
  )
})
