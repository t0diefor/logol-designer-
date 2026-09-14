import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { newId } from '@/lib/id'
import type { Character, Expression } from '@/types/character'
import { ListHeader, TextField } from './section-kit'

/** Offered as one-click starting points, because a blank list invites one entry and no more. */
const SUGGESTED = ['Neutral', 'Angry', 'Afraid', 'Delighted', 'Exhausted', 'Determined']

export function ExpressionsSection({
  character,
  onChange,
}: {
  character: Character
  onChange: (changes: Partial<Character>) => void
}) {
  const { expressions } = character

  function addExpression(name: string) {
    if (expressions.length >= 40) return
    const expression: Expression = { id: newId(), name, description: '', reference: null }
    onChange({ expressions: [...expressions, expression] })
  }

  function updateExpression(id: string, changes: Partial<Expression>) {
    onChange({
      expressions: expressions.map((expression) =>
        expression.id === id ? { ...expression, ...changes } : expression,
      ),
    })
  }

  const unusedSuggestions = SUGGESTED.filter(
    (name) => !expressions.some((expression) => expression.name.toLowerCase() === name.toLowerCase()),
  )

  return (
    <>
      <ListHeader
        title="Expressions"
        description="One reference face produces a character who only ever has one mood. Three is the minimum the consistency checklist looks for."
        action={
          <Button icon="plus" onClick={() => addExpression('New expression')} disabled={expressions.length >= 40}>
            Add expression
          </Button>
        }
      />

      {unusedSuggestions.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-faint">Quick add</span>
          {unusedSuggestions.map((name) => (
            <Button key={name} size="sm" variant="ghost" icon="plus" onClick={() => addExpression(name)}>
              {name}
            </Button>
          ))}
        </div>
      ) : null}

      {expressions.length === 0 ? (
        <EmptyState
          icon="user"
          title="No expressions yet"
          description="Name the moods this character actually plays in the story. You can attach a reference image to each one from the References tab."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {expressions.map((expression) => (
            <li
              key={expression.id}
              className="rounded-lg border border-line bg-surface p-4 border-[length:var(--pf-border-width)]"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <TextField
                    label="Name"
                    value={expression.name}
                    onChange={(name) => updateExpression(expression.id, { name })}
                  />
                </div>
                <IconButton
                  icon="trash"
                  label={`Delete expression ${expression.name}`}
                  size="sm"
                  variant="danger"
                  className="mt-6"
                  onClick={() =>
                    onChange({
                      expressions: expressions.filter((item) => item.id !== expression.id),
                    })
                  }
                />
              </div>
              <TextField
                label="How it reads"
                hint="What the face actually does, not the emotion word."
                value={expression.description}
                onChange={(description) => updateExpression(expression.id, { description })}
                placeholder="Jaw set, eyes down, one hand flat on the table"
                multiline
                rows={3}
              />
              {expression.reference ? (
                <p className="mt-2 text-xs text-ink-faint">
                  Reference attached: {expression.reference.label || 'unnamed image'}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
