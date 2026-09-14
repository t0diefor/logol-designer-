import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName
  /** Required: an icon-only control has no visible text to name it. */
  label: string
  size?: 'sm' | 'md'
  variant?: 'ghost' | 'surface' | 'danger'
}

const VARIANTS = {
  ghost: 'text-ink-muted hover:bg-surface-raised hover:text-ink border-transparent',
  surface: 'bg-surface text-ink border-line hover:bg-surface-raised',
  danger: 'text-danger hover:bg-danger hover:text-danger-fg border-transparent',
} as const

/**
 * A square, icon-only button.
 *
 * `label` is mandatory rather than optional. An unlabelled icon button is
 * invisible to screen readers, and making the prop required means that cannot
 * be forgotten at a call site.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = 'md', variant = 'ghost', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border',
        'border-[length:var(--pf-border-width)]',
        'transition-colors duration-[var(--pf-duration-fast)] ease-[var(--pf-easing)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
    </button>
  )
})
