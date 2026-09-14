import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-bg-inset text-ink-muted border-line',
  primary: 'bg-primary text-primary-fg border-transparent',
  accent: 'bg-accent text-accent-fg border-transparent',
  success: 'bg-success text-success-fg border-transparent',
  warning: 'bg-warning text-warning-fg border-transparent',
  danger: 'bg-danger text-danger-fg border-transparent',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
