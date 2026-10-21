import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { ThemeSwitcher } from '@/theme/components/ThemeSwitcher'
import { AutosaveIndicator } from './AutosaveIndicator'
import type { Comic } from '@/types/comic'
import type { Project } from '@/types/project'

export interface TopbarProps {
  project: Project | null
  comic: Comic | null
  onToggleSidebar: () => void
  onOpenMobileNav: () => void
}

/**
 * Application header.
 *
 * Its main job is answering "what am I editing right now?" at a glance, which
 * the brief calls out specifically. The project and comic are shown as a
 * breadcrumb rather than buried in a menu.
 */
export function Topbar({ project, comic, onToggleSidebar, onOpenMobileNav }: TopbarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line',
        'border-b-[length:var(--pf-border-width)] bg-bg/85 px-3 backdrop-blur-md sm:px-4',
      )}
    >
      {/* The responsive display class goes on a wrapper, not on the button.
          IconButton sets `inline-flex` itself, and with no tailwind-merge in
          the project both classes survive at equal specificity, so whichever
          Tailwind emits last wins -- which left both buttons visible on a
          phone, one of them toggling a sidebar that is not there. */}
      <span className="md:hidden">
        <IconButton
          icon="menu"
          label="Open navigation"
          size="sm"
          onClick={onOpenMobileNav}
        />
      </span>
      <span className="hidden md:block">
        <IconButton
          icon="menu"
          label="Toggle sidebar"
          size="sm"
          onClick={onToggleSidebar}
        />
      </span>

      <Link to="/" className="flex shrink-0 items-center gap-2 rounded-md">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-fg">
          <Icon name="book" size={16} />
        </span>
        <span className="hidden text-base font-semibold tracking-tight text-ink sm:inline">
          PanelForge
        </span>
      </Link>

      {/* Current context. Truncates rather than wrapping, to keep the bar one line. */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
        {project ? (
          <>
            <Icon name="chevronRight" size={14} className="shrink-0 text-ink-faint" />
            <Link
              to="/projects"
              className="truncate rounded-sm text-ink hover:underline"
              title={project.title}
            >
              {project.title}
            </Link>
            {comic ? (
              <>
                <Icon name="chevronRight" size={14} className="shrink-0 text-ink-faint" />
                <span className="truncate text-ink-muted" title={comic.title}>
                  {comic.title}
                </span>
              </>
            ) : null}
          </>
        ) : (
          <span className="truncate text-ink-faint">No project selected</span>
        )}
      </div>

      <AutosaveIndicator className="shrink-0" />
      <ThemeSwitcher className="shrink-0" />
    </header>
  )
}
