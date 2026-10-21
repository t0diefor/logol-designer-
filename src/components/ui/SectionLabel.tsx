import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SectionLabelProps {
  children: ReactNode
  /** Heading level. Defaults to h3; pick the one that fits the page outline. */
  as?: 'h2' | 'h3' | 'h4'
  className?: string
  /** For `aria-labelledby`, when the label names a landmark or region. */
  id?: string
}

/**
 * A small heading that labels a region of UI.
 *
 * `global.css` gives every h1-h4 the theme's display face, which is right for
 * page and section titles and wrong here: at 14px, beside ordinary field
 * labels, a display serif reads as a different kind of thing entirely. In the
 * asset sidebar it produced "Used in" and "File" in small-caps Cinzel directly
 * above "Collections" in Inter.
 *
 * So this stays a real heading -- it labels a region and belongs in the
 * document outline -- while taking the body face, which is what a label is.
 */
export function SectionLabel({ children, as: Tag = 'h3', className, id }: SectionLabelProps) {
  return (
    <Tag
      id={id}
      className={cn(
        'font-body text-sm font-medium tracking-normal normal-case text-ink',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
