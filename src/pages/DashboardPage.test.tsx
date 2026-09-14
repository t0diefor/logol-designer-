import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { DashboardPage } from './DashboardPage'
import { useWorkspaceStore } from '@/stores/workspace-store'

/**
 * Regression coverage for the render loop that shipped in the first cut of
 * this page.
 *
 * A Zustand selector that built a new array on every call returned a fresh
 * reference each render, so React re-rendered forever and the route died with
 * "Maximum update depth exceeded". Store tests could not catch it because they
 * call `getState()` and never mount a component; only a render test does.
 *
 * If a sorted or filtered list is ever selected inline again, these tests fail.
 */
describe('DashboardPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      projects: {},
      comics: {},
      currentProjectId: null,
      currentComicId: null,
    })
  })

  it('renders the onboarding empty state when there are no projects', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByRole('heading', { name: 'Welcome to PanelForge' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create a project' })).toBeInTheDocument()
  })

  it('renders without looping once projects exist', () => {
    const store = useWorkspaceStore.getState()
    store.createProject({ title: 'The Lantern Wars', logline: 'A lamplighter.', genre: 'fantasy' })
    store.createProject({ title: 'Tidewrack', logline: 'Salvagers.', genre: 'horror' })

    renderWithProviders(<DashboardPage />)

    // The current project's title becomes the page heading.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tidewrack')
  })

  it('renders the project picker when several projects exist but none is current', () => {
    const store = useWorkspaceStore.getState()
    store.createProject({ title: 'One', logline: '', genre: '' })
    store.createProject({ title: 'Two', logline: '', genre: '' })
    useWorkspaceStore.setState({ currentProjectId: null })

    renderWithProviders(<DashboardPage />)

    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'One' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Two' })).toBeInTheDocument()
  })

  it('applies the active theme to the document root', () => {
    renderWithProviders(<DashboardPage />)
    expect(document.documentElement.dataset.theme).toBe('dark-fantasy')
    expect(document.documentElement.style.getPropertyValue('--pf-bg')).toBe('#0B0A0F')
  })
})
