import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput, Select } from '@/components/ui/Input'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { CreateProjectDialog } from '@/features/projects/components/CreateProjectDialog'
import { ProjectCard } from '@/features/projects/components/ProjectCard'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { useProjectsByRecency } from '@/stores/workspace-selectors'
import { PROJECT_STATUS_LABELS, type Project } from '@/types/project'

export function ProjectsPage() {
  const navigate = useNavigate()
  const kit = useMotionKit()

  const projects = useProjectsByRecency()
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId)
  const createProject = useWorkspaceStore((state) => state.createProject)
  const duplicateProject = useWorkspaceStore((state) => state.duplicateProject)
  const deleteProject = useWorkspaceStore((state) => state.deleteProject)
  const setCurrentProject = useWorkspaceStore((state) => state.setCurrentProject)

  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'all'>('all')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return projects.filter((project) => {
      if (statusFilter !== 'all' && project.status !== statusFilter) return false
      if (!needle) return true
      return (
        project.title.toLowerCase().includes(needle) ||
        project.logline.toLowerCase().includes(needle) ||
        project.genre.toLowerCase().includes(needle)
      )
    })
  }, [projects, query, statusFilter])

  function handleOpen(project: Project) {
    setCurrentProject(project.id)
    navigate('/')
  }

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each project is one story world. Open a project to unlock the character, world, story and composer tools."
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
            New project
          </Button>
        }
      />

      {projects.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="min-w-56 flex-1">
            <SearchInput
              label="Search projects"
              placeholder="Search by title, logline or genre"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as Project['status'] | 'all')
            }
            className="w-auto"
          >
            <option value="all">All statuses</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {projects.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No projects yet"
          description="A project is the container for one comic world: its cast, locations, scripts, pages and assets. Create one to get started -- nothing is uploaded anywhere, it is saved in this browser."
          action={
            <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
              Create your first project
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching projects"
          description="No project matches that search and filter combination. Try a different term, or clear the status filter."
          action={
            <Button
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={kit.stagger}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              active={project.id === currentProjectId}
              onOpen={handleOpen}
              onDuplicate={(target) => duplicateProject(target.id)}
              onDelete={setPendingDelete}
            />
          ))}
        </motion.div>
      )}

      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(draft) => {
          createProject(draft)
          setCreateOpen(false)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this project?"
        description={
          pendingDelete
            ? `"${pendingDelete.title}" and every comic inside it will be removed from this browser. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete project"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteProject(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}
