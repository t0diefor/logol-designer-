import { createBrowserRouter, createHashRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '@/layouts/AppLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { ErrorPage } from '@/pages/ErrorPage'
import {
  CharacterDetailPage,
  CharactersPage,
  LazyRoute,
  NotFoundPage,
  ProjectsPage,
  RoadmapPage,
  SettingsPage,
  StoryPage,
  WorldPage,
} from './routes'

/**
 * Route table.
 *
 * Routes for later phases resolve to RoadmapPage rather than being omitted, so
 * the navigation reflects the real product shape while being explicit that
 * those areas are not built yet. Each is swapped for its real page as its
 * phase lands, with no change needed to the navigation or the layout.
 */
/*
 * Hash routing is used when the app is served from a static host that cannot
 * rewrite unknown paths to index.html -- object storage, a preview build, a
 * subdirectory. Without it, reloading on /characters returns a 404 from the
 * host before the app ever runs.
 *
 * Normal deployments leave VITE_ROUTER unset and get clean URLs.
 */
const createRouter =
  import.meta.env.VITE_ROUTER === 'hash' ? createHashRouter : createBrowserRouter

export const router = createRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'projects',
        element: (
          <LazyRoute>
            <ProjectsPage />
          </LazyRoute>
        ),
      },

      {
        path: 'characters',
        element: (
          <LazyRoute>
            <CharactersPage />
          </LazyRoute>
        ),
      },
      {
        path: 'characters/:characterId',
        element: (
          <LazyRoute>
            <CharacterDetailPage />
          </LazyRoute>
        ),
      },

      {
        path: 'world',
        element: (
          <LazyRoute>
            <WorldPage />
          </LazyRoute>
        ),
      },

      {
        path: 'story',
        element: (
          <LazyRoute>
            <StoryPage />
          </LazyRoute>
        ),
      },

      // Phase 5-7 placeholders.
      ...['assets', 'composer', 'export'].map((path) => ({
        path,
        element: (
          <LazyRoute>
            <RoadmapPage />
          </LazyRoute>
        ),
      })),

      {
        path: 'settings',
        element: (
          <LazyRoute>
            <SettingsPage />
          </LazyRoute>
        ),
      },
      { path: 'dashboard', element: <Navigate to="/" replace /> },
      {
        path: '*',
        element: (
          <LazyRoute>
            <NotFoundPage />
          </LazyRoute>
        ),
      },
    ],
  },
])
