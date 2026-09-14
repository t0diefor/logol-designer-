import { newId, nowIso } from '@/lib/id'
import type { Beat, DialogueLine, Scene, Story } from '@/types/story'
import type { StorySlice, WorkspaceSliceCreator } from './types'

/**
 * Stories and their scenes.
 *
 * Scenes carry an explicit `index` rather than relying on object key order,
 * because order is meaning here: scene 4 following scene 3 is the writer's
 * decision, not an accident of insertion. Reordering renumbers the affected
 * range rather than swapping two values, since a script is read straight
 * through and gaps in the numbering would show.
 */

export const createStorySlice: WorkspaceSliceCreator<StorySlice> = (set, get) => ({
  stories: {},
  scenes: {},

  createStory: (projectId, title) => {
    const timestamp = nowIso()
    const story: Story = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      episodeId: null,
      title,
      logline: '',
      theme: '',
      premise: '',
      outline: '',
      tags: [],
    }
    set((state) => ({ stories: { ...state.stories, [story.id]: story } }))
    return story
  },

  updateStory: (id, changes) =>
    set((state) => {
      const existing = state.stories[id]
      if (!existing) return state
      return {
        stories: { ...state.stories, [id]: { ...existing, ...changes, id, updatedAt: nowIso() } },
      }
    }),

  deleteStory: (id) =>
    set((state) => {
      const stories = { ...state.stories }
      delete stories[id]

      // Scenes belong to exactly one story and are meaningless without it.
      const scenes = Object.fromEntries(
        Object.entries(state.scenes).filter(([, scene]) => scene.storyId !== id),
      )

      return { stories, scenes }
    }),

  createScene: (storyId, title) => {
    const timestamp = nowIso()
    const siblings = Object.values(get().scenes).filter((scene) => scene.storyId === storyId)

    const scene: Scene = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      storyId,
      index: siblings.length,
      title,
      slug: '',
      locationId: null,
      summary: '',
      goal: '',
      conflict: '',
      outcome: '',
      characterObjectives: {},
      beats: [],
      lines: [],
      notes: [],
      tags: [],
      status: 'idea',
    }

    set((state) => ({ scenes: { ...state.scenes, [scene.id]: scene } }))
    return scene
  },

  updateScene: (id, changes) =>
    set((state) => {
      const existing = state.scenes[id]
      if (!existing) return state
      return {
        scenes: { ...state.scenes, [id]: { ...existing, ...changes, id, updatedAt: nowIso() } },
      }
    }),

  deleteScene: (id) =>
    set((state) => {
      const target = state.scenes[id]
      if (!target) return state

      const scenes = { ...state.scenes }
      delete scenes[id]

      // Close the gap so the remaining scenes stay 0..n-1.
      const timestamp = nowIso()
      for (const [sceneId, scene] of Object.entries(scenes)) {
        if (scene.storyId !== target.storyId) continue
        if (scene.index < target.index) continue
        scenes[sceneId] = { ...scene, index: scene.index - 1, updatedAt: timestamp }
      }

      return { scenes }
    }),

  moveScene: (id, direction) =>
    set((state) => {
      const scene = state.scenes[id]
      if (!scene) return state

      const ordered = Object.values(state.scenes)
        .filter((candidate) => candidate.storyId === scene.storyId)
        .sort((a, b) => a.index - b.index)

      const position = ordered.findIndex((candidate) => candidate.id === id)
      const swapWith = ordered[direction === 'up' ? position - 1 : position + 1]
      if (!swapWith) return state

      const timestamp = nowIso()
      return {
        scenes: {
          ...state.scenes,
          [scene.id]: { ...scene, index: swapWith.index, updatedAt: timestamp },
          [swapWith.id]: { ...swapWith, index: scene.index, updatedAt: timestamp },
        },
      }
    }),

  addBeat: (sceneId, summary) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state

      const beat: Beat = {
        id: newId(),
        index: scene.beats.length,
        summary,
        change: '',
      }

      return {
        scenes: {
          ...state.scenes,
          [sceneId]: { ...scene, beats: [...scene.beats, beat], updatedAt: nowIso() },
        },
      }
    }),

  updateBeat: (sceneId, beatId, changes) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state
      return {
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            beats: scene.beats.map((beat) => (beat.id === beatId ? { ...beat, ...changes } : beat)),
            updatedAt: nowIso(),
          },
        },
      }
    }),

  removeBeat: (sceneId, beatId) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state
      return {
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            beats: scene.beats
              .filter((beat) => beat.id !== beatId)
              .map((beat, index) => ({ ...beat, index })),
            updatedAt: nowIso(),
          },
        },
      }
    }),

  addLine: (sceneId, kind, characterId) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state

      const line: DialogueLine = {
        id: newId(),
        characterId: characterId ?? null,
        speakerName: '',
        parenthetical: '',
        text: '',
        kind,
        index: scene.lines.length,
      }

      return {
        scenes: {
          ...state.scenes,
          [sceneId]: { ...scene, lines: [...scene.lines, line], updatedAt: nowIso() },
        },
      }
    }),

  updateLine: (sceneId, lineId, changes) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state
      return {
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            lines: scene.lines.map((line) => (line.id === lineId ? { ...line, ...changes } : line)),
            updatedAt: nowIso(),
          },
        },
      }
    }),

  removeLine: (sceneId, lineId) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state
      return {
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            lines: scene.lines
              .filter((line) => line.id !== lineId)
              .map((line, index) => ({ ...line, index })),
            updatedAt: nowIso(),
          },
        },
      }
    }),

  moveLine: (sceneId, lineId, direction) =>
    set((state) => {
      const scene = state.scenes[sceneId]
      if (!scene) return state

      const ordered = [...scene.lines].sort((a, b) => a.index - b.index)
      const position = ordered.findIndex((line) => line.id === lineId)
      const target = direction === 'up' ? position - 1 : position + 1
      if (position === -1 || target < 0 || target >= ordered.length) return state

      const reordered = [...ordered]
      const [moved] = reordered.splice(position, 1)
      reordered.splice(target, 0, moved!)

      return {
        scenes: {
          ...state.scenes,
          [sceneId]: {
            ...scene,
            lines: reordered.map((line, index) => ({ ...line, index })),
            updatedAt: nowIso(),
          },
        },
      }
    }),
})
