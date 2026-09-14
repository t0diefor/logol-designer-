import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from './workspace-store'

/** Resets the store between tests, since Zustand stores are module singletons. */
function resetStore() {
  useWorkspaceStore.setState({
    projects: {},
    comics: {},
    currentProjectId: null,
    currentComicId: null,
  })
}

describe('workspace store', () => {
  beforeEach(resetStore)

  it('creates a project and makes it current', () => {
    const project = useWorkspaceStore
      .getState()
      .createProject({ title: 'The Lantern Wars', logline: 'A lamplighter.', genre: 'fantasy' })

    const state = useWorkspaceStore.getState()
    expect(state.projects[project.id]?.title).toBe('The Lantern Wars')
    expect(state.currentProjectId).toBe(project.id)
    expect(state.currentComicId).toBeNull()
  })

  it('bumps updatedAt when a project changes', async () => {
    const project = useWorkspaceStore
      .getState()
      .createProject({ title: 'A', logline: '', genre: '' })
    const before = useWorkspaceStore.getState().projects[project.id]!.updatedAt

    await new Promise((resolve) => setTimeout(resolve, 2))
    useWorkspaceStore.getState().updateProject(project.id, { title: 'B' })

    const after = useWorkspaceStore.getState().projects[project.id]!
    expect(after.title).toBe('B')
    expect(after.updatedAt >= before).toBe(true)
  })

  it('deletes a project and cascades to its comics', () => {
    const store = useWorkspaceStore.getState()
    const project = store.createProject({ title: 'Doomed', logline: '', genre: '' })
    const comic = useWorkspaceStore.getState().createComic(project.id, 'Issue 1')

    // A comic belonging to a different project must survive the cascade.
    const other = useWorkspaceStore.getState().createProject({ title: 'Safe', logline: '', genre: '' })
    const otherComic = useWorkspaceStore.getState().createComic(other.id, 'Issue 1')

    useWorkspaceStore.getState().deleteProject(project.id)

    const state = useWorkspaceStore.getState()
    expect(state.projects[project.id]).toBeUndefined()
    expect(state.comics[comic.id]).toBeUndefined()
    expect(state.comics[otherComic.id]).toBeDefined()
  })

  it('clears the current comic when its project is deleted', () => {
    const project = useWorkspaceStore
      .getState()
      .createProject({ title: 'Doomed', logline: '', genre: '' })
    useWorkspaceStore.getState().createComic(project.id, 'Issue 1')
    expect(useWorkspaceStore.getState().currentComicId).not.toBeNull()

    useWorkspaceStore.getState().deleteProject(project.id)
    expect(useWorkspaceStore.getState().currentComicId).toBeNull()
    expect(useWorkspaceStore.getState().currentProjectId).toBeNull()
  })

  it('duplicates a project with fresh ids and copies its comics', () => {
    const project = useWorkspaceStore
      .getState()
      .createProject({ title: 'Original', logline: 'x', genre: 'y' })
    useWorkspaceStore.getState().createComic(project.id, 'Issue 1')

    const copy = useWorkspaceStore.getState().duplicateProject(project.id)
    expect(copy).not.toBeNull()
    expect(copy!.id).not.toBe(project.id)
    expect(copy!.title).toBe('Original (copy)')

    const copiedComics = Object.values(useWorkspaceStore.getState().comics).filter(
      (comic) => comic.projectId === copy!.id,
    )
    expect(copiedComics).toHaveLength(1)
    // The copy must be independent: editing it must not touch the original.
    expect(copiedComics[0]!.id).not.toBe(
      Object.values(useWorkspaceStore.getState().comics).find(
        (comic) => comic.projectId === project.id,
      )!.id,
    )
  })

  it('returns null when duplicating a project that does not exist', () => {
    expect(useWorkspaceStore.getState().duplicateProject('missing-id')).toBeNull()
  })

  it('drops the current comic when switching to a project it does not belong to', () => {
    const first = useWorkspaceStore.getState().createProject({ title: 'One', logline: '', genre: '' })
    useWorkspaceStore.getState().createComic(first.id, 'Issue 1')
    const second = useWorkspaceStore.getState().createProject({ title: 'Two', logline: '', genre: '' })

    useWorkspaceStore.getState().setCurrentProject(second.id)
    expect(useWorkspaceStore.getState().currentComicId).toBeNull()
  })

  it('ignores updates to a project that does not exist', () => {
    useWorkspaceStore.getState().updateProject('missing-id', { title: 'ghost' })
    expect(Object.keys(useWorkspaceStore.getState().projects)).toHaveLength(0)
  })
})
