import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'

export interface CreateCharacterDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (name: string, role: string) => void
}

/**
 * New-character form.
 *
 * Asks for a name and nothing else that is required. Everything on a character
 * sheet can be filled in later, and a long form standing between someone and
 * their first character is a good way to lose them.
 */
export function CreateCharacterDialog({ open, onClose, onCreate }: CreateCharacterDialogProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [error, setError] = useState<string | null>(null)

  function close() {
    setName('')
    setRole('')
    setError(null)
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError('A character needs a name')
      return
    }
    onCreate(trimmed, role.trim())
    setName('')
    setRole('')
    setError(null)
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="New character"
      description="Only the name is required. The rest of the sheet can be filled in as you go."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" required error={error ?? undefined}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError(null)
              }}
              placeholder="Mira Halloway"
              autoFocus
            />
          )}
        </Field>

        <Field label="Role" hint="How they function in the story: protagonist, rival, mentor.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={role}
              onChange={(event) => setRole(event.target.value)}
              placeholder="Protagonist"
            />
          )}
        </Field>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="plus">
            Create character
          </Button>
        </div>
      </form>
    </Modal>
  )
}
