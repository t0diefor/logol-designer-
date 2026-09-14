import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { WorldPage } from './WorldPage'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'

const store = () => useWorkspaceStore.getState()

function seedProject() {
  useWorkspaceStore.setState({
    ...EMPTY_WORKSPACE,
    currentProjectId: null,
    currentComicId: null,
  })
  return store().createProject({ title: 'The Lantern Wars', logline: '', genre: '' }).id
}

describe('WorldPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  it('asks for a project first', () => {
    renderWithProviders(<WorldPage />)
    expect(screen.getByRole('heading', { name: 'No project selected' })).toBeInTheDocument()
  })

  it('opens on locations with an onboarding empty state', () => {
    seedProject()
    renderWithProviders(<WorldPage />)
    expect(screen.getByRole('heading', { name: 'No locations yet' })).toBeInTheDocument()
  })

  it('renders locations and edits write through to the store', async () => {
    const projectId = seedProject()
    const location = store().createLocation(projectId, 'Vell Harbour')

    renderWithProviders(<WorldPage />)

    await userEvent.type(screen.getByLabelText('Kind of place'), 'District')
    expect(store().locations[location.id]!.kind).toBe('District')
  })

  it('orders the timeline by position, not by the date label', async () => {
    const projectId = seedProject()
    // Labels that would sort wrong alphabetically or as dates.
    store().createWorldEvent(projectId, 'The founding')
    store().createWorldEvent(projectId, 'The fire')

    const first = Object.values(store().worldEvents).find((e) => e.title === 'The founding')!
    store().updateWorldEvent(first.id, { whenLabel: 'Third Age, year 412' })

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Timeline/ }))

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]!).getByText('The founding')).toBeInTheDocument()
    expect(within(items[1]!).getByText('The fire')).toBeInTheDocument()
  })

  it('reorders the timeline from the UI', async () => {
    const projectId = seedProject()
    store().createWorldEvent(projectId, 'The founding')
    store().createWorldEvent(projectId, 'The fire')

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Timeline/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Move The fire earlier' }))

    const items = screen.getAllByRole('listitem')
    expect(within(items[0]!).getByText('The fire')).toBeInTheDocument()
  })

  it('sets a rivalry on both factions at once', async () => {
    const projectId = seedProject()
    const guild = store().createFaction(projectId, 'The Guild')
    const ministry = store().createFaction(projectId, 'The Ministry')

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Factions/ }))

    // The Guild sorts first, so it is the one selected by default.
    await userEvent.click(
      screen.getByRole('button', { name: 'Add rivalry with The Ministry' }),
    )

    expect(store().factions[guild.id]!.rivalFactionIds).toContain(ministry.id)
    expect(store().factions[ministry.id]!.rivalFactionIds).toContain(guild.id)
  })

  it('renders map nodes as focusable controls that move with the keyboard', async () => {
    const projectId = seedProject()
    const location = store().createLocation(projectId, 'Vell Harbour')
    const startX = store().locations[location.id]!.mapX

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Map/ }))

    const node = screen.getByRole('button', { name: /Vell Harbour.*arrow keys/i })
    node.focus()
    await userEvent.keyboard('{ArrowRight}')

    // Mouse-only dragging would make the map unusable without a pointer.
    expect(store().locations[location.id]!.mapX).toBeGreaterThan(startX)
  })

  it('explains the graph is empty rather than drawing nothing', async () => {
    seedProject()
    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Graph/ }))
    expect(screen.getByRole('heading', { name: 'Nothing to connect yet' })).toBeInTheDocument()
  })

  it('draws a node per entity and links recorded connections', async () => {
    const projectId = seedProject()
    const guild = store().createFaction(projectId, 'The Guild')
    const place = store().createLocation(projectId, 'Vell Harbour')
    store().updateFaction(guild.id, { homeLocationId: place.id })

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Graph/ }))

    const graph = screen.getByRole('img', { name: /Relationship graph/ })
    expect(graph).toHaveAccessibleName(/2 nodes and 1 connections/)
  })

  it('isolates a node’s connections when selected', async () => {
    const projectId = seedProject()
    const guild = store().createFaction(projectId, 'The Guild')
    const place = store().createLocation(projectId, 'Vell Harbour')
    store().updateFaction(guild.id, { homeLocationId: place.id })

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Graph/ }))
    await userEvent.click(screen.getByRole('button', { name: 'The Guild, faction' }))

    expect(screen.getByText(/Showing connections for/)).toBeInTheDocument()
    expect(screen.getByText(/based at · Vell Harbour/)).toBeInTheDocument()
  })

  it('offers world assist only after a location exists, and discloses mock mode', async () => {
    const projectId = seedProject()
    store().createLocation(projectId, 'Vell Harbour')

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('button', { name: /Assist with this place/ }))

    expect(screen.getByRole('heading', { name: /Expand Vell Harbour/ })).toBeInTheDocument()
    expect(screen.getByText('Mock mode')).toBeInTheDocument()
    expect(screen.getByText(/CA\$0\.00/)).toBeInTheDocument()
  })

  it('does not write world suggestions without an explicit accept', async () => {
    const projectId = seedProject()
    const location = store().createLocation(projectId, 'Vell Harbour')

    renderWithProviders(<WorldPage />)
    await userEvent.click(screen.getByRole('button', { name: /Assist with this place/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Suggest details' }))
    await screen.findByText(/suggestions\./i)

    expect(store().locations[location.id]!.description).toBe('')

    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }))
    await userEvent.click(screen.getByRole('button', { name: /Apply \d+ accepted/ }))

    expect(store().locations[location.id]!.description.length).toBeGreaterThan(0)
  })
})
