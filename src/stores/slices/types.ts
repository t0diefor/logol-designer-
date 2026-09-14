import type { StateCreator } from 'zustand'
import type { Asset } from '@/types/asset'
import type { Character } from '@/types/character'
import type { Comic } from '@/types/comic'
import type { Project, ProjectDraft } from '@/types/project'

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
}

export type WorkspaceState = ProjectSlice & CharacterSlice & AssetSlice & SelectionSlice

/** Slice creator shape, with the persist middleware's mutator declared. */
export type WorkspaceSliceCreator<T> = StateCreator<
  WorkspaceState,
  [['zustand/persist', unknown]],
  [],
  T
>
