import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render } from '@testing-library/react'
import { ThemeProvider } from '@/theme/theme-provider'
import { CharacterDetailPage } from './CharacterDetailPage'
import { useWorkspaceStore } from '@/stores/workspace-store'

/** Renders the detail page at a real route so useParams resolves. */
function renderDetail(characterId: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[`/characters/${characterId}`]}>
        <Routes>
          <Route path="/characters/:characterId" element={<CharacterDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

function seedCharacter(name = 'Mira Halloway') {
  useWorkspaceStore.setState({
    projects: {},
    comics: {},
    characters: {},
    assets: {},
    currentProjectId: null,
    currentComicId: null,
  })
  const project = useWorkspaceStore.getState().createProject({ title: 'P', logline: '', genre: '' })
  return useWorkspaceStore.getState().createCharacter(project.id, name)
}

describe('CharacterDetailPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ characters: {} })
  })

  it('reports a missing character instead of rendering a blank sheet', () => {
    seedCharacter()
    renderDetail('does-not-exist')
    expect(screen.getByRole('heading', { name: 'Character not found' })).toBeInTheDocument()
  })

  it('writes edits straight to the store', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    const roleField = screen.getByLabelText('Role')
    await userEvent.type(roleField, 'Protagonist')

    expect(useWorkspaceStore.getState().characters[character.id]!.role).toBe('Protagonist')
  })

  it('moves between tabs with the arrow keys', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    const tablist = screen.getByRole('tablist')
    const identityTab = within(tablist).getByRole('tab', { name: /Identity/ })

    identityTab.focus()
    await userEvent.keyboard('{ArrowRight}')

    expect(within(tablist).getByRole('tab', { name: /Appearance/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('keeps only the selected tab in the tab order', () => {
    const character = seedCharacter()
    renderDetail(character.id)

    const tabs = within(screen.getByRole('tablist')).getAllByRole('tab')
    const reachable = tabs.filter((tab) => tab.getAttribute('tabindex') === '0')
    expect(reachable).toHaveLength(1)
  })

  it('shows the consistency checklist alongside the editor', () => {
    const character = seedCharacter()
    renderDetail(character.id)
    expect(screen.getByRole('heading', { name: 'Consistency checklist' })).toBeInTheDocument()
  })

  it('states plainly that the preview plate is generated, not drawn', () => {
    const character = seedCharacter()
    renderDetail(character.id)
    expect(screen.getByText(/Generated plate from the palette/i)).toBeInTheDocument()
  })

  it('discloses what the AI tool reads and changes before it runs', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    await userEvent.click(screen.getByRole('tab', { name: /Assist/ }))

    expect(screen.getByRole('heading', { name: 'Expand this character' })).toBeInTheDocument()
    expect(screen.getByText('Mock mode')).toBeInTheDocument()
    expect(screen.getByText(/only proposes values for/i)).toBeInTheDocument()
    expect(screen.getByText(/CA\$0\.00/)).toBeInTheDocument()
  })

  it('requires an explicit accept before any suggestion reaches the character', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    await userEvent.click(screen.getByRole('tab', { name: /Assist/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Suggest content' }))

    // Suggestions arrive, but the record is untouched while they sit unreviewed.
    expect(await screen.findByText(/suggestions\./i)).toBeInTheDocument()
    expect(useWorkspaceStore.getState().characters[character.id]!.goals).toBe('')

    const apply = screen.getByRole('button', { name: /Apply 0 accepted/ })
    expect(apply).toBeDisabled()
  })

  it('holds back a suggestion whose field was edited during review', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    await userEvent.click(screen.getByRole('tab', { name: /Assist/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Suggest content' }))
    await screen.findByText(/suggestions\./i)
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }))

    const before = screen.getByRole('button', { name: /Apply \d+ accepted/ }).textContent
    const acceptedBefore = Number(/\d+/.exec(before ?? '0')?.[0] ?? 0)
    expect(acceptedBefore).toBeGreaterThan(0)

    // Simulate the user editing Goals in another tab while the panel is open.
    useWorkspaceStore.getState().updateCharacter(character.id, {
      goals: 'Something I wrote myself, after seeing the suggestion',
    })

    // The panel must notice immediately and hold that one back.
    expect(await screen.findByText(/Changed while you were reviewing/)).toBeInTheDocument()
    expect(screen.getByText(/held back because you edited the field/)).toBeInTheDocument()

    const after = screen.getByRole('button', { name: /Apply \d+ accepted/ }).textContent
    expect(Number(/\d+/.exec(after ?? '0')?.[0] ?? 0)).toBe(acceptedBefore - 1)

    await userEvent.click(screen.getByRole('button', { name: /Apply \d+ accepted/ }))

    // The user's own writing survives.
    expect(useWorkspaceStore.getState().characters[character.id]!.goals).toBe(
      'Something I wrote myself, after seeing the suggestion',
    )
  })

  it('lets the user deliberately override their own edit', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    await userEvent.click(screen.getByRole('tab', { name: /Assist/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Suggest content' }))
    await screen.findByText(/suggestions\./i)

    useWorkspaceStore.getState().updateCharacter(character.id, { goals: 'My own text' })
    await screen.findByText(/Changed while you were reviewing/)

    // The panel shows what would be lost before offering to replace it.
    expect(screen.getByText('My own text')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Replace it with the suggestion/ }))
    await userEvent.click(screen.getByRole('button', { name: /Apply \d+ accepted/ }))

    const goals = useWorkspaceStore.getState().characters[character.id]!.goals
    expect(goals).not.toBe('My own text')
    expect(goals.length).toBeGreaterThan(0)
  })

  it('applies accepted suggestions and saves a restore point first', async () => {
    const character = seedCharacter()
    renderDetail(character.id)

    await userEvent.click(screen.getByRole('tab', { name: /Assist/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Suggest content' }))
    await screen.findByText(/suggestions\./i)

    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }))
    await userEvent.click(screen.getByRole('button', { name: /Apply \d+ accepted/ }))

    const updated = useWorkspaceStore.getState().characters[character.id]!
    expect(updated.goals.length).toBeGreaterThan(0)
    expect(updated.versions).toHaveLength(1)
    expect(updated.versions[0]!.label).toBe('Before AI suggestions')
  })
})
