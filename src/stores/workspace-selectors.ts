import { useMemo } from 'react'
import { useWorkspaceStore } from './workspace-store'
import type { Asset } from '@/types/asset'
import type { Character } from '@/types/character'
import type { Comic } from '@/types/comic'
import type { Project } from '@/types/project'
import type { Scene, Story } from '@/types/story'
import type {
  Faction,
  Location,
  WorldEvent,
  WorldObject,
  WorldSystem,
} from '@/types/world'

/**
 * Derived views over the workspace store.
 *
 * Why these are hooks with `useMemo` rather than plain selector functions:
 *
 * Zustand v5 compares the selector's result by reference (`Object.is`) and
 * dropped v4's automatic shallow comparison. A selector that builds a new
 * array on every call -- which any `Object.values().sort()` does -- therefore
 * returns a new reference each render, React sees the store as permanently
 * changed, and the component re-renders forever ("Maximum update depth
 * exceeded").
 *
 * The fix is to subscribe to the stable underlying record and derive the array
 * in a memo, so a new array is produced only when the record actually changes.
 *
 * Note for later phases: unit tests that call `getState()` cannot catch this
 * class of bug, because the loop only exists inside React's subscription. It
 * takes a rendering test or a real browser to surface it.
 */

/** All projects, most recently updated first. */
export function useProjectsByRecency(): Project[] {
  const projects = useWorkspaceStore((state) => state.projects)
  return useMemo(
    () => Object.values(projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [projects],
  )
}

/** Comics belonging to one project, in creation order. */
export function useComicsForProject(projectId: string | null): Comic[] {
  const comics = useWorkspaceStore((state) => state.comics)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(comics)
      .filter((comic) => comic.projectId === projectId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }, [comics, projectId])
}

/** The currently selected project, or null. */
export function useCurrentProject(): Project | null {
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId)
  const projects = useWorkspaceStore((state) => state.projects)
  return currentProjectId ? (projects[currentProjectId] ?? null) : null
}

/** The currently selected comic, or null. */
export function useCurrentComic(): Comic | null {
  const currentComicId = useWorkspaceStore((state) => state.currentComicId)
  const comics = useWorkspaceStore((state) => state.comics)
  return currentComicId ? (comics[currentComicId] ?? null) : null
}

/** Characters in one project, alphabetical. */
export function useCharactersForProject(projectId: string | null): Character[] {
  const characters = useWorkspaceStore((state) => state.characters)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(characters)
      .filter((character) => character.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [characters, projectId])
}

/** One character by id, or null. */
export function useCharacter(characterId: string | undefined): Character | null {
  const characters = useWorkspaceStore((state) => state.characters)
  return characterId ? (characters[characterId] ?? null) : null
}

/** Assets in one project, newest first. */
export function useAssetsForProject(projectId: string | null): Asset[] {
  const assets = useWorkspaceStore((state) => state.assets)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(assets)
      .filter((asset) => asset.projectId === projectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [assets, projectId])
}

/**
 * Every tag used by the characters in a project, with how often, most used
 * first. Powers the tag filter without needing a separate tag table.
 */
export function useCharacterTagCounts(projectId: string | null): { tag: string; count: number }[] {
  const characters = useCharactersForProject(projectId)
  return useMemo(() => {
    const counts = new Map<string, number>()
    for (const character of characters) {
      for (const tag of character.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  }, [characters])
}

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */

/** Locations in one project, alphabetical. */
export function useLocationsForProject(projectId: string | null): Location[] {
  const locations = useWorkspaceStore((state) => state.locations)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(locations)
      .filter((location) => location.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [locations, projectId])
}

/** Factions in one project, alphabetical. */
export function useFactionsForProject(projectId: string | null): Faction[] {
  const factions = useWorkspaceStore((state) => state.factions)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(factions)
      .filter((faction) => faction.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [factions, projectId])
}

/** Magic, technology, culture and other systems in one project. */
export function useSystemsForProject(projectId: string | null): WorldSystem[] {
  const systems = useWorkspaceStore((state) => state.systems)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(systems)
      .filter((system) => system.projectId === projectId)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
  }, [systems, projectId])
}

