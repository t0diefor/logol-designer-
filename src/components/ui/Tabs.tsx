import { useCallback, useId, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Icon, type IconName } from './Icon'

export interface TabDefinition {
  id: string
  label: string
  icon?: IconName
  /** Optional count or status shown after the label, e.g. number of outfits. */
  badge?: string | number
}

export interface TabsProps {
  tabs: TabDefinition[]
  activeId: string
  onChange: (id: string) => void
  children: ReactNode
  className?: string
}

/**
 * Tablist following the WAI-ARIA authoring practice.
 *
 * The keyboard behaviour is the reason this is a component rather than a row
 * of buttons: arrow keys move between tabs, Home and End jump to the ends, and
 * only the active tab is in the tab order, so Tab moves *out* of the tablist
 * into the panel rather than walking through every tab. Hand-rolling that at
 * each call site is where it gets dropped.
 */
export function Tabs({ tabs, activeId, onChange, children, className }: TabsProps) {
  const baseId = useId()
  const listRef = useRef<HTMLDivElement>(null)

  const focusTab = useCallback((index: number) => {
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[index]?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = tabs.findIndex((tab) => tab.id === activeId)
      if (currentIndex === -1) return

      let nextIndex: number | null = null
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
      if (event.key === 'Home') nextIndex = 0
      if (event.key === 'End') nextIndex = tabs.length - 1

      if (nextIndex === null) return
      event.preventDefault()
      onChange(tabs[nextIndex]!.id)
      focusTab(nextIndex)
    },
    [activeId, focusTab, onChange, tabs],
  )

  return (
    <div className={className}>
      <div
        ref={listRef}
        role="tablist"
        aria-label="Character sections"
        onKeyDown={handleKeyDown}
        className="pf-scroll flex gap-1 overflow-x-auto border-b border-line pb-px"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              // Roving tabindex: only the selected tab is reachable with Tab.
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-t-md px-3.5 py-2.5 text-sm whitespace-nowrap',
                'border-b-2 transition-colors duration-[var(--pf-duration-fast)]',
                selected
                  ? 'border-primary text-ink font-medium'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-raised',
              )}
            >
              {tab.icon ? <Icon name={tab.icon} size={15} /> : null}
              {tab.label}
              {tab.badge !== undefined && tab.badge !== 0 ? (
                <span className="rounded-pill bg-bg-inset px-1.5 py-0.5 text-[10px] text-ink-faint">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeId}`}
        aria-labelledby={`${baseId}-tab-${activeId}`}
        tabIndex={0}
        className="pt-6 focus-visible:outline-none"
      >
        {children}
      </div>
    </div>
  )
}
