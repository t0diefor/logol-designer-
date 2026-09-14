import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Input'
import { newId } from '@/lib/id'
import type { Character, Relationship } from '@/types/character'
import { ListHeader, TextField } from './section-kit'

export function RelationshipsSection({
  character,
  cast,
  onChange,
}: {
  character: Character
  /** Everyone else in the project, for the link picker. */
  cast: Character[]
  onChange: (changes: Partial<Character>) => void
}) {
  const { relationships } = character
  const others = cast.filter((member) => member.id !== character.id)

  function addRelationship() {
    const relationship: Relationship = {
      id: newId(),
      targetCharacterId: null,
      targetName: '',
      kind: '',
      description: '',
    }
    onChange({ relationships: [...relationships, relationship] })
  }

  function update(id: string, changes: Partial<Relationship>) {
    onChange({
      relationships: relationships.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    })
  }

  return (
    <>
      <ListHeader
        title="Relationships"
        description="Link to another character in this project, or just name someone who does not have a sheet yet."
        action={
          <Button icon="plus" onClick={addRelationship} disabled={relationships.length >= 50}>
            Add relationship
          </Button>
        }
      />

      {relationships.length === 0 ? (
        <EmptyState
          icon="user"
          title="No relationships recorded"
          description="Who they owe, who they avoid, who they would lie for. Relationships are where most scene conflict comes from."
          action={
            <Button variant="primary" icon="plus" onClick={addRelationship}>
              Add the first relationship
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {relationships.map((relationship) => (
            <li
              key={relationship.id}
              className="rounded-lg border border-line bg-surface p-4 border-[length:var(--pf-border-width)]"
            >
              <div className="mb-3 flex justify-end">
                <IconButton
                  icon="trash"
                  label="Delete this relationship"
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    onChange({
                      relationships: relationships.filter((item) => item.id !== relationship.id),
                    })
                  }
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Who"
                  hint={
                    others.length === 0
                      ? 'No other characters in this project yet, so type a name instead.'
                      : 'Pick someone with a sheet, or choose "Someone else" to type a name.'
                  }
                >
                  {({ id, describedBy }) => (
                    <Select
                      id={id}
                      aria-describedby={describedBy}
                      value={relationship.targetCharacterId ?? ''}
                      onChange={(event) =>
                        update(relationship.id, {
                          targetCharacterId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">Someone else (type a name)</option>
                      {others.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>

                {relationship.targetCharacterId === null ? (
                  <TextField
                    label="Their name"
                    value={relationship.targetName}
                    onChange={(targetName) => update(relationship.id, { targetName })}
                    placeholder="Elias Warde"
                  />
                ) : (
                  <TextField
                    label="Relationship"
                    hint="Sister, rival, former mentor."
                    value={relationship.kind}
                    onChange={(kind) => update(relationship.id, { kind })}
                    placeholder="Former mentor"
                  />
                )}

                {relationship.targetCharacterId === null ? (
                  <TextField
                    label="Relationship"
                    hint="Sister, rival, former mentor."
                    value={relationship.kind}
                    onChange={(kind) => update(relationship.id, { kind })}
                    placeholder="Former mentor"
                  />
                ) : null}

                <TextField
                  label="What is between them"
                  value={relationship.description}
                  onChange={(description) => update(relationship.id, { description })}
                  placeholder="He taught her the trade, then testified against her. Neither has said so out loud."
                  multiline
                  rows={3}
                  wide
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
