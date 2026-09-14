import { lazy, Suspense, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * Lazily loaded route components.
 *
 * Kept apart from `router.tsx` because that file exports the router object,
 * and a module that mixes component and non-component exports cannot be
 * hot-reloaded by React Fast Refresh. This file exports components only.
 *
 * Splitting matters most in later phases: the composer and export routes will
 * pull in canvas and PDF libraries, and those must not sit in the bundle a
 * user downloads just to look at their project list.
 */

export const ProjectsPage = lazy(() =>
  import('@/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
)

export const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

export const RoadmapPage = lazy(() =>
  import('@/pages/RoadmapPage').then((m) => ({ default: m.RoadmapPage })),
)

export const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

/** Placeholder shown while a route chunk downloads. */
export function RouteFallback() {
  return (
    <div>
      <span className="sr-only" role="status">
        Loading page
      </span>
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-4 h-4 w-96" />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    </div>
  )
}

/** Wraps a lazy route element in the shared loading fallback. */
export function LazyRoute({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>
}
