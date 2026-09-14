import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'
import { NAV_ITEMS, CURRENT_PHASE } from '@/app/navigation'

export interface SidebarProps {
  /** True when a project is selected; gates project-scoped destinations. */
  hasProject: boolean
  collapsed: boolean
  /** Called after navigating, so the mobile drawer can close itself. */
  onNavigate?: () => void
}

export function Sidebar({ hasProject, collapsed, onNavigate }: SidebarProps) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const locked = item.requiresProject && !hasProject
        const unbuilt = item.phase > CURRENT_PHASE

        // Destinations that need a project are rendered as disabled buttons
        // rather than links, so they cannot be reached by keyboard either.
        if (locked) {
          return (
            <button
              key={item.to}
              type="button"
              disabled
              title="Select or create a project first"
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm',
                'cursor-not-allowed text-ink-faint opacity-60',
                collapsed && 'justify-center px-0',
              )}
            >
              <Icon name={item.icon} size={18} />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </button>
          )
        }

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            title={collapsed ? item.label : item.description}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm',
                'transition-colors duration-[var(--pf-duration-fast)]',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-primary text-primary-fg font-medium'
                  : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
              )
            }
          >
            <Icon name={item.icon} size={18} />
            {!collapsed ? (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {/* Honest labelling: these routes render a roadmap placeholder. */}
                {unbuilt ? (
                  <span className="rounded-pill bg-bg-inset px-1.5 py-0.5 text-[10px] font-medium text-ink-faint">
                    P{item.phase}
                  </span>
                ) : null}
              </>
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )
}
