import { useMemo } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { analyseText } from '@/lib/text-analysis'

/**
 * Deterministic prose analysis for one scene.
 *
 * Explicitly labelled as computed rather than generated. Word counts,
 * repetition and sentence rhythm are arithmetic over the text: exact, instant,
 * free, and identical every time. Presenting them as "AI analysis" would
 * overstate what they are and make the genuinely-AI features harder to
 * calibrate by comparison.
 */
export function RepetitionPanel({ text }: { text: string }) {
  const analysis = useMemo(() => analyseText(text), [text])

  if (!text.trim()) {
    return (
      <p className="text-sm text-ink-faint">
        Nothing written in this scene yet. Counts and repetition checks appear here as you write.
      </p>
    )
  }

  const { sentences, echoes, repeatedPhrases } = analysis
  const monotonous = sentences.longestMonotonousRun >= 4

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-medium text-ink">Scene analysis</h3>
          <Badge>Computed, not generated</Badge>
        </div>
        <p className="text-xs leading-5 text-ink-muted">
          Arithmetic over your text. No model involved, so these figures are exact and cost
          nothing.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-ink-muted">Words</dt>
        <dd className="text-ink tabular-nums">{analysis.words}</dd>
        <dt className="text-ink-muted">Sentences</dt>
        <dd className="text-ink tabular-nums">{sentences.count}</dd>
        <dt className="text-ink-muted">Average length</dt>
        <dd className="text-ink tabular-nums">{sentences.averageLength} words</dd>
        <dt className="text-ink-muted">Longest</dt>
        <dd className="text-ink tabular-nums">{sentences.longest} words</dd>
        <dt className="text-ink-muted">Reading time</dt>
        <dd className="text-ink tabular-nums">
          {analysis.readingMinutes} min<span className="text-ink-faint"> at 200 wpm</span>
        </dd>
      </dl>

      {monotonous ? (
        <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-bg-inset px-3 py-2.5 text-xs leading-5 text-ink-muted">
          <span className="mt-0.5 shrink-0 text-warning">
            <Icon name="alert" size={14} />
          </span>
          <span>
            {sentences.longestMonotonousRun} sentences in a row are within 20% of the same length.
            That reads as a flat rhythm regardless of how good the sentences are.
          </span>
        </p>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-medium text-ink">Repeated words</h4>
        {echoes.length === 0 ? (
          <p className="text-xs text-ink-faint">No words repeat closely enough to notice.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {echoes.slice(0, 6).map((echo) => (
              <li key={echo.word} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-ink">{echo.word}</span>
                <span className="shrink-0 text-ink-faint tabular-nums">
                  {echo.count}&times;, {echo.closestGap} word{echo.closestGap === 1 ? '' : 's'} apart
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {repeatedPhrases.length > 0 ? (
        <div>
          <h4 className="mb-2 text-sm font-medium text-ink">Repeated phrases</h4>
          <ul className="flex flex-col gap-1.5">
            {repeatedPhrases.slice(0, 4).map((phrase) => (
              <li key={phrase.phrase} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate text-ink">&ldquo;{phrase.phrase}&rdquo;</span>
                <span className="shrink-0 text-ink-faint tabular-nums">{phrase.count}&times;</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
