import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Input'
import { TagInput } from '@/components/ui/TagInput'
import { RewritePanel } from '@/features/ai/components/RewritePanel'
import { FieldGrid, TextField } from '@/features/characters/components/sections/section-kit'
import { outlineFromNotes } from '@/lib/rewrite-rules'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Character } from '@/types/character'
import type { Scene } from '@/types/story'
import type { Location } from '@/types/world'
import { BeatSheet } from './BeatSheet'
import { ScriptEditor } from './ScriptEditor'

const STATUSES: Scene['status'][] = ['idea', 'outlined', 'drafted', 'revised', 'final']

/** Which field the rewrite dialog is currently pointed at. */
type RewriteTarget = { field: 'summary' | 'goal' | 'conflict' | 'outcome'; label: string } | null

export function SceneEditor({
  scene,
  cast,
  locations,
}: {
  scene: Scene
  cast: Character[]
  locations: Location[]
}) {
  const updateScene = useWorkspaceStore((state) => state.updateScene)
  const addBeat = useWorkspaceStore((state) => state.addBeat)
  const [rewriting, setRewriting] = useState<RewriteTarget>(null)
  const [outlineNote, setOutlineNote] = useState('')

  const onChange = (changes: Partial<Scene>) => updateScene(scene.id, changes)

  /**
   * A field with a rewrite affordance on its label row.
   *
   * The button is named per field ("Rewrite goal", not "Rewrite") because four
   * controls sharing one accessible name is indistinguishable to a screen
   * reader, and the label itself stays a real label rather than being emptied
   * to make room for the button.
   */
  const rewritable = (
    field: NonNullable<RewriteTarget>['field'],
    label: string,
    hint: string,
    rows = 3,
  ) => (
    <TextField
      label={label}
      hint={hint}
      wide
      multiline
      rows={rows}
      value={scene[field]}
      onChange={(value) => onChange({ [field]: value } as Partial<Scene>)}
      action={
        <Button
          size="sm"
          variant="ghost"
          icon="sparkles"
          disabled={!scene[field].trim()}
          onClick={() => setRewriting({ field, label })}
        >
          Rewrite {label.toLowerCase()}
        </Button>
      }
    />
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <FieldGrid>
          <TextField label="Title" value={scene.title} onChange={(title) => onChange({ title })} />
          <TextField
            label="Slug"
            hint="Where and when, in one line. INT. HARBOUR OFFICE — NIGHT."
            value={scene.slug}
            onChange={(slug) => onChange({ slug })}
          />

          <Field label="Location">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={scene.locationId ?? ''}
                onChange={(event) => onChange({ locationId: event.target.value || null })}
              >
                <option value="">Not tied to a place</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Status">
            {({ id, describedBy }) => (
              <Select
                id={id}
                aria-describedby={describedBy}
                value={scene.status}
                onChange={(event) => onChange({ status: event.target.value as Scene['status'] })}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status[0]!.toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {rewritable('summary', 'Summary', 'What happens, in a sentence or two.', 3)}
        </FieldGrid>
      </Card>

      {/* The dramatic engine. Separated because these three are what make a
          scene work, and burying them among the metadata hides that. */}
      <Card>
        <h3 className="text-base text-ink">The engine of the scene</h3>
        <p className="mb-5 mt-1 max-w-xl text-sm leading-6 text-ink-muted">
          A scene where nobody wants anything, or gets it without difficulty, is a scene that can
          be cut. These three fields are the check against that.
        </p>

        <FieldGrid>
          {rewritable('goal', 'Goal', 'What the point-of-view character is trying to get.', 2)}
          {rewritable('conflict', 'Conflict', 'What stops them. A person, not a circumstance, wherever possible.', 2)}
          {rewritable('outcome', 'Outcome', 'What changes by the end. If nothing does, ask why the scene is here.', 2)}
        </FieldGrid>

        {cast.length > 0 ? (
          <fieldset className="mt-7 border-0 p-0">
            <legend className="mb-1 text-sm font-medium text-ink">Character objectives</legend>
            <p className="mb-3 text-xs text-ink-muted">
              What each person present wants in this scene specifically — not in the story overall.
            </p>
            <div className="flex flex-col gap-3">
              {cast.map((character) => (
                <label key={character.id} className="grid gap-1.5 sm:grid-cols-[140px_1fr] sm:items-center">
                  <span className="truncate text-sm text-ink-muted">{character.name}</span>
                  <input
                    value={scene.characterObjectives[character.id] ?? ''}
                    onChange={(event) =>
                      onChange({
                        characterObjectives: {
                          ...scene.characterObjectives,
                          [character.id]: event.target.value,
                        },
                      })
                    }
                    placeholder="Wants to leave without being asked why"
                    aria-label={`What ${character.name} wants in this scene`}
                    className="h-10 w-full rounded-md border border-line bg-bg-inset px-3 text-sm text-ink border-[length:var(--pf-border-width)] placeholder:text-ink-faint"
                  />
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </Card>

      <Card>
        <BeatSheet scene={scene} />

        <div className="mt-6 border-t border-line pt-5">
          <h4 className="text-sm font-medium text-ink">Turn notes into beats</h4>
          <p className="mb-3 mt-1 text-xs leading-5 text-ink-muted">
            Paste rough notes, one idea per line. Splitting them into beats is a structural
            operation, not a generated one — nothing is rewritten.
          </p>
          <TextField
            label="Rough notes"
            value={outlineNote}
            onChange={setOutlineNote}
            multiline
            rows={4}
            placeholder={'She arrives early\nHe lies about the ledger\nShe already knows'}
          />
          <Button
            className="mt-2"
            icon="plus"
            disabled={outlineFromNotes(outlineNote).length === 0}
            onClick={() => {
              for (const beat of outlineFromNotes(outlineNote)) addBeat(scene.id, beat)
              setOutlineNote('')
            }}
          >
            Add {outlineFromNotes(outlineNote).length || ''} beat
            {outlineFromNotes(outlineNote).length === 1 ? '' : 's'}
          </Button>
        </div>
      </Card>

      <Card>
        <ScriptEditor scene={scene} cast={cast} />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base text-ink">Notes and tags</h3>
          <Badge>{scene.status}</Badge>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Tags">
            {({ id, describedBy }) => (
              <TagInput
                id={id}
                describedBy={describedBy}
                value={scene.tags}
                onChange={(tags) => onChange({ tags })}
              />
            )}
          </Field>
        </div>
      </Card>

      {rewriting ? (
        <RewritePanel
          open
          fieldLabel={rewriting.label}
          text={scene[rewriting.field]}
          onClose={() => setRewriting(null)}
          onApply={(value) => onChange({ [rewriting.field]: value } as Partial<Scene>)}
        />
      ) : null}
    </div>
  )
}
