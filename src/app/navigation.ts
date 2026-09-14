import type { IconName } from '@/components/ui/Icon'

/**
 * The app's primary navigation.
 *
 * Declared as data rather than as JSX so the sidebar, the mobile drawer and
 * the command palette (a later phase) all render the same list from one source.
 *
 * `requiresProject` marks destinations that are meaningless without a project
 * selected -- the sidebar disables those and explains why, which is clearer
 * than letting someone navigate into an empty screen.
 */
export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Shown as a tooltip and in the mobile drawer. */
  description: string
  requiresProject: boolean
  /** Marks areas that are not yet built, so the UI can label them honestly. */
  phase: number
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Dashboard',
    icon: 'dashboard',
    description: 'Recent work and where to pick up',
    requiresProject: false,
    phase: 1,
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: 'folder',
    description: 'Every comic project you have started',
    requiresProject: false,
    phase: 1,
  },
  {
    to: '/characters',
    label: 'Characters',
    icon: 'user',
    description: 'Cast, appearance sheets and references',
    requiresProject: true,
    phase: 2,
  },
  {
    to: '/world',
    label: 'World',
    icon: 'globe',
    description: 'Locations, factions, systems and history',
    requiresProject: true,
    phase: 3,
  },
  {
    to: '/story',
    label: 'Story',
    icon: 'pen',
    description: 'Outlines, scenes, beats and dialogue',
    requiresProject: true,
    phase: 4,
  },
  {
    to: '/assets',
    label: 'Assets',
    icon: 'image',
    description: 'Uploaded and generated images',
    requiresProject: true,
    phase: 5,
  },
  {
    to: '/composer',
    label: 'Composer',
    icon: 'layout',
    description: 'Lay out pages, panels and balloons',
    requiresProject: true,
    phase: 6,
  },
  {
    to: '/export',
    label: 'Export',
    icon: 'download',
    description: 'PNG, PDF and project data',
    requiresProject: true,
    phase: 7,
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: 'settings',
    description: 'Appearance, storage and preferences',
    requiresProject: false,
    phase: 1,
  },
]

/** The phase currently shipped. Anything above this is labelled as not yet built. */
export const CURRENT_PHASE = 3
