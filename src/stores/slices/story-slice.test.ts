import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '../workspace-store'
import { EMPTY_WORKSPACE } from './types'

const store = () => useWorkspaceStore.getState()

function reset() {
  useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
}

/** Returns the scenes of a story in index order. */
function orderedScenes(storyId: string) {
  return Object.values(store().scenes)
    .filter((scene) => scene.storyId === storyId)
    .sort((a, b) => a.index - b.index)
}

describe('story slice', () => {
  beforeEach(reset)

  it('numbers scenes from zero in creation order', () => {
    const story = store().createStory('p1', 'Episode one')
    store().createScene(story.id, 'A')
    store().createScene(story.id, 'B')

    expect(orderedScenes(story.id).map((s) => [s.title, s.index])).toEqual([
      ['A', 0],
      ['B', 1],
    ])
  })

  it('closes the gap when a scene is deleted', () => {
    const story = store().createStory('p1', 'Episode one')
    store().createScene(story.id, 'A')
    const b = store().createScene(story.id, 'B')
    store().createScene(story.id, 'C')

    store().deleteScene(b.id)

    // A script is read straight through; gaps in the numbering would show.
    expect(orderedScenes(story.id).map((s) => [s.title, s.index])).toEqual([
      ['A', 0],
      ['C', 1],
    ])
  })

  it('swaps indices when a scene is moved', () => {
    const story = store().createStory('p1', 'Episode one')
    store().createScene(story.id, 'A')
    const b = store().createScene(story.id, 'B')

    store().moveScene(b.id, 'up')
    expect(orderedScenes(story.id).map((s) => s.title)).toEqual(['B', 'A'])
  })

  it('does nothing at the ends of the list', () => {
    const story = store().createStory('p1', 'Episode one')
    const a = store().createScene(story.id, 'A')
    store().createScene(story.id, 'B')

    store().moveScene(a.id, 'up')
    expect(orderedScenes(story.id).map((s) => s.title)).toEqual(['A', 'B'])
  })

  it('only reorders within its own story', () => {
    const one = store().createStory('p1', 'One')
    const two = store().createStory('p1', 'Two')
    store().createScene(one.id, 'A')
    const other = store().createScene(two.id, 'X')

    store().moveScene(other.id, 'up')
    expect(store().scenes[other.id]!.index).toBe(0)
  })

  it('cascades scenes when a story is deleted', () => {
    const story = store().createStory('p1', 'Episode one')
    const scene = store().createScene(story.id, 'A')
    const other = store().createStory('p1', 'Other')
    const survivor = store().createScene(other.id, 'B')

    store().deleteStory(story.id)

    expect(store().scenes[scene.id]).toBeUndefined()
    expect(store().scenes[survivor.id]).toBeDefined()
  })

  it('cascades stories and their scenes when the project is deleted', () => {
    const project = store().createProject({ title: 'Doomed', logline: '', genre: '' })
    const story = store().createStory(project.id, 'Episode one')
    const scene = store().createScene(story.id, 'A')

    const safe = store().createProject({ title: 'Safe', logline: '', genre: '' })
    const safeStory = store().createStory(safe.id, 'Kept')
    const safeScene = store().createScene(safeStory.id, 'B')

    store().deleteProject(project.id)

    // Scenes hang off a story, not the project, so this is the case a naive
    // projectId filter would miss.
    expect(store().stories[story.id]).toBeUndefined()
    expect(store().scenes[scene.id]).toBeUndefined()
    expect(store().stories[safeStory.id]).toBeDefined()
    expect(store().scenes[safeScene.id]).toBeDefined()
  })

  describe('beats', () => {
    it('appends and renumbers on removal', () => {
      const story = store().createStory('p1', 'One')
      const scene = store().createScene(story.id, 'A')

      store().addBeat(scene.id, 'First')
      store().addBeat(scene.id, 'Second')
      store().addBeat(scene.id, 'Third')

      const middle = store().scenes[scene.id]!.beats[1]!
      store().removeBeat(scene.id, middle.id)

      expect(store().scenes[scene.id]!.beats.map((b) => [b.summary, b.index])).toEqual([
        ['First', 0],
        ['Third', 1],
      ])
    })

    it('updates one beat without touching its siblings', () => {
      const story = store().createStory('p1', 'One')
      const scene = store().createScene(story.id, 'A')
      store().addBeat(scene.id, 'First')
      store().addBeat(scene.id, 'Second')

      const first = store().scenes[scene.id]!.beats[0]!
      store().updateBeat(scene.id, first.id, { change: 'She stops trusting him' })

      expect(store().scenes[scene.id]!.beats[0]!.change).toBe('She stops trusting him')
      expect(store().scenes[scene.id]!.beats[1]!.change).toBe('')
    })
  })

  describe('script lines', () => {
    it('keeps the four kinds in one ordered list', () => {
      const story = store().createStory('p1', 'One')
      const scene = store().createScene(story.id, 'A')

      store().addLine(scene.id, 'caption')
      store().addLine(scene.id, 'dialogue')
      store().addLine(scene.id, 'sfx')

      expect(store().scenes[scene.id]!.lines.map((l) => l.kind)).toEqual([
        'caption',
        'dialogue',
        'sfx',
      ])
    })

    it('reorders and renumbers contiguously', () => {
      const story = store().createStory('p1', 'One')
      const scene = store().createScene(story.id, 'A')
      store().addLine(scene.id, 'caption')
      store().addLine(scene.id, 'dialogue')
      store().addLine(scene.id, 'sfx')

      const last = store().scenes[scene.id]!.lines[2]!
      store().moveLine(scene.id, last.id, 'up')

      const lines = store().scenes[scene.id]!.lines
      expect(lines.map((l) => l.kind)).toEqual(['caption', 'sfx', 'dialogue'])
      expect(lines.map((l) => l.index)).toEqual([0, 1, 2])
    })

    it('renumbers after a deletion', () => {
      const story = store().createStory('p1', 'One')
      const scene = store().createScene(story.id, 'A')
      store().addLine(scene.id, 'caption')
      store().addLine(scene.id, 'dialogue')

      const first = store().scenes[scene.id]!.lines[0]!
      store().removeLine(scene.id, first.id)

      expect(store().scenes[scene.id]!.lines.map((l) => l.index)).toEqual([0])
    })

    it('ignores a move past either end', () => {
      const story = store().createStory('p1', 'One')
      const scene = store().createScene(story.id, 'A')
      store().addLine(scene.id, 'caption')
      const only = store().scenes[scene.id]!.lines[0]!

      store().moveLine(scene.id, only.id, 'up')
      store().moveLine(scene.id, only.id, 'down')
      expect(store().scenes[scene.id]!.lines).toHaveLength(1)
    })
  })
})
