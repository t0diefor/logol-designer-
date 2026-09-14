import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { projectDraftSchema, type ProjectDraft } from '@/types/project'

export interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (draft: ProjectDraft) => void
}

const EMPTY: ProjectDraft = { title: '', logline: '', genre: '' }

/**
 * New-project form.
 *
 * Validated with the same Zod schema the store and any future API use, so the
 * rules cannot drift between the form and the data layer. Errors are mapped
 * back onto individual fields rather than shown as one lump.
 */
export function CreateProjectDialog({ open, onClose, onCreate }: CreateProjectDialogProps) {
  const [draft, setDraft] = useState<ProjectDraft>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectDraft, string>>>({})

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const result = projectDraftSchema.safeParse(draft)
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProjectDraft, string>> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ProjectDraft | undefined
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    onCreate(result.data)
    setDraft(EMPTY)
    setErrors({})
  }

  function handleClose() {
    setDraft(EMPTY)
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New project"
      description="A project holds one story world: its comics, cast, locations and assets."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Title" required error={errors.title}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="The Lantern Wars"
              autoFocus
            />
          )}
        </Field>

        <Field
          label="Logline"
          hint="One sentence describing the story. You can change this later."
          error={errors.logline}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              rows={3}
              value={draft.logline}
              onChange={(event) => setDraft({ ...draft, logline: event.target.value })}
              placeholder="A lamplighter discovers the city's lights are keeping something asleep."
            />
          )}
        </Field>

        <Field label="Genre" error={errors.genre}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={draft.genre}
              onChange={(event) => setDraft({ ...draft, genre: event.target.value })}
              placeholder="Gothic fantasy"
            />
          )}
        </Field>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="plus">
            Create project
          </Button>
        </div>
      </form>
    </Modal>
  )
}
