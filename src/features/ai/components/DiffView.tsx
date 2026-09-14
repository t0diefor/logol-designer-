import { useMemo } from 'react'
import { cn } from '@/lib/cn'
import { diffStats, diffWords } from '@/lib/diff'

export interface DiffViewProps {
  before: string
  after: string
  className?: string
}

/**
 * Word-level diff of a proposed rewrite.
 *
 * Colour alone never carries the meaning: removed text is struck through and
 * added text is underlined, so the diff is readable without colour vision and
 * survives a theme where red and green are not the accent colours. Each run
 * also carries visually hidden text naming it, so a screen reader hears
 * "removed ... added ..." rather than an undifferentiated sentence.
 */
export function DiffView({ before, after, className }: DiffViewProps) {
  const parts = useMemo(() => diffWords(before, after), [before, after])
  const stats = useMemo(() => diffStats(parts), [parts])

  return (
    <div className={className}>
      <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
        <span className="text-danger">
          &minus;{stats.removed} word{stats.removed === 1 ? '' : 's'}
        </span>
        <span className="text-success">
          +{stats.added} word{stats.added === 1 ? '' : 's'}
        </span>
        <span className="text-ink-faint">
          {Math.round(stats.retained * 100)}% of your wording kept
        </span>
      </p>

      <p className="rounded-md border border-line bg-bg-inset p-3 text-sm leading-7 text-ink">
        {parts.map((part, index) => {
          if (part.op === 'equal') {
            return <span key={index}>{part.text}</span>
          }

          /*
           * The surrounding whitespace is rendered outside the mark. Styling
           * it too makes a strikethrough run into the next word, so "removed
           * basically" reads as "basically-telling".
           */
          const [, lead = '', word = '', trail = ''] = /^(\s*)([\s\S]*?)(\s*)$/.exec(part.text) ?? []

          const Tag = part.op === 'delete' ? 'del' : 'ins'

          return (
            <span key={index}>
              {lead}
              <Tag
                className={cn(
                  'rounded-sm decoration-2',
                  part.op === 'delete'
                    ? 'bg-danger/15 text-danger decoration-danger/70'
                    : 'bg-success/15 text-success underline-offset-2 [text-decoration-line:underline]',
                )}
              >
                <span className="sr-only">{part.op === 'delete' ? 'removed: ' : 'added: '}</span>
                {word}
              </Tag>
              {trail}
            </span>
          )
        })}
      </p>
    </div>
  )
}