/**
 * Timeline events in chronological order.
 *
 * Ordered by `sortKey`, not by the in-world date label, because invented
 * calendars ("Third Age, year 412") cannot be parsed or compared. The label
 * stays expressive; the ordering stays reliable. `createdAt` breaks ties so
 * the order is stable when two events share a key.
 */
export function useTimelineForProject(projectId: string | null): WorldEvent[] {
  const worldEvents = useWorkspaceStore((state) => state.worldEvents)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(worldEvents)
      .filter((event) => event.projectId === projectId)
      .sort((a, b) => a.sortKey - b.sortKey || a.createdAt.localeCompare(b.createdAt))
  }, [worldEvents, projectId])
}

/** Significant objects in one project, alphabetical. */
export function useWorldObjectsForProject(projectId: string | null): WorldObject[] {
  const worldObjects = useWorkspaceStore((state) => state.worldObjects)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(worldObjects)
      .filter((object) => object.projectId === projectId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [worldObjects, projectId])
}

/** Counts for the world overview tabs, computed once. */
export function useWorldCounts(projectId: string | null) {
  const locations = useLocationsForProject(projectId)
  const factions = useFactionsForProject(projectId)
  const systems = useSystemsForProject(projectId)
  const events = useTimelineForProject(projectId)
  const objects = useWorldObjectsForProject(projectId)

  return useMemo(
    () => ({
      locations: locations.length,
      factions: factions.length,
      systems: systems.length,
      events: events.length,
      objects: objects.length,
      total:
        locations.length + factions.length + systems.length + events.length + objects.length,
    }),
    [locations, factions, systems, events, objects],
  )
}

/* ------------------------------------------------------------------ */
/* Story                                                               */
/* ------------------------------------------------------------------ */

/** Stories in one project, most recently edited first. */
export function useStoriesForProject(projectId: string | null): Story[] {
  const stories = useWorkspaceStore((state) => state.stories)
  return useMemo(() => {
    if (!projectId) return []
    return Object.values(stories)
      .filter((story) => story.projectId === projectId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [stories, projectId])
}

/** Scenes of one story, in script order. */
export function useScenesForStory(storyId: string | null): Scene[] {
  const scenes = useWorkspaceStore((state) => state.scenes)
  return useMemo(() => {
    if (!storyId) return []
    return Object.values(scenes)
      .filter((scene) => scene.storyId === storyId)
      .sort((a, b) => a.index - b.index)
  }, [scenes, storyId])
}

/**
 * Every word of prose in a scene, concatenated.
 *
 * Used for word counts and the deterministic repetition analysis. Field
 * labels are deliberately excluded -- counting them would inflate the number
 * and flag structural words as echoes.
 */
export function sceneProse(scene: Scene): string {
  return [
    scene.summary,
    scene.goal,
    scene.conflict,
    scene.outcome,
    ...scene.beats.map((beat) => `${beat.summary} ${beat.change}`),
    ...scene.lines.map((line) => line.text),
  ]
    .filter((part) => part.trim().length > 0)
    .join('\n\n')
}

/** Word count across a whole story, including its scenes. */
export function useStoryWordCount(storyId: string | null): number {
  const story = useWorkspaceStore((state) => (storyId ? state.stories[storyId] : undefined))
  const scenes = useScenesForStory(storyId)

  return useMemo(() => {
    const count = (text: string) => text.split(/\s+/).filter(Boolean).length
    const storyWords = story ? count(story.premise) + count(story.outline) : 0
    return scenes.reduce((total, scene) => total + count(sceneProse(scene)), storyWords)
  }, [story, scenes])
}
