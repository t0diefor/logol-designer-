import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/cn'
import { getProviderStatus } from '../provider-registry'
import { REWRITE_TOOLS, runRewrite, type RewriteSuggestion, type RewriteToolId } from '../rewrite'
import { DiffView } from './DiffView'

export interface RewritePanelProps {
  open: boolean
  onClose: () => void
  /** What is being rewritten, for the dialog title. */
  fieldLabel: string
  text: string
  /** Called only when the user explicitly applies a suggestion. */
  onApply: (text: string) => void
}

type RunState = 'idle' | 'running' | 'review' | 'error' | 'no-change'

/**
 * The rewriting surface.
 *
 * This is where the "never replace the user's writing without a reviewable
 * proposal" rule gets its hardest test, because unlike the expansion tools
 * these edits target prose the writer has already produced. So:
 *
 *  - The proposal is shown as a word-level diff against the original, not as
 *    a finished block of replacement text. You can see exactly what goes.
 *  - The itemised list of what the rule did is shown alongside, so the edit
 *    can be checked rather than trusted.
 *  - The suggestion is editable before it is applied.
 *  - Tools that would need a language model are visibly disabled with the
 *    reason, rather than quietly producing something that resembles them.
 */
export function RewritePanel({ open, onClose, fieldLabel, text, onApply }: RewritePanelProps) {
  const [state, setState] = useState<RunState>('idle')
  const [activeTool, setActiveTool] = useState<RewriteToolId | null>(null)
  const [suggestion, setSuggestion] = useState<RewriteSuggestion | null>(null)
  const [edited, setEdited] = useState('')
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const status = getProviderStatus()

  useEffect(() => () => controllerRef.current?.abort(), [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState('idle')
    setSuggestion(null)
    setActiveTool(null)
    setError(null)
    setEdited('')
  }, [])

  const run = useCallback(
    async (tool: RewriteToolId) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      setActiveTool(tool)
      setState('running')
      setError(null)
      setSuggestion(null)

      try {
        const results = await runRewrite(tool, text, { signal: controller.signal })
        if (controller.signal.aborted) return

        if (results.length === 0) {
          setState('no-change')
          return
        }

        setSuggestion(results[0]!)
        setEdited(results[0]!.text)
        setState('review')
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === 'AbortError') {
          setState('idle')
          return
        }
        setError(caught instanceof Error ? caught.message : 'The rewrite could not be produced.')
        setState('error')
      } finally {
        if (controllerRef.current === controller) controllerRef.current = null
      }
    },
    [text],
  )

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title={`Rewrite: ${fieldLabel}`}
      description="Nothing is changed until you apply a suggestion."
      size="lg"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.configured ? 'success' : 'warning'}>
          {status.configured ? status.name : 'Mock mode'}
        </Badge>
        <span className="text-xs text-ink-muted">
          Rule-based tools run on your device. CA$0.00, no network request.
        </span>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 text-sm font-medium text-ink">Choose a tool</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {REWRITE_TOOLS.map((tool) => {
            const disabled = tool.needsModel
            const active = activeTool === tool.id

            return (
              <li key={tool.id}>
                <button
                  type="button"
                  disabled={disabled || state === 'running'}
                  onClick={() => void run(tool.id)}
                  className={cn(
                    'w-full rounded-md border p-3 text-left border-[length:var(--pf-border-width)]',
                    'transition-colors duration-[var(--pf-duration-fast)]',
                    disabled
                      ? 'cursor-not-allowed border-line bg-bg-inset opacity-60'
                      : active
                        ? 'border-primary bg-surface-raised'
                        : 'border-line bg-surface hover:border-line-strong',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink">{tool.label}</span>
                    {disabled ? <Badge tone="warning">Needs a model</Badge> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-ink-muted">
                    {tool.description}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-ink-faint">{tool.method}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {state === 'running' ? (
        <div className="mt-5 flex items-center gap-3">
          <Button variant="primary" loading>
            Rewriting
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              controllerRef.current?.abort()
              setState('idle')
            }}
          >
            Cancel
          </Button>
        </div>
      ) : null}

      {state === 'error' ? (
        <p
          role="alert"
          className="mt-5 rounded-md border border-danger/40 bg-bg-inset px-3 py-2.5 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      {state === 'no-change' ? (
        <p className="mt-5 rounded-md border border-line bg-bg-inset px-3 py-2.5 text-sm text-ink-muted">
          This rule found nothing to change here. Your text is left exactly as it was.
        </p>
      ) : null}

      {state === 'review' && suggestion ? (
        <div className="mt-6 border-t border-line pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-ink">Proposed change</h3>
            <Badge>{suggestion.label}</Badge>
          </div>

          <DiffView before={text} after={edited} />

          {suggestion.changes.length > 0 ? (
            <div className="mt-4">
              <h4 className="mb-1.5 text-xs font-medium text-ink">What the rule did</h4>
              <ul className="flex flex-col gap-1">
                {suggestion.changes.map((change, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs text-ink-muted">
                    <span className="mt-0.5 text-ink-faint">
                      <Icon name="check" size={12} />
                    </span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <label className="mt-5 block">
            <span className="mb-1.5 block text-xs text-ink-faint">
              Edit the suggestion before applying it, if you want
            </span>
            <Textarea rows={6} value={edited} onChange={(event) => setEdited(event.target.value)} />
          </label>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon="check"
              disabled={edited.trim() === text.trim()}
              onClick={() => {
                onApply(edited)
                reset()
                onClose()
              }}
            >
              Apply this rewrite
            </Button>
            <Button variant="ghost" onClick={reset}>
              Keep what I wrote
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  )
}
