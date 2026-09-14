import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field } from '@/components/ui/Field'
import { Select } from '@/components/ui/Input'
import { TagInput } from '@/components/ui/TagInput'
import { FieldGrid, TextField } from '@/features/characters/components/sections/section-kit'
import { useCharactersForProject, useWorldObjectsForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { WorldObject } from '@/types/world'
import { MasterDetail } from './MasterDetail'

export function ObjectsTab({ projectId }: { projectId: string }) {
  const objects = useWorldObjectsForProject(projectId)
  const characters = useCharactersForProject(projectId)
  const createWorldObject = useWorkspaceStore((state) => state.createWorldObject)
  const updateWorldObject = useWorkspaceStore((state) => state.updateWorldObject)
  const deleteWorldObject = useWorkspaceStore((state) => state.deleteWorldObject)

  const [selectedId, setSelectedId] = useState<string | null>(objects[0]?.id ?? null)
  const [pendingDelete, setPendingDelete] = useState<WorldObject | null>(null)

  const selected = objects.find((object) => object.id === selectedId) ?? null

  return (
    <>
      <MasterDetail
        items={objects.map((object) => ({
          id: object.id,
          name: object.name,
          meta: characters.find((c) => c.id === object.holderCharacterId)?.name,
        }))}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id || null)}
        onCreate={() => {
          const object = createWorldObject(projectId, `Object ${objects.length + 1}`)
          setSelectedId(object.id)
        }}
        createLabel="Add object"
        icon="star"
        emptyTitle="No significant objects yet"
        emptyDescription="A weapon, a relic, a letter nobody was meant to read. Objects that move between hands tend to carry plot with them, so it is worth tracking who has one."
        searchPlaceholder="Search objects"
        renderDetail={() => {
          if (!selected) return null
          const onChange = (changes: Partial<WorldObject>) =>
            updateWorldObject(selected.id, changes)

          return (
            <Card>
              <FieldGrid>
                <TextField label="Name" value={selected.name} onChange={(name) => onChange({ name })} />

                <Field label="Currently held by">
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={selected.holderCharacterId ?? ''}
                      onChange={(event) =>
                        onChange({ holderCharacterId: event.target.value || null })
                      }
                    >
                      <option value="">Nobody, or not decided</option>
                      {characters.map((character) => (
                        <option key={character.id} value={character.id}>
                          {character.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                <TextField
                  label="Description"
                  hint="What it looks like, so it is drawn the same way each time."
                  value={selected.description}
                  onChange={(description) => onChange({ description })}
                  multiline
                  rows={4}
                  wide
                />
                <TextField
                  label="Why it matters"
                  hint="What changes because this exists. An object with no consequence is set dressing."
                  value={selected.significance}
                  onChange={(significance) => onChange({ significance })}
                  multiline
                  rows={4}
                  wide
                />

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
                  Delete object
                </Button>
              </div>
            </Card>
          )
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this object?"
        description={pendingDelete ? `"${pendingDelete.name}" will be removed. This cannot be undone.` : ''}
        confirmLabel="Delete object"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteWorldObject(pendingDelete.id)
            if (selectedId === pendingDelete.id) setSelectedId(null)
          }
          setPendingDelete(null)
        }}
      />
    </>
  )
}
