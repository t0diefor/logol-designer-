import type { StateCreator } from 'zustand'
import type { Asset } from '@/types/asset'
import type { Character } from '@/types/character'
import type { Comic } from '@/types/comic'
import type { Project, ProjectDraft } from '@/types/project'
import type { Faction, Location, WorldEvent, WorldObject, WorldSystem } from '@/types/world'
import type { Beat, DialogueLine, Scene, Story } from '@/types/story'

/**
 * The workspace store, assembled from slices.
 *
 * Split into slices at phase 2, when characters and assets arrived: one file
 * per entity family keeps each under ~150 lines as phases 3-6 add worlds,
 * stories and pages. Every slice is typed against the whole store, so a slice
 * can read across families (deleting a project has to cascade into all of them)
 * without any of them importing each other.
 */

export interface ProjectSlice {
  projects: Record<string, Project>
  comics: Record<string, Comic>

  createProject: (draft: ProjectDraft) => Project
  updateProject: (id: string, changes: Partial<Project>) => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => Project | null

  createComic: (projectId: string, title: string) => Comic
  updateComic: (id: string, changes: Partial<Comic>) => void
  deleteComic: (id: string) => void
}

export interface CharacterSlice {
  characters: Record<string, Character>

  createCharacter: (projectId: string, name: string) => Character
  updateCharacter: (id: string, changes: Partial<Character>) => void
  deleteCharacter: (id: string) => void
  duplicateCharacter: (id: string) => Character | null

  /** Saves a restorable snapshot of the character as it stands. */
  snapshotCharacter: (id: string, label: string) => void
  /** Rolls the character back to a saved snapshot, snapshotting the current state first. */
  restoreCharacterVersion: (characterId: string, versionId: string) => boolean
  deleteCharacterVersion: (characterId: string, versionId: string) => void
}

export interface AssetSlice {
  assets: Record<string, Asset>

  /** Registers asset metadata. The bytes are written to IndexedDB separately. */
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, changes: Partial<Asset>) => void
  /** Removes the record, detaches it everywhere it is used, and deletes the blob. */
  deleteAsset: (id: string) => void
}

export interface WorldSlice {
  locations: Record<string, Location>
  factions: Record<string, Faction>
  systems: Record<string, WorldSystem>
  worldEvents: Record<string, WorldEvent>
  worldObjects: Record<string, WorldObject>

  createLocation: (projectId: string, name: string) => Location
  updateLocation: (id: string, changes: Partial<Location>) => void
  /** Detaches children and references rather than cascading the delete. */
  deleteLocation: (id: string) => void

  createFaction: (projectId: string, name: string) => Faction
  updateFaction: (id: string, changes: Partial<Faction>) => void
  deleteFaction: (id: string) => void

  createSystem: (projectId: string, name: string) => WorldSystem
  updateSystem: (id: string, changes: Partial<WorldSystem>) => void
  deleteSystem: (id: string) => void

  createWorldEvent: (projectId: string, title: string) => WorldEvent
  updateWorldEvent: (id: string, changes: Partial<WorldEvent>) => void
  deleteWorldEvent: (id: string) => void
  /** Swaps sort keys with the neighbouring event. */
  moveWorldEvent: (id: string, direction: 'earlier' | 'later') => void

  createWorldObject: (projectId: string, name: string) => WorldObject
  updateWorldObject: (id: string, changes: Partial<WorldObject>) => void
  deleteWorldObject: (id: string) => void
}

export interface StorySlice {
  stories: Record<string, Story>
  scenes: Record<string, Scene>

  createStory: (projectId: string, title: string) => Story
  updateStory: (id: string, changes: Partial<Story>) => void
  /** Cascades to the story's scenes, which cannot exist without it. */
  deleteStory: (id: string) => void

  createScene: (storyId: string, title: string) => Scene
  updateScene: (id: string, changes: Partial<Scene>) => void
  deleteScene: (id: string) => void
  moveScene: (id: string, direction: 'up' | 'down') => void

  addBeat: (sceneId: string, summary: string) => void
  updateBeat: (sceneId: string, beatId: string, changes: Partial<Beat>) => void
  removeBeat: (sceneId: string, beatId: string) => void

  addLine: (sceneId: string, kind: DialogueLine['kind'], characterId?: string | null) => void
  updateLine: (sceneId: string, lineId: string, changes: Partial<DialogueLine>) => void
  removeLine: (sceneId: string, lineId: string) => void
  moveLine: (sceneId: string, lineId: string, direction: 'up' | 'down') => void
}

export interface SelectionSlice {
  currentProjectId: string | null
  currentComicId: string | null

  setCurrentProject: (id: string | null) => void
  setCurrentComic: (id: string | null) => void

  /** Replaces the entire workspace. Used by project import in the Export Center. */
  replaceAll: (state: WorkspaceData) => void
}

/** The serialisable half of the store -- everything that gets persisted. */
export interface WorkspaceData {
  projects: Record<string, Project>
  comics: Record<string, Comic>
  characters: Record<string, Character>
  assets: Record<string, Asset>
  locations: Record<string, Location>
  factions: Record<string, Faction>
  systems: Record<string, WorldSystem>
  worldEvents: Record<string, WorldEvent>
  worldObjects: Record<string, WorldObject>
  stories: Record<string, Story>
  scenes: Record<string, Scene>
}

/**
 * An empty workspace, in one place.
 *
 * Every phase adds a collection, and "delete everything" / "import a project"
 * both need the full shape. Naming it here means adding a collection updates
 * those call sites automatically instead of breaking them one by one.
 */
export const EMPTY_WORKSPACE: WorkspaceData = {
  projects: {},
  comics: {},
  characters: {},
  assets: {},
  locations: {},
  factions: {},
  systems: {},
  worldEvents: {},
  worldObjects: {},
  stories: {},
  scenes: {},
}

export type WorkspaceState = ProjectSlice &
  CharacterSlice &
  AssetSlice &
  WorldSlice &
  StorySlice &
  SelectionSlice

/** Slice creator shape, with the persist middleware's mutator declared. */
export type WorkspaceSliceCreator<T> = StateCreator<
  WorkspaceState,
  [['zustand/persist', unknown]],
  [],
  T
>

/** Alias used by the world slice, which is long enough to want its own name. */
export type WorldSliceCreator<T> = WorkspaceSliceCreator<T>
