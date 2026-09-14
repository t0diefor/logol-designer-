import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'
import { hasSampleProject, loadSampleProject, SAMPLE_PROJECT_TITLE } from './sample-project'

const store = () => useWorkspaceStore.getState()

describe('sample project', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  it('fills every area the app has built so far', () => {
    const projectId = loadSampleProject(useWorkspaceStore.getState)
    const state = store()

    const inProject = <T extends { projectId: string }>(record: Record<string, T>) =>
      Object.values(record).filter((item) => item.projectId === projectId)

    // Nothing should be an empty state after loading the sample.
    expect(inProject(state.characters).length).toBeGreaterThanOrEqual(2)
    expect(inProject(state.locations).length).toBeGreaterThanOrEqual(3)
    expect(inProject(state.factions).length).toBeGreaterThanOrEqual(2)
    expect(inProject(state.systems).length).toBeGreaterThanOrEqual(1)
    expect(inProject(state.worldEvents).length).toBeGreaterThanOrEqual(2)
    expect(inProject(state.worldObjects).length).toBeGreaterThanOrEqual(1)
    expect(inProject(state.stories).length).toBeGreaterThanOrEqual(1)
    expect(Object.keys(state.scenes).length).toBeGreaterThanOrEqual(3)
  })

  it('writes rivalries to both sides, as the UI does', () => {
    loadSampleProject(useWorkspaceStore.getState)
    const factions = Object.values(store().factions)

    for (const faction of factions) {
      for (const rivalId of faction.rivalFactionIds) {
        expect(store().factions[rivalId]!.rivalFactionIds).toContain(faction.id)
      }
    }
  })

  it('leaves no dangling references', () => {
    loadSampleProject(useWorkspaceStore.getState)
    const state = store()

    for (const location of Object.values(state.locations)) {
      if (location.parentLocationId) expect(state.locations[location.parentLocationId]).toBeDefined()
    }
    for (const faction of Object.values(state.factions)) {
      if (faction.homeLocationId) expect(state.locations[faction.homeLocationId]).toBeDefined()
    }
    for (const event of Object.values(state.worldEvents)) {
      if (event.locationId) expect(state.locations[event.locationId]).toBeDefined()
      for (const id of event.involvedFactionIds) expect(state.factions[id]).toBeDefined()
      for (const id of event.involvedCharacterIds) expect(state.characters[id]).toBeDefined()
    }
    for (const character of Object.values(state.characters)) {
      for (const relationship of character.relationships) {
        if (relationship.targetCharacterId) {
          expect(state.characters[relationship.targetCharacterId]).toBeDefined()
        }
      }
    }
    for (const scene of Object.values(state.scenes)) {
      expect(state.stories[scene.storyId]).toBeDefined()
      if (scene.locationId) expect(state.locations[scene.locationId]).toBeDefined()
      for (const characterId of Object.keys(scene.characterObjectives)) {
        expect(state.characters[characterId]).toBeDefined()
      }
    }
  })

  it('includes padded prose so the Tighten tool has something to demonstrate', () => {
    loadSampleProject(useWorkspaceStore.getState)
    const allLines = Object.values(store().scenes).flatMap((scene) => scene.lines)
    expect(allLines.some((line) => /basically|in order to|just/.test(line.text))).toBe(true)
  })

  it('is reported as loaded, so it cannot be added twice', () => {
    expect(hasSampleProject(store())).toBe(false)
    loadSampleProject(useWorkspaceStore.getState)
    expect(hasSampleProject(store())).toBe(true)
  })

  it('deletes like any other project, taking its contents with it', () => {
    const projectId = loadSampleProject(useWorkspaceStore.getState)
    store().deleteProject(projectId)

    const state = store()
    expect(Object.values(state.projects).some((p) => p.title === SAMPLE_PROJECT_TITLE)).toBe(false)
    expect(state.characters).toEqual({})
    expect(state.locations).toEqual({})
    expect(state.stories).toEqual({})
    expect(state.scenes).toEqual({})
  })
})
