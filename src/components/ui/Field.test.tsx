import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Field } from './Field'
import { Input } from './Input'

/**
 * These assertions are about accessibility wiring, not appearance.
 * They fail if a control ever loses its label or its error association --
 * which is the kind of regression that is invisible in a screenshot.
 */
describe('Field', () => {
  it('associates the label with the control', () => {
    render(
      <Field label="Title">
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>,
    )

    // Queryable by label text means the htmlFor/id pairing is correct.
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })

  it('links hint text to the control via aria-describedby', () => {
    render(
      <Field label="Logline" hint="One sentence.">
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>,
    )

    expect(screen.getByLabelText('Logline')).toHaveAccessibleDescription('One sentence.')
  })

  it('marks the control invalid and announces the error', () => {
    render(
      <Field label="Title" error="A project needs a title">
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>,
    )

    expect(screen.getByLabelText('Title')).toBeInvalid()
    expect(screen.getByRole('alert')).toHaveTextContent('A project needs a title')
  })

  it('generates unique ids so two fields on one page do not collide', () => {
    render(
      <>
        <Field label="First">
          {({ id }) => <Input id={id} />}
        </Field>
        <Field label="Second">
          {({ id }) => <Input id={id} />}
        </Field>
      </>,
    )

    expect(screen.getByLabelText('First').id).not.toBe(screen.getByLabelText('Second').id)
  })
})
