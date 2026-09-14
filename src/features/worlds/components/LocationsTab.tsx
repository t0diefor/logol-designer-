import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Input'
import { TagInput } from '@/components/ui/TagInput'
import { AIExpansionPanel } from '@/features/ai/components/AIExpansionPanel'
import { locationAdapter } from '@/features/ai/adapters/location-adapter'
import { expandLocation } from '@/features/ai/provider-registry'
import { useExpansion } from '@/features/ai/use-expansion'
import { FieldGrid, TextField } from '@/features/characters/components/sections/section-kit'
import { useLocationsForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Location } from '@/types/world'
import { MasterDetail } from './MasterDetail'

export function LocationsTab({ projectId }: { projectId: string }) {
  const locations = useLocationsForProject(projectId)
  const createLocation = useWorkspaceStore((state) => state.createLocation)
  const updateLocation = useWorkspaceStore((state) => state.updateLocation)
  const deleteLocation = useWorkspaceStore((state) => state.deleteLocation)

  const [selectedId, setSelectedId] = useState<string | null>(locations[0]?.id ?? null)
  const [pendingDelete, setPendingDelete] = useState<Location | null>(null)
  const [showAssist, setShowAssist] = useState(false)

  const selected = locations.find((location) => location.id === selectedId) ?? null
  const expansion = useExpansion(selected, expandLocation)

  const items = locations.map((location) => ({
    id: location.id,
    name: location.name,
    meta: location.kind || location.summary,
  }))

  return (
    <>
      <MasterDetail
        items={items}
        selectedId={selectedId}
        onSelect={(id) => {
          setSelectedId(id || null)
          setShowAssist(false)
          expansion.reset()
        }}
        onCreate={() => {
          const location = createLocation(projectId, `Location ${locations.length + 1}`)
          setSelectedId(location.id)
        }}
        createLabel="Add location"
        icon="globe"
        emptyTitle="No locations yet"
        emptyDescription="Places the story happens: a district, a border town, a ship. Each one gets a description an artist can draw from and an atmosphere a letterer can write to."
        searchPlaceholder="Search locations"
        renderDetail={() => {
          if (!selected) return null
          const onChange = (changes: Partial<Location>) => updateLocation(selected.id, changes)
          const parents = locations.filter((candidate) => candidate.id !== selected.id)

          return (
            <div className="flex flex-col gap-6">
              <Card>
                <FieldGrid>
                  <TextField
                    label="Name"
                    value={selected.name}
                    onChange={(name) => onChange({ name })}
                  />
                  <TextField
                    label="Kind of place"
                    hint="District, institution, wilderness, vessel."
                    value={selected.kind}
                    onChange={(kind) => onChange({ kind })}
                  />
                  <TextField
                    label="One-line summary"
                    hint="Short enough to drop into a script margin."
                    value={selected.summary}
                    onChange={(summary) => onChange({ summary })}
                    wide
                  />
                  <TextField
                    label="Description"
                    hint="Physical detail an artist can draw, rather than adjectives they cannot."
                    value={selected.description}
                    onChange={(description) => onChange({ description })}
                    multiline
                    rows={6}
                    wide
                  />
                  <TextField
                    label="Atmosphere"
                    hint="Sound and smell carry a place in a medium that has neither."
                    value={selected.atmosphere}
                    onChange={(atmosphere) => onChange({ atmosphere })}
                    multiline
                    rows={4}
                    wide
                  />

                  <Field
                    label="Sits inside"
                    hint="A district within a city, a room within a building."
                  >
                    {({ id, describedBy }) => (
                      <Select
                        id={id}
                        aria-describedby={describedBy}
                        value={selected.parentLocationId ?? ''}
                        onChange={(event) =>
                          onChange({ parentLocationId: event.target.value || null })
                        }
                      >
                        <option value="">Nothing — this is a top-level place</option>
                        {parents.map((parent) => (
                          <option key={parent.id} value={parent.id}>
                            {parent.name}
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

                <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
                  <Button
                    icon="sparkles"
                    onClick={() => setShowAssist((value) => !value)}
                  >
                    {showAssist ? 'Hide assist' : 'Assist with this place'}
                  </Button>
                  <Button
                    variant="danger"
                    icon="trash"
                    className="ml-auto"
                    onClick={() => setPendingDelete(selected)}
                  >
                    Delete location
                  </Button>
                </div>
              </Card>

              {showAssist ? (
                <AIExpansionPanel
                  entity={selected}
                  adapter={locationAdapter}
                  tool={expansion}
                  title={`Expand ${selected.name}`}
                  summary="Suggests a kind, summary, description and atmosphere for fields you have left empty."
                  reads="This location's name. Nothing else."
                  actionLabel="Suggest details"
                  onApply={(patch) => updateLocation(selected.id, patch)}
                />
              ) : null}
            </div>
          )
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this location?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" will be removed. Places inside it become top-level rather than being deleted, and factions or events that referenced it keep their entry with the link cleared.`
            : ''
        }
        confirmLabel="Delete location"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteLocation(pendingDelete.id)
            if (selectedId === pendingDelete.id) setSelectedId(null)
          }
          setPendingDelete(null)
        }}
      />
    </>
  )
}
