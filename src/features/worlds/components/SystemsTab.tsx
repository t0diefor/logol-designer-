import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { Input, Select } from '@/components/ui/Input'
import { TagInput } from '@/components/ui/TagInput'
import { FieldGrid, TextField } from '@/features/characters/components/sections/section-kit'
import { useSystemsForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { WorldSystem } from '@/types/world'
import { MasterDetail } from './MasterDetail'

const CATEGORIES: { value: WorldSystem['category']; label: string }[] = [
  { value: 'magic', label: 'Magic' },
  { value: 'technology', label: 'Technology' },
  { value: 'culture', label: 'Culture' },
  { value: 'economy', label: 'Economy' },
  { value: 'religion', label: 'Religion' },
  { value: 'other', label: 'Other' },
]

/** Numbered, quotable rules. Kept as a list so they can be cited individually. */
function RulesEditor({
  rules,
  onChange,
}: {
  rules: string[]
  onChange: (rules: string[]) => void
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const value = draft.trim()
    if (!value || rules.length >= 40) return
    onChange([...rules, value])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-3">
      {rules.length > 0 ? (
        <ol className="flex flex-col gap-2">
          {rules.map((rule, index) => (
            <li key={`${index}-${rule.slice(0, 12)}`} className="flex items-start gap-2">
              <span className="mt-2 w-5 shrink-0 text-right font-mono text-xs text-ink-faint tabular-nums">
                {index + 1}
              </span>
              <Input
                value={rule}
                onChange={(event) =>
                  onChange(rules.map((item, i) => (i === index ? event.target.value : item)))
                }
                aria-label={`Rule ${index + 1}`}
              />
              <IconButton
                icon="trash"
                label={`Delete rule ${index + 1}`}
                size="sm"
                variant="danger"
                onClick={() => onChange(rules.filter((_, i) => i !== index))}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-ink-faint">
          No rules yet. A system without stated limits stops generating drama.
        </p>
      )}

      {rules.length < 40 ? (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              add()
            }}
            placeholder="Nothing is created. Every gain is taken from somewhere."
            aria-label="New rule"
          />
          <Button icon="plus" onClick={add}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export function SystemsTab({ projectId }: { projectId: string }) {
  const systems = useSystemsForProject(projectId)
  const createSystem = useWorkspaceStore((state) => state.createSystem)
  const updateSystem = useWorkspaceStore((state) => state.updateSystem)
  const deleteSystem = useWorkspaceStore((state) => state.deleteSystem)

  const [selectedId, setSelectedId] = useState<string | null>(systems[0]?.id ?? null)
  const [pendingDelete, setPendingDelete] = useState<WorldSystem | null>(null)

  const selected = systems.find((system) => system.id === selectedId) ?? null

  return (
    <>
      <MasterDetail
        items={systems.map((system) => ({
          id: system.id,
          name: system.name,
          meta: CATEGORIES.find((c) => c.value === system.category)?.label,
        }))}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id || null)}
        onCreate={() => {
          const system = createSystem(projectId, `System ${systems.length + 1}`)
          setSelectedId(system.id)
        }}
        createLabel="Add system"
        icon="settings"
        emptyTitle="No systems yet"
        emptyDescription="Anything with rules and costs: how magic works, what the technology can and cannot do, how a culture settles disputes. The limits matter more than the mechanics."
        searchPlaceholder="Search systems"
        renderDetail={() => {
          if (!selected) return null
          const onChange = (changes: Partial<WorldSystem>) => updateSystem(selected.id, changes)

          return (
            <Card>
              <FieldGrid>
                <TextField label="Name" value={selected.name} onChange={(name) => onChange({ name })} />

                <Field label="Category">
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={selected.category}
                      onChange={(event) =>
                        onChange({ category: event.target.value as WorldSystem['category'] })
                      }
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <TextField
                  label="Summary"
                  value={selected.summary}
                  onChange={(summary) => onChange({ summary })}
                  wide
                />
                <TextField
                  label="How it works"
                  value={selected.mechanics}
                  onChange={(mechanics) => onChange({ mechanics })}
                  multiline
                  rows={6}
                  wide
                />
                <TextField
                  label="Limits and costs"
                  hint="The most important field here. A power with no price cannot create tension."
                  value={selected.limits}
                  onChange={(limits) => onChange({ limits })}
                  multiline
                  rows={4}
                  wide
                />

                <Field
                  label="Rules"
                  hint="Numbered so you can cite one in a script note: 'breaks rule 3'."
                  className="sm:col-span-2"
                >
                  {() => (
                    <RulesEditor rules={selected.rules} onChange={(rules) => onChange({ rules })} />
                  )}
                </Field>

                <Field label="Tags">
                  {({ id, describedBy }) => (
                    <TagInput
                      id={id}
                      describedBy={describedBy}
                      value={selected.tags}
                      onChange={(tags) => onChange({ tags })}
                    />
                  )}
                </Field>
              </FieldGrid>

              <div className="mt-6 flex border-t border-line pt-4">
                <Button
                  variant="danger"
                  icon="trash"
                  className="ml-auto"
                  onClick={() => setPendingDelete(selected)}
                >
                  Delete system
                </Button>
              </div>
            </Card>
          )
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this system?"
        description={pendingDelete ? `"${pendingDelete.name}" and its rules will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete system"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteSystem(pendingDelete.id)
            if (selectedId === pendingDelete.id) setSelectedId(null)
          }
          setPendingDelete(null)
        }}
      />
    </>
  )
}
