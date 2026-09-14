import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/cn'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { useCurrentComic, useCurrentProject } from '@/stores/workspace-selectors'
import { usePersistenceStore } from '@/stores/persistence-store'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'

/**
 * The application shell: header, navigation and the routed content area.
 *
 * Responsive behaviour:
 *  - >= md the sidebar is a fixed rail the user can collapse to icons.
 *  - <  md it becomes an overlay drawer, because a 240px rail on a phone
 *    leaves no room for the content it is meant to navigate.
 */
export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  const project = useCurrentProject()
  const comic = useCurrentComic()

  const hydrated = usePersistenceStore((state) => state.hydrated)
  const kit = useMotionKit()

  return (
    <div className="flex min-h-dvh flex-col">
      <Topbar
        project={project}
        comic={comic}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onOpenMobileNav={() => setMobileNavOpen(true)}
      />

      <div className="flex flex-1">
        {/* Desktop rail */}
        <aside
          className={cn(
            'hidden shrink-0 border-r border-line md:block',
            'border-r-[length:var(--pf-border-width)] bg-bg-subtle',
            'transition-[width] duration-[var(--pf-duration-base)] ease-[var(--pf-easing)]',
            collapsed ? 'w-16' : 'w-60',
          )}
        >
          <div className="sticky top-14">
            <Sidebar hasProject={Boolean(project)} collapsed={collapsed} />
          </div>
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileNavOpen ? (
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={kit.fade}
            >
              <button
                type="button"
                aria-label="Close navigation"
                className="absolute inset-0 bg-black/60"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.div
                variants={kit.rise}
                className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-bg-subtle"
              >
                <div className="flex h-14 items-center justify-between px-3">
                  <span className="text-sm font-medium text-ink">Navigate</span>
                  <IconButton
                    icon="close"
                    label="Close navigation"
                    size="sm"
                    onClick={() => setMobileNavOpen(false)}
                  />
                </div>
                <Sidebar
                  hasProject={Boolean(project)}
                  collapsed={false}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/*
           * Saved work is read from IndexedDB asynchronously. Rendering the
           * page before that resolves would flash an empty state at someone
           * who does have projects, so the shell waits.
           */}
          {!hydrated ? (
            <div className="mx-auto max-w-6xl">
              <span className="sr-only" role="status">
                Loading your work
              </span>
              <Skeleton className="h-8 w-56" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
                <Skeleton className="h-36" />
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={kit.page}
                className="mx-auto max-w-6xl"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  )
}
