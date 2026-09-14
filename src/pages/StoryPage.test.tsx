import { beforeEach, describe, expect, it } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { StoryPage } from './StoryPage'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'

const store = () => useWorkspaceStore.getState()

function seedProject() {
  useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  return store().createProject({ title: 'The Lantern Wars', logline: '', genre: '' }).id
}

describe('StoryPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  it('asks for a project first', () => {
    renderWithProviders(<StoryPage />)
    expect(screen.getByRole('heading', { name: 'No project selected' })).toBeInTheDocument()
  })

  it('offers to start a story when the project has none', () => {
    seedProject()
    renderWithProviders(<StoryPage />)
    expect(screen.getByRole('heading', { name: 'No story yet' })).toBeInTheDocument()
  })

  it('edits story fields straight into the store', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')

    renderWithProviders(<StoryPage />)
    await userEvent.type(screen.getByLabelText('Logline'), 'A lamplighter finds out.')

    expect(store().stories[story.id]!.logline).toBe('A lamplighter finds out.')
  })

  it('counts words across the premise, outline and every scene', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')
    store().updateStory(story.id, { premise: 'one two three' })
    const scene = store().createScene(story.id, 'A')
    store().updateScene(scene.id, { summary: 'four five' })

    renderWithProviders(<StoryPage />)

    const totals = screen.getByRole('heading', { name: 'Story totals' }).parentElement!
    expect(within(totals).getByText('5')).toBeInTheDocument()
  })

  it('reorders scenes from the list', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')
    store().createScene(story.id, 'First scene')
    const second = store().createScene(story.id, 'Second scene')

    renderWithProviders(<StoryPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Scenes/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Move scene 2 up' }))

    expect(store().scenes[second.id]!.index).toBe(0)
  })

  it('flags beats that name no change', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')
    const scene = store().createScene(story.id, 'A')
    store().addBeat(scene.id, 'She arrives')

    renderWithProviders(<StoryPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Scenes/ }))
    await userEvent.click(screen.getByRole('button', { name: /1\. A/ }))

    expect(screen.getByText(/1 beat with no change named/)).toBeInTheDocument()
  })

  it('turns pasted notes into beats without rewriting them', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')
    const scene = store().createScene(story.id, 'A')

    renderWithProviders(<StoryPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Scenes/ }))
    await userEvent.click(screen.getByRole('button', { name: /1\. A/ }))

    const notes = screen.getByLabelText('Rough notes')
    await userEvent.type(notes, 'She arrives{Enter}He lies')
    await userEvent.click(screen.getByRole('button', { name: /Add 2 beats/ }))

    // Verbatim: this is a structural split, not a generated rewrite.
    expect(store().scenes[scene.id]!.beats.map((b) => b.summary)).toEqual([
      'She arrives',
      'He lies',
    ])
  })

  describe('rewriting', () => {
    async function openRewrite(text: string) {
      const projectId = seedProject()
      const story = store().createStory(projectId, 'Episode one')
      const scene = store().createScene(story.id, 'A')
      store().updateScene(scene.id, { summary: text })

      renderWithProviders(<StoryPage />)
      await userEvent.click(screen.getByRole('tab', { name: /Scenes/ }))
      await userEvent.click(screen.getByRole('button', { name: /1\. A/ }))
      await userEvent.click(screen.getByRole('button', { name: 'Rewrite summary' }))
      return scene.id
    }

    it('disables tools that would need a language model, and says why', async () => {
      await openRewrite('She was very quite certainly afraid.')

      const tone = screen.getByRole('button', { name: /Change emotional tone/ })
      expect(tone).toBeDisabled()
      expect(within(tone).getByText('Needs a model')).toBeInTheDocument()
      expect(screen.getAllByText(/Needs a language model/).length).toBeGreaterThan(0)
    })

    it('shows a word-level diff before anything is applied', async () => {
      const sceneId = await openRewrite('She was very quite certainly afraid.')

      await userEvent.click(screen.getByRole('button', { name: /Tighten/ }))
      expect(await screen.findByText('Proposed change')).toBeInTheDocument()

      // The removed words are struck through, not silently gone.
      const removed = screen.getAllByText(/very|quite|certainly/)
      expect(removed.length).toBeGreaterThan(0)

      // And the scene is untouched until Apply.
      expect(store().scenes[sceneId]!.summary).toBe('She was very quite certainly afraid.')
    })

    it('applies only when the user asks, and keeps their edit', async () => {
      const sceneId = await openRewrite('She was very afraid.')

      await userEvent.click(screen.getByRole('button', { name: /Tighten/ }))
      await screen.findByText('Proposed change')
      await userEvent.click(screen.getByRole('button', { name: 'Apply this rewrite' }))

      expect(store().scenes[sceneId]!.summary).toBe('She was afraid.')
    })

    it('leaves the text alone when the rule finds nothing to change', async () => {
      const sceneId = await openRewrite('She said nothing.')

      await userEvent.click(screen.getByRole('button', { name: /Tighten/ }))
      expect(await screen.findByText(/found nothing to change/)).toBeInTheDocument()
      expect(store().scenes[sceneId]!.summary).toBe('She said nothing.')
    })

    it('lets the user keep what they wrote', async () => {
      const sceneId = await openRewrite('She was very afraid.')

      await userEvent.click(screen.getByRole('button', { name: /Tighten/ }))
      await screen.findByText('Proposed change')
      await userEvent.click(screen.getByRole('button', { name: 'Keep what I wrote' }))

      expect(store().scenes[sceneId]!.summary).toBe('She was very afraid.')
      expect(screen.queryByText('Proposed change')).not.toBeInTheDocument()
    })
  })

  it('searches across scenes and names the field each hit came from', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')
    const scene = store().createScene(story.id, 'Harbour')
    store().updateScene(scene.id, { conflict: 'The ledger is missing.' })

    renderWithProviders(<StoryPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Search/ }))
    await userEvent.type(screen.getByLabelText('Search this story'), 'ledger')

    expect(screen.getByText('Conflict')).toBeInTheDocument()
    expect(screen.getByText('ledger')).toBeInTheDocument()
  })

  it('reports repetition as computed rather than generated', async () => {
    const projectId = seedProject()
    const story = store().createStory(projectId, 'Episode one')
    const scene = store().createScene(story.id, 'A')
    store().updateScene(scene.id, { summary: 'The lantern swung. Below the lantern, nothing moved.' })

    renderWithProviders(<StoryPage />)
    await userEvent.click(screen.getByRole('tab', { name: /Scenes/ }))
    await userEvent.click(screen.getByRole('button', { name: /1\. A/ }))

    expect(screen.getByText('Computed, not generated')).toBeInTheDocument()
    expect(screen.getByText('lantern')).toBeInTheDocument()
  })
})
