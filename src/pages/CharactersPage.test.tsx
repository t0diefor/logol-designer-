import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { CharactersPage } from './CharactersPage'
import { useWorkspaceStore } from '@/stores/workspace-store'

function reset() {
  useWorkspaceStore.setState({
    projects: {},
    comics: {},
    characters: {},
    assets: {},
    currentProjectId: null,
    currentComicId: null,
  })
}

/** Creates a project, selects it, and returns its id. */
function seedProject() {
  const project = useWorkspaceStore.getState().createProject({
    title: 'The Lantern Wars',
    logline: '',
    genre: '',
  })
  return project.id
}

describe('CharactersPage', () => {
  beforeEach(reset)

  it('asks for a project before showing a cast', () => {
    renderWithProviders(<CharactersPage />)
    expect(screen.getByRole('heading', { name: 'No project selected' })).toBeInTheDocument()
  })

  it('shows the onboarding empty state for a project with no cast', () => {
    seedProject()
    renderWithProviders(<CharactersPage />)
    expect(screen.getByRole('heading', { name: 'No characters yet' })).toBeInTheDocument()
  })

  it('renders characters without looping once they exist', () => {
    const projectId = seedProject()
    useWorkspaceStore.getState().createCharacter(projectId, 'Mira Halloway')
    useWorkspaceStore.getState().createCharacter(projectId, 'Elias Warde')

    renderWithProviders(<CharactersPage />)

    expect(screen.getByRole('link', { name: 'Mira Halloway' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Elias Warde' })).toBeInTheDocument()
  })

  it('filters by search across more than just the name', async () => {
    const projectId = seedProject()
    const mira = useWorkspaceStore.getState().createCharacter(projectId, 'Mira Halloway')
    useWorkspaceStore.getState().createCharacter(projectId, 'Elias Warde')
    useWorkspaceStore.getState().updateCharacter(mira.id, { backstory: 'A lamplighter by trade' })

    renderWithProviders(<CharactersPage />)

    await userEvent.type(screen.getByLabelText('Search characters'), 'lamplighter')

    expect(screen.getByRole('link', { name: 'Mira Halloway' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Elias Warde' })).not.toBeInTheDocument()
  })

  it('explains an empty search result rather than showing a blank grid', async () => {
    const projectId = seedProject()
    useWorkspaceStore.getState().createCharacter(projectId, 'Mira Halloway')

    renderWithProviders(<CharactersPage />)
    await userEvent.type(screen.getByLabelText('Search characters'), 'zzzzz')

    expect(screen.getByRole('heading', { name: 'No matching characters' })).toBeInTheDocument()
  })

  it('only shows characters from the selected project', () => {
    const projectId = seedProject()
    useWorkspaceStore.getState().createCharacter(projectId, 'Mira Halloway')

    const other = useWorkspaceStore.getState().createProject({
      title: 'Other',
      logline: '',
      genre: '',
    })
    useWorkspaceStore.getState().createCharacter(other.id, 'Someone Else')
    // createProject switches the current project, so put it back.
    useWorkspaceStore.getState().setCurrentProject(projectId)

    renderWithProviders(<CharactersPage />)

    expect(screen.getByRole('link', { name: 'Mira Halloway' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Someone Else' })).not.toBeInTheDocument()
  })
})
