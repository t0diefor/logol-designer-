import { motion } from 'motion/react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { formatRelativeTime } from '@/lib/format'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { PROJECT_STATUS_LABELS, type Project } from '@/types/project'

const STATUS_TONE = {
  planning: 'neutral',
  drafting: 'primary',
  art: 'accent',
  complete: 'success',
  archived: 'neutral',
} as const

export interface ProjectCardProps {
  project: Project
  active: boolean
  onOpen: (project: Project) => void
  onDuplicate: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectCard({
  project,
  active,
  onOpen,
  onDuplicate,
  onDelete,
}: ProjectCardProps) {
  const kit = useMotionKit()

  return (
    <motion.div variants={kit.item}>
      <Card
        interactive
        className={active ? 'border-primary' : undefined}
        // The whole card is clickable for pointer users; the title below is a
        // real button so keyboard users get one clear, labelled target rather
        // than a focusable div.
        onClick={() => onOpen(project)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onOpen(project)
              }}
              className="block max-w-full truncate rounded-sm text-left text-xl text-ink hover:underline"
            >
              {project.title}
            </button>

            {project.logline ? (
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-ink-muted">
                {project.logline}
              </p>
            ) : (
              <p className="mt-1.5 text-sm italic text-ink-faint">No logline yet</p>
            )}
          </div>

          <div
            className="flex shrink-0 gap-1"
            // Stops the card's own click handler firing when using these.
            onClick={(event) => event.stopPropagation()}
          >
            <IconButton
              icon="copy"
              label={`Duplicate ${project.title}`}
              size="sm"
              onClick={() => onDuplicate(project)}
            />
            <IconButton
              icon="trash"
              label={`Delete ${project.title}`}
              size="sm"
              variant="danger"
              onClick={() => onDelete(project)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[project.status]}>{PROJECT_STATUS_LABELS[project.status]}</Badge>
          {project.genre ? <Badge>{project.genre}</Badge> : null}
          {active ? <Badge tone="primary">Current</Badge> : null}
          <span className="ml-auto text-xs text-ink-faint">
            Updated {formatRelativeTime(project.updatedAt)}
          </span>
        </div>
      </Card>
    </motion.div>
  )
}
