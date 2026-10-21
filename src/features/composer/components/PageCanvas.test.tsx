import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { PageCanvas } from './PageCanvas'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'
import { useWorkspaceStore } from '@/stores/workspace-store'

const store = () => useWorkspaceStore.getState()

/**
 * A real page with one panel, built through the store so the record matches
 * what the app actually holds rather than a hand-written approximation.
 */
function makePage() {
  useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  const project = store().createProject({ title: 'P', logline: '', genre: '' })
  const comic = store().createComic(project.id, 'C')
  const episode = store().createEpisode(comic.id, 'E')
  const page = store().createPage(episode.id)
  store().addPanel(page.id, { x: 40, y: 40, width: 120, height: 90 })
  return store().pages[page.id]!
}

function renderCanvas(onCommit = vi.fn()) {
  const page = makePage()
  renderWithProviders(
    <PageCanvas
      page={page}
      selectedPanelId={null}
      onSelect={() => {}}
      onCommit={onCommit}
      zoom={1}
      snapToGrid={false}
      gridSize={6}
    />,
  )
  return { page, onCommit, hit: screen.getByRole('button', { name: /^Panel 1/ }) }
}

describe('PageCanvas', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  /**
   * The regression this file exists for.
   *
   * `pointerup` is dispatched at the hit rectangle and bubbles to the root
   * <svg>. When both elements ended the gesture, the second handler still saw
   * the gesture as active -- both closures came from the same render -- and
   * committed again. One drag then produced two undo entries, so the first
   * Ctrl+Z appeared to do nothing. Playwright caught it; nothing in jsdom did,
   * because the drag it was hiding behind was itself broken.
   */
  it('commits a drag exactly once as the pointerup bubbles', () => {
    const { onCommit, hit } = renderCanvas()

    fireEvent.pointerDown(hit, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: 160, clientY: 140 })
    fireEvent.pointerUp(hit, { button: 0, pointerId: 1, clientX: 160, clientY: 140 })

    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit.mock.calls[0]?.[1]).toMatchObject({ x: 100, y: 80, width: 120, height: 90 })
  })

  it('ignores a second pointerup once the gesture has ended', () => {
    const { onCommit, hit } = renderCanvas()

    fireEvent.pointerDown(hit, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: 160, clientY: 140 })
    fireEvent.pointerUp(hit, { button: 0, pointerId: 1, clientX: 160, clientY: 140 })
    fireEvent.pointerUp(hit, { button: 0, pointerId: 1, clientX: 160, clientY: 140 })

    expect(onCommit).toHaveBeenCalledTimes(1)
  })

  it('does not commit a click that never moved', () => {
    const { onCommit, hit } = renderCanvas()

    fireEvent.pointerDown(hit, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerUp(hit, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })

    // A selection click must not dirty the document or add an undo step.
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('moves the panel without resizing it, and keeps it on the page', () => {
    const { onCommit, hit } = renderCanvas()

    // Far past the left edge: the panel should stop at 0, not go negative.
    fireEvent.pointerDown(hit, { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: -400, clientY: -400 })
    fireEvent.pointerUp(hit, { button: 0, pointerId: 1, clientX: -400, clientY: -400 })

    expect(onCommit.mock.calls[0]?.[1]).toEqual({ x: 0, y: 0, width: 120, height: 90 })
  })

  it('ignores a non-primary button', () => {
    const { onCommit, hit } = renderCanvas()

    fireEvent.pointerDown(hit, { button: 2, pointerId: 1, clientX: 100, clientY: 100 })
    fireEvent.pointerMove(hit, { pointerId: 1, clientX: 160, clientY: 140 })
    fireEvent.pointerUp(hit, { button: 2, pointerId: 1, clientX: 160, clientY: 140 })

    expect(onCommit).not.toHaveBeenCalled()
  })
})
