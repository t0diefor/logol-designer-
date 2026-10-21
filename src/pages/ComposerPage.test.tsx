import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { ComposerPage } from './ComposerPage'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useComposerHistory } from '@/features/composer/history'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'

const store = () => useWorkspaceStore.getState()

// No IndexedDB in jsdom, so asset URLs never resolve. Placements render as a
// marked gap, which is the behaviour under test elsewhere.
vi.mock('@/features/composer/use-image-urls', () => ({
  useProjectAssetUrls: () => new Map<string, string>(),
}))

function seedPage() {
  useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  useComposerHistory.setState({ past: {}, future: {} })

  const project = store().createProject({ title: 'The Lantern Wars', logline: '', genre: '' })
  const comic = store().createComic(project.id, 'Comic')
  const episode = store().createEpisode(comic.id, 'Episode one')
  const page = store().createPage(episode.id)
  return { project, episode, page }
}

const livePage = (id: string) => store().pages[id]!

describe('ComposerPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
    useComposerHistory.setState({ past: {}, future: {} })
  })

  it('asks for a project first', () => {
    renderWithProviders(<ComposerPage />)
    expect(screen.getByRole('heading', { name: 'No project selected' })).toBeInTheDocument()
  })

  it('offers to create the first page, and makes the comic chain in one step', async () => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
    store().createProject({ title: 'P', logline: '', genre: '' })

    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Create the first page' }))

    // One click, not three: comic, episode and page.
    expect(Object.keys(store().comics)).toHaveLength(1)
    expect(Object.keys(store().episodes)).toHaveLength(1)
    expect(Object.keys(store().pages)).toHaveLength(1)
  })

  it('adds a panel to the page document', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    expect(livePage(page.id).panels).toHaveLength(1)
  })

  it('lays out a template, replacing what was there', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    await userEvent.selectOptions(screen.getByLabelText('Apply a page template'), 'grid-6')

    // A template describes the whole page, so it replaces rather than appends.
    expect(livePage(page.id).panels).toHaveLength(6)
  })

  it('keeps every templated panel inside the page', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.selectOptions(screen.getByLabelText('Apply a page template'), 'grid-9')

    const live = livePage(page.id)
    for (const panel of live.panels) {
      expect(panel.rect.x).toBeGreaterThanOrEqual(0)
      expect(panel.rect.x + panel.rect.width).toBeLessThanOrEqual(live.size.width)
    }
  })

  it('undoes an added panel, and redoes it', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    expect(livePage(page.id).panels).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(livePage(page.id).panels).toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: 'Redo' }))
    expect(livePage(page.id).panels).toHaveLength(1)
  })

  it('disables undo until something has happened', () => {
    seedPage()
    renderWithProviders(<ComposerPage />)
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })

  it('selects a panel and shows its inspector', async () => {
    seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))

    expect(screen.getByRole('heading', { name: 'Panel 1' })).toBeInTheDocument()
  })

  it('adds a speech balloon to the selected panel', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Speech' }))

    expect(livePage(page.id).panels[0]!.balloons).toHaveLength(1)
  })

  it('edits balloon text straight into the document', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Caption' }))

    await userEvent.type(screen.getByLabelText('Text 1 content'), 'Four hundred years.')
    expect(livePage(page.id).panels[0]!.balloons[0]!.text).toBe('Four hundred years.')
  })

  it('reorders a panel in the stack', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))

    const second = livePage(page.id).panels[1]!
    await userEvent.click(screen.getByRole('button', { name: 'Send to back' }))

    expect(livePage(page.id).panels.find((p) => p.id === second.id)!.z).toBe(0)
  })

  it('duplicates the selected panel', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Duplicate panel' }))

    expect(livePage(page.id).panels).toHaveLength(2)
  })

  it('deletes the selected panel and clears the inspector', async () => {
    const { page } = seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete panel' }))

    expect(livePage(page.id).panels).toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'Panel 1' })).not.toBeInTheDocument()
  })

  it('renders each panel as a labelled, focusable control', async () => {
    seedPage()
    renderWithProviders(<ComposerPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Add panel' }))

    // The canvas must not be mouse-only.
    const canvas = screen.getByRole('application')
    expect(within(canvas).getByRole('button', { name: /^Panel 1/ })).toBeInTheDocument()
  })

  it('adds a page and shows it in the rail', async () => {
    const { episode } = seedPage()
    renderWithProviders(<ComposerPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Add page' }))
    expect(
      Object.values(store().pages).filter((p) => p.episodeId === episode.id),
    ).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
  })

  it('states that pages stay editable rather than being flattened', () => {
    seedPage()
    renderWithProviders(<ComposerPage />)
    expect(screen.getByText(/stay editable/i)).toBeInTheDocument()
  })
})
