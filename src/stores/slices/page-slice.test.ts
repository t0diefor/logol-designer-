import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '../workspace-store'
import { EMPTY_WORKSPACE } from './types'

const store = () => useWorkspaceStore.getState()
const rect = (x = 0, y = 0, width = 100, height = 100) => ({ x, y, width, height })

function seed() {
  useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  const project = store().createProject({ title: 'P', logline: '', genre: '' })
  const comic = store().createComic(project.id, 'Comic')
  const episode = store().createEpisode(comic.id, 'Episode one')
  return { project, comic, episode }
}

function orderedPages(episodeId: string) {
  return Object.values(store().pages)
    .filter((page) => page.episodeId === episodeId)
    .sort((a, b) => a.index - b.index)
}

describe('page slice', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  it('numbers pages from one, as printed', () => {
    const { episode } = seed()
    const first = store().createPage(episode.id)
    const second = store().createPage(episode.id)
    expect([first.index, second.index]).toEqual([1, 2])
  })

  it('keeps page numbers contiguous after a delete', () => {
    const { episode } = seed()
    store().createPage(episode.id)
    const middle = store().createPage(episode.id)
    store().createPage(episode.id)

    store().deletePage(middle.id)
    expect(orderedPages(episode.id).map((page) => page.index)).toEqual([1, 2])
  })

  it('swaps numbers when a page is moved', () => {
    const { episode } = seed()
    const first = store().createPage(episode.id)
    const second = store().createPage(episode.id)

    store().movePage(second.id, 'up')
    expect(store().pages[second.id]!.index).toBe(1)
    expect(store().pages[first.id]!.index).toBe(2)
  })

  describe('panels', () => {
    it('stacks each new panel above the last', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      const a = store().addPanel(page.id, rect())!
      const b = store().addPanel(page.id, rect())!
      expect(b.z).toBeGreaterThan(a.z)
    })

    it('renormalises z so order is never ambiguous', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      store().addPanel(page.id, rect())
      store().addPanel(page.id, rect())
      const third = store().addPanel(page.id, rect())!

      store().reorderPanel(page.id, third.id, 'back')

      const zs = store().pages[page.id]!.panels.map((panel) => panel.z).sort((a, b) => a - b)
      expect(zs).toEqual([0, 1, 2])
    })

    it('brings a panel to the front and sends it to the back', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      const first = store().addPanel(page.id, rect())!
      store().addPanel(page.id, rect())
      store().addPanel(page.id, rect())

      store().reorderPanel(page.id, first.id, 'front')
      let panels = store().pages[page.id]!.panels
      expect(panels.find((p) => p.id === first.id)!.z).toBe(2)

      store().reorderPanel(page.id, first.id, 'back')
      panels = store().pages[page.id]!.panels
      expect(panels.find((p) => p.id === first.id)!.z).toBe(0)
    })

    it('offsets a duplicate so it is not hidden behind the original', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      const panel = store().addPanel(page.id, rect(10, 10, 100, 100))!

      const copy = store().duplicatePanel(page.id, panel.id)!
      expect(copy.rect.x).toBeGreaterThan(panel.rect.x)
      expect(copy.id).not.toBe(panel.id)
    })

    it('gives a duplicated panel fresh balloon ids', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      const panel = store().addPanel(page.id, rect())!
      store().addBalloon(page.id, panel.id, {
        kind: 'speech', text: 'Hi', rect: rect(), speakerId: null,
        tailX: 0, tailY: 0, fontSize: 13, align: 'center',
      })

      const copy = store().duplicatePanel(page.id, panel.id)!
      const original = store().pages[page.id]!.panels.find((p) => p.id === panel.id)!
      // Sharing an id would mean editing one balloon changed both.
      expect(copy.balloons[0]!.id).not.toBe(original.balloons[0]!.id)
      expect(copy.balloons[0]!.text).toBe('Hi')
    })
  })

  describe('page duplication', () => {
    it('gives every nested record a fresh id', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      const panel = store().addPanel(page.id, rect())!
      store().addBalloon(page.id, panel.id, {
        kind: 'speech', text: 'Hi', rect: rect(), speakerId: null,
        tailX: 0, tailY: 0, fontSize: 13, align: 'center',
      })

      const copy = store().duplicatePage(page.id)!
      expect(copy.panels[0]!.id).not.toBe(panel.id)
      expect(copy.panels[0]!.balloons[0]!.id).not.toBe(
        store().pages[page.id]!.panels[0]!.balloons[0]!.id,
      )
    })

    it('places the copy at the end', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      store().createPage(episode.id)
      const copy = store().duplicatePage(page.id)!
      expect(copy.index).toBe(3)
    })
  })

  describe('cascades', () => {
    it('removes pages when their episode goes', () => {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      store().deleteEpisode(episode.id)
      expect(store().pages[page.id]).toBeUndefined()
    })

    it('removes episodes and pages when their comic goes', () => {
      const { comic, episode } = seed()
      const page = store().createPage(episode.id)
      store().deleteComic(comic.id)
      expect(store().episodes[episode.id]).toBeUndefined()
      expect(store().pages[page.id]).toBeUndefined()
    })

    it('removes the whole chain when the project goes', () => {
      const { project, episode } = seed()
      const page = store().createPage(episode.id)

      // Episodes hang off a comic and pages off an episode, so neither has a
      // projectId -- this is the case a naive filter would miss entirely.
      store().deleteProject(project.id)
      expect(store().episodes[episode.id]).toBeUndefined()
      expect(store().pages[page.id]).toBeUndefined()
    })

    it('leaves another project’s pages alone', () => {
      const { project } = seed()
      const other = store().createProject({ title: 'Safe', logline: '', genre: '' })
      const otherComic = store().createComic(other.id, 'C')
      const otherEpisode = store().createEpisode(otherComic.id, 'E')
      const survivor = store().createPage(otherEpisode.id)

      store().deleteProject(project.id)
      expect(store().pages[survivor.id]).toBeDefined()
    })
  })

  describe('moving a panel', () => {
    function panelWithContents() {
      const { episode } = seed()
      const page = store().createPage(episode.id)
      const panel = store().addPanel(page.id, rect(40, 40, 200, 150))!
      store().addBalloon(page.id, panel.id, {
        kind: 'speech', text: 'Hi', rect: rect(60, 60, 80, 40), speakerId: null,
        tailX: 0, tailY: 0, fontSize: 13, align: 'center',
      })
      store().addPlacement(page.id, panel.id, {
        kind: 'asset', refId: 'a1', rect: rect(50, 50, 180, 130),
        rotation: 0, flipX: false, opacity: 1, variant: '',
      })
      return { page, panel }
    }

    const live = (pageId: string, panelId: string) =>
      store().pages[pageId]!.panels.find((p) => p.id === panelId)!

    it('carries the art and the lettering with it', () => {
      const { page, panel } = panelWithContents()

      // The drag commits the new rectangle; the contents must follow, or a
      // finished panel comes apart the first time it is moved.
      store().updatePanel(page.id, panel.id, { rect: rect(90, 110, 200, 150) })

      const moved = live(page.id, panel.id)
      expect(moved.balloons[0]!.rect).toMatchObject({ x: 110, y: 130 })
      expect(moved.placements[0]!.rect).toMatchObject({ x: 100, y: 120 })
    })

    it('leaves the contents alone on a pure resize', () => {
      const { page, panel } = panelWithContents()

      // Resizing crops or reveals. Scaling the artwork to the frame would be
      // a different, destructive operation.
      store().updatePanel(page.id, panel.id, { rect: rect(40, 40, 300, 260) })

      const resized = live(page.id, panel.id)
      expect(resized.balloons[0]!.rect).toMatchObject({ x: 60, y: 60, width: 80, height: 40 })
      expect(resized.placements[0]!.rect).toMatchObject({ x: 50, y: 50, width: 180, height: 130 })
    })

    it('leaves the contents alone when the rectangle is unchanged', () => {
      const { page, panel } = panelWithContents()
      const before = live(page.id, panel.id)

      store().updatePanel(page.id, panel.id, { rect: { ...before.rect }, description: 'note' })

      const after = live(page.id, panel.id)
      expect(after.description).toBe('note')
      expect(after.balloons[0]!.rect).toEqual(before.balloons[0]!.rect)
    })

    it('does not touch the contents when the rect is not part of the change', () => {
      const { page, panel } = panelWithContents()
      const before = live(page.id, panel.id)

      store().updatePanel(page.id, panel.id, { shot: 'Low angle' })

      expect(live(page.id, panel.id).balloons[0]!.rect).toEqual(before.balloons[0]!.rect)
    })
  })

  it('replaces a page wholesale, which is how undo restores one', () => {
    const { episode } = seed()
    const page = store().createPage(episode.id)
    store().addPanel(page.id, rect())

    const snapshot = { ...store().pages[page.id]!, margin: 99 }
    store().replacePage(snapshot)
    expect(store().pages[page.id]!.margin).toBe(99)
  })

  it('ignores a replace for a page that no longer exists', () => {
    const { episode } = seed()
    const page = store().createPage(episode.id)
    const snapshot = store().pages[page.id]!
    store().deletePage(page.id)

    store().replacePage(snapshot)
    expect(store().pages[page.id]).toBeUndefined()
  })
})
