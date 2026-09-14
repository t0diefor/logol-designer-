import { createBrowserRouter, Navigate } from 'react-router-dom'
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
export const router = createBrowserRouter([
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
