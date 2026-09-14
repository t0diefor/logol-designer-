import { useLocation } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { NAV_ITEMS } from '@/app/navigation'

/**
 * Placeholder for areas scheduled in a later phase.
 *
 * It states plainly that the area is not built yet and lists what it will do.
 * The alternative -- shipping a screen of buttons that quietly do nothing --
 * is the thing the brief explicitly rules out, and it wastes the user's time
 * discovering which controls are real.
 */
const PLANNED: Record<string, { phase: number; items: string[] }> = {
  '/assets': {
    phase: 5,
    items: [
      'Grid and list views with search and filters',
      'Tags, collections and favourites',
      'Upload handling with local file metadata',
      'Usage tracking across pages and characters',
      'Placeholder assets before anything is uploaded',
    ],
  },
  '/composer': {
    phase: 6,
    items: [
      'Multi-page editing with thumbnails',
      'Page templates and custom panel grids',
      'Drag, resize, snapping and alignment guides',
      'Layer ordering, duplication and deletion',
      'Speech bubbles, thought bubbles, captions and SFX',
      'Keyboard shortcuts for undo, redo, duplicate and zoom',
    ],
  },
  '/export': {
    phase: 7,
    items: [
      'Current page or selected pages as PNG',
      'Whole comic as PDF',
      'Project data as JSON',
      'Character sheets and world reference documents',
      'Progress, cancellation and clear error states',
    ],
  },
}

export function RoadmapPage() {
  const { pathname } = useLocation()
  const navItem = NAV_ITEMS.find((item) => item.to === pathname)
  const plan = PLANNED[pathname]

  return (
    <>
      <PageHeader
        title={navItem?.label ?? 'Coming soon'}
        description={navItem?.description}
        actions={plan ? <Badge tone="primary">Phase {plan.phase}</Badge> : null}
      />

      <Card>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-warning">
            <Icon name="alert" size={20} title="Not yet built" />
          </span>
          <div>
            <h2 className="text-lg text-ink">This area is not built yet</h2>
            <p className="mt-1.5 text-sm leading-6 text-ink-muted">
              The navigation entry is here so the shape of the app is visible, but there are no
              working controls on this screen. It is scheduled for phase {plan?.phase ?? '?'}.
            </p>
          </div>
        </div>

        {plan ? (
          <>
            <h3 className="mt-6 text-sm font-medium text-ink">Planned for this area</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {plan.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
                  <span className="mt-1 text-ink-faint">
                    <Icon name="check" size={14} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>
    </>
  )
}
