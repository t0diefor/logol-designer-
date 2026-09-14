import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'
import { IconButton } from './IconButton'

describe('Button', () => {
  it('calls onClick when activated', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Create</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is reachable and activatable by keyboard', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Create</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Create' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('blocks interaction and reports busy while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Saving' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Plain</Button>)
    expect(screen.getByRole('button', { name: 'Plain' })).toHaveAttribute('type', 'button')
  })
})

describe('IconButton', () => {
  it('exposes its label as the accessible name', () => {
    render(<IconButton icon="trash" label="Delete project" />)
    expect(screen.getByRole('button', { name: 'Delete project' })).toBeInTheDocument()
  })
})
