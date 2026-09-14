import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Input'
import { TagInput } from '@/components/ui/TagInput'
import { cn } from '@/lib/cn'
import { FieldGrid, TextField } from '@/features/characters/components/sections/section-kit'
import { useFactionsForProject, useLocationsForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Faction } from '@/types/world'
import { MasterDetail } from './MasterDetail'

export function FactionsTab({ projectId }: { projectId: string }) {
  const factions = useFactionsForProject(projectId)
  const locations = useLocationsForProject(projectId)
  const createFaction = useWorkspaceStore((state) => state.createFaction)
  const updateFaction = useWorkspaceStore((state) => state.updateFaction)
  const deleteFaction = useWorkspaceStore((state) => state.deleteFaction)

  const [selectedId, setSelectedId] = useState<string | null>(factions[0]?.id ?? null)
  const [pendingDelete, setPendingDelete] = useState<Faction | null>(null)

  const selected = factions.find((faction) => faction.id === selectedId) ?? null

  /** Rivalry is mutual, so setting it writes both sides. */
  function toggleRival(faction: Faction, rivalId: string) {
    const rival = factions.find((candidate) => candidate.id === rivalId)
    if (!rival) return

    const isRival = faction.rivalFactionIds.includes(rivalId)

    updateFaction(faction.id, {
      rivalFactionIds: isRival
        ? faction.rivalFactionIds.filter((id) => id !== rivalId)
        : [...faction.rivalFactionIds, rivalId],
    })
    updateFaction(rivalId, {
      rivalFactionIds: isRival
        ? rival.rivalFactionIds.filter((id) => id !== faction.id)
        : [...rival.rivalFactionIds, faction.id],
    })
  }

  return (
    <>
      <MasterDetail
        items={factions.map((faction) => ({
          id: faction.id,
          name: faction.name,
          meta: faction.kind || faction.goal,
        }))}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id || null)}
        onCreate={() => {
          const faction = createFaction(projectId, `Faction ${factions.length + 1}`)
          setSelectedId(faction.id)
        }}
        createLabel="Add faction"
        icon="user"
        emptyTitle="No factions yet"
        emptyDescription="Groups with a shared goal and the means to pursue it: a guild, a family, a government department. Rivalries between them generate most of the plot you will not have to invent."
        searchPlaceholder="Search factions"
        renderDetail={() => {
          if (!selected) return null
          const onChange = (changes: Partial<Faction>) => updateFaction(selected.id, changes)
          const others = factions.filter((faction) => faction.id !== selected.id)

          return (
            <Card>
              <FieldGrid>
                <TextField label="Name" value={selected.name} onChange={(name) => onChange({ name })} />
                <TextField
                  label="Kind"
                  hint="Guild, cult, ministry, crew."
                  value={selected.kind}
                  onChange={(kind) => onChange({ kind })}
                />
                <TextField
                  label="Goal"
                  hint="What they are actively trying to achieve, in the present tense."
                  value={selected.goal}
                  onChange={(goal) => onChange({ goal })}
                  multiline
                  rows={3}
                  wide
                />
                <TextField
                  label="Beliefs"
                  hint="What they would say about themselves, which need not be true."
                  value={selected.beliefs}
                  onChange={(beliefs) => onChange({ beliefs })}
                  multiline
                  rows={4}
                />
                <TextField
                  label="Structure"
                  hint="Who decides, who does the work, how someone joins or leaves."
                  value={selected.structure}
                  onChange={(structure) => onChange({ structure })}
                  multiline
                  rows={4}
                />

                <Field label="Based at">
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={selected.homeLocationId ?? ''}
                      onChange={(event) => onChange({ homeLocationId: event.target.value || null })}
                    >
                      <option value="">Nowhere in particular</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </Select>
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

              <fieldset className="mt-7 border-0 p-0">
                <legend className="mb-1 text-sm font-medium text-ink">Rivals</legend>
                <p className="mb-3 text-xs text-ink-muted">
                  Rivalry is mutual — setting it here sets it on the other faction too.
                </p>
                {others.length === 0 ? (
                  <p className="text-sm text-ink-faint">
                    Add another faction to record a rivalry between them.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {others.map((faction) => {
                      const isRival = selected.rivalFactionIds.includes(faction.id)
                      return (
                        <button
                          key={faction.id}
                          type="button"
                          onClick={() => toggleRival(selected, faction.id)}
                          aria-pressed={isRival}
                          /*
                           * The bare faction name also appears in the master
                           * list, so an unqualified label would give two
                           * different controls the same accessible name.
                           */
                          aria-label={`${isRival ? 'Remove' : 'Add'} rivalry with ${faction.name}`}
                          className={cn(
                            'rounded-pill border px-3 py-1 text-xs border-[length:var(--pf-border-width)]',
                            'transition-colors duration-[var(--pf-duration-fast)]',
                            isRival
                              ? 'border-transparent bg-danger text-danger-fg'
                              : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                          )}
                        >
                          {faction.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </fieldset>

              <div className="mt-6 flex border-t border-line pt-4">
                <Button
                  variant="danger"
                  icon="trash"
                  className="ml-auto"
                  onClick={() => setPendingDelete(selected)}
                >
                  Delete faction
                </Button>
              </div>
            </Card>
          )
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this faction?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed, and the rivalries other factions recorded against them will be cleared. Events that involved them keep their entry.`
            : ''
        }
        confirmLabel="Delete faction"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteFaction(pendingDelete.id)
            if (selectedId === pendingDelete.id) setSelectedId(null)
          }
          setPendingDelete(null)
        }}
      />
    </>
  )
}
