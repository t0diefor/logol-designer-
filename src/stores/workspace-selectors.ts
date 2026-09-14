import { useMemo } from 'react'
import { useWorkspaceStore } from './workspace-store'
import type { Comic } from '@/types/comic'
import type { Project } from '@/types/project'

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
