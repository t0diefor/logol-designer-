import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { formatRelativeTime } from '@/lib/format'
import { CURRENT_PHASE, NAV_ITEMS } from '@/app/navigation'
import { useWorkspaceStore } from '@/stores/workspace-store'
import {
  useComicsForProject,
  useCurrentProject,
  useProjectsByRecency,
} from '@/stores/workspace-selectors'
import { loadSampleProject } from '@/features/onboarding/sample-project'

/** One tile of the bento grid. `span` controls how much of the 4-column grid it takes. */
function BentoTile({
  to,
  icon,
  title,
  description,
  badge,
  span = 1,
  disabled = false,
}: {
  to: string
  icon: Parameters<typeof Icon>[0]['name']
  title: string
  description: string
  badge?: string
  span?: 1 | 2
  disabled?: boolean
}) {
  const kit = useMotionKit()

  const body = (
    <Card
      interactive={!disabled}
      className={disabled ? 'h-full opacity-60' : 'h-full'}
      surface={span === 2 ? 'raised' : 'default'}
    >
      <div className="flex h-full flex-col">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-bg-inset text-ink-muted">
            <Icon name={icon} size={18} />
          </span>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        <h3 className="text-lg text-ink">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-ink-muted">{description}</p>
      </div>
    </Card>
  )

  return (
    <motion.div variants={kit.item} className={span === 2 ? 'sm:col-span-2' : undefined}>
      {disabled ? (
        <div title="Select a project first" className="h-full cursor-not-allowed">
          {body}
        </div>
      ) : (
        <Link to={to} className="block h-full rounded-lg">
          {body}
        </Link>
      )}
    </motion.div>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const kit = useMotionKit()

  const projects = useProjectsByRecency()
  const project = useCurrentProject()
  const comics = useComicsForProject(project?.id ?? null)
  const setCurrentProject = useWorkspaceStore((state) => state.setCurrentProject)

  if (projects.length === 0) {
    return (
      <>
        <PageHeader
          title="Welcome to PanelForge"
          description="Plan, write, design and export comic books. Everything is saved in this browser -- no account needed."
        />
        <EmptyState
          icon="book"
          title="Start with a project"
          description="A project holds one story world: its comics, cast, locations, scripts and artwork. Create one and the rest of the workspace opens up — or load the sample to look around something already filled in."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon="plus" onClick={() => navigate('/projects')}>
                Create a project
              </Button>
              <Button
                icon="book"
                onClick={() => {
                  loadSampleProject(useWorkspaceStore.getState)
                }}
              >
                Load the sample project
              </Button>
            </div>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={project ? project.title : 'Dashboard'}
        description={
          project
            ? project.logline || 'No logline yet. Add one from the project settings.'
            : 'Select a project to scope the workspace to it.'
        }
        actions={
          <Button icon="folder" onClick={() => navigate('/projects')}>
            All projects
          </Button>
        }
      />

      {!project ? (
        <Card className="mb-7">
          <h2 className="text-lg text-ink">Pick up where you left off</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Choose a project to work in. The navigation unlocks once one is selected.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {projects.slice(0, 5).map((item) => (
              <Button key={item.id} onClick={() => setCurrentProject(item.id)}>
                {item.title}
              </Button>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="mb-7" surface="glass">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-ink-faint">Current project</p>
              <p className="mt-1 text-xl text-ink">{project.title}</p>
              <p className="mt-1 text-xs text-ink-muted">
                Updated {formatRelativeTime(project.updatedAt)} &middot;{' '}
                {comics.length === 0
                  ? 'no comics yet'
                  : `${comics.length} comic${comics.length === 1 ? '' : 's'}`}
              </p>
            </div>
            <Button onClick={() => setCurrentProject(null)}>Switch project</Button>
          </div>
        </Card>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={kit.stagger}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {NAV_ITEMS.filter((item) => item.to !== '/' && item.to !== '/settings').map((item) => (
          <BentoTile
            key={item.to}
            to={item.to}
            icon={item.icon}
            title={item.label}
            description={item.description}
            badge={item.phase > CURRENT_PHASE ? `Phase ${item.phase}` : undefined}
            span={item.to === '/composer' ? 2 : 1}
            disabled={item.requiresProject && !project}
          />
        ))}
      </motion.div>
    </>
  )
}
