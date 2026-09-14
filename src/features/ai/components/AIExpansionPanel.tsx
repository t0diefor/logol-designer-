import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Textarea } from '@/components/ui/Input'
import { getProvider } from '../provider-registry'
import { buildPatch } from '../types'
import type { useCharacterExpansion } from '../use-character-expansion'
import type { Character } from '@/types/character'

export interface AIExpansionPanelProps {
  character: Character
  tool: ReturnType<typeof useCharacterExpansion>
  onApply: (patch: Partial<Character>, acceptedCount: number) => void
}

/**
 * The explainable AI panel.
 *
 * Before anything runs it states: what the tool is, what it will do, which
 * data it reads, and whether it changes existing content. After it runs, every
 * suggestion is shown beside what it would replace, with accept, edit and
 * reject per field. Nothing reaches the character record until Apply is
 * pressed, and Apply only writes fields marked accepted.
 *
 * The disclosure is not decoration. A tool that silently rewrote a writer's
 * backstory would be worse than no tool, so the affordances that prevent that
 * are the feature.
 */
export function AIExpansionPanel({ character, tool, onApply }: AIExpansionPanelProps) {
  const provider = getProvider()
  const { status } = provider

  return (
    <section
      className="rounded-lg border border-line bg-surface p-5 border-[length:var(--pf-border-width)]"
      aria-labelledby="pf-ai-tool"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-accent">
              <Icon name="sparkles" size={18} />
            </span>
            <h3 id="pf-ai-tool" className="text-lg text-ink">
              Expand this character
            </h3>
          </div>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-ink-muted">
            Suggests starting text for fields you have left empty: appearance, traits, weaknesses,
            goals, dialogue style and a backstory opener.
          </p>
        </div>
        <Badge tone={status.configured ? 'success' : 'warning'}>
          {status.configured ? status.name : 'Mock mode'}
        </Badge>
      </div>

      {/* The disclosure block. Four questions, answered before anything runs. */}
      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-faint">Reads</dt>
        <dd className="text-ink-muted">
          This character&apos;s name and role. Nothing else, and nothing from other projects.
        </dd>

        <dt className="text-ink-faint">Changes</dt>
        <dd className="text-ink-muted">
          Nothing on its own. It only proposes values for <strong className="text-ink">empty</strong>{' '}
          fields, and you decide on each one.
        </dd>

        <dt className="text-ink-faint">Provider</dt>
        <dd className="text-ink-muted">{status.description}</dd>

        <dt className="text-ink-faint">Cost</dt>
        <dd className="text-ink-muted">
          {status.estimatedCostCad === 0
            ? 'CA$0.00 — runs entirely on your device, no network request.'
            : `About CA$${status.estimatedCostCad.toFixed(3)} per run.`}
        </dd>
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {tool.state === 'running' ? (
          <>
            <Button variant="primary" loading>
              Generating
            </Button>
            <Button variant="ghost" onClick={tool.cancel}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="primary" icon="sparkles" onClick={() => void tool.run()}>
            {tool.state === 'review' ? 'Generate again' : 'Suggest content'}
          </Button>
        )}

        {tool.state === 'review' ? (
          <Button variant="ghost" onClick={tool.reset}>
            Discard suggestions
          </Button>
        ) : null}
      </div>

      {/* ---- States ---- */}

      {tool.state === 'error' ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-danger/40 bg-bg-inset px-3 py-2.5 text-sm text-danger"
        >
          {tool.error}{' '}
          <button type="button" onClick={() => void tool.run()} className="underline">
            Try again
          </button>
        </p>
      ) : null}

      {tool.state === 'empty' ? (
        <p className="mt-4 rounded-md border border-line bg-bg-inset px-3 py-2.5 text-sm text-ink-muted">
          Nothing to suggest — every field this tool covers is already written. It never proposes
          changes to text you have entered.
        </p>
      ) : null}

      {tool.state === 'review' ? (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted">
              <span className="text-ink">{tool.proposals.length} suggestions.</span>{' '}
              {tool.pendingCount > 0
                ? `${tool.pendingCount} still need a decision.`
                : 'All reviewed.'}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => tool.decideAll('accepted')}>
                Accept all
              </Button>
              <Button size="sm" variant="ghost" onClick={() => tool.decideAll('rejected')}>
                Reject all
              </Button>
            </div>
          </div>

          <ul className="flex flex-col gap-3">
            {tool.proposals.map((proposal) => (
              <li
                key={proposal.key}
                className={cn(
                  'rounded-md border p-4 border-[length:var(--pf-border-width)]',
                  proposal.decision === 'accepted' && 'border-success/50 bg-bg-inset',
                  proposal.decision === 'rejected' && 'border-line bg-bg-inset opacity-55',
                  proposal.decision === 'pending' && 'border-line bg-bg-inset',
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{proposal.label}</span>
                  <span className="flex items-center gap-1.5">
                    {proposal.decision === 'accepted' ? (
                      <Badge tone="success">Will be applied</Badge>
                    ) : proposal.decision === 'rejected' ? (
                      <Badge>Rejected</Badge>
                    ) : (
                      <Badge tone="warning">Undecided</Badge>
                    )}
                  </span>
                </div>

                <p className="mt-1.5 text-xs leading-5 text-ink-faint">{proposal.rationale}</p>

                {proposal.current ? (
                  <p className="mt-3 rounded-sm border-l-2 border-line pl-3 text-xs text-ink-muted">
                    <span className="mb-0.5 block text-ink-faint">Currently</span>
                    {proposal.current}
                  </p>
                ) : (
                  <p className="mt-3 text-xs italic text-ink-faint">
                    This field is currently empty, so nothing would be overwritten.
                  </p>
                )}

                <label className="mt-3 block">
                  <span className="mb-1.5 block text-xs text-ink-faint">
                    Suggested — edit it before accepting if you want
                  </span>
                  <Textarea
                    rows={3}
                    value={proposal.edited}
                    onChange={(event) => tool.edit(proposal.key, event.target.value)}
                    disabled={proposal.decision === 'rejected'}
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={proposal.decision === 'accepted' ? 'primary' : 'secondary'}
                    icon="check"
                    onClick={() => tool.decide(proposal.key, 'accepted')}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="close"
                    onClick={() => tool.decide(proposal.key, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <Button
              variant="primary"
              icon="check"
              disabled={tool.acceptedCount === 0}
              onClick={() => {
                const patch = buildPatch(character, tool.proposals)
                onApply(patch, tool.acceptedCount)
                tool.reset()
              }}
            >
              Apply {tool.acceptedCount} accepted
            </Button>
            <p className="text-xs text-ink-muted">
              A restore point is saved first, so this can be undone from the History tab.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
