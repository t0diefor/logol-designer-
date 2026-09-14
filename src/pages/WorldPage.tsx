import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, type TabDefinition } from '@/components/ui/Tabs'
import { FactionsTab } from '@/features/worlds/components/FactionsTab'
import { LocationsTab } from '@/features/worlds/components/LocationsTab'
import { MapTab } from '@/features/worlds/components/MapTab'
import { ObjectsTab } from '@/features/worlds/components/ObjectsTab'
import { RelationshipGraph } from '@/features/worlds/components/RelationshipGraph'
import { SystemsTab } from '@/features/worlds/components/SystemsTab'
import { TimelineTab } from '@/features/worlds/components/TimelineTab'
import { useCurrentProject, useWorldCounts } from '@/stores/workspace-selectors'

type TabId = 'locations' | 'factions' | 'systems' | 'timeline' | 'objects' | 'map' | 'graph'

export function WorldPage() {
  const navigate = useNavigate()
  const project = useCurrentProject()
  const counts = useWorldCounts(project?.id ?? null)
  const [tab, setTab] = useState<TabId>('locations')

  const tabs = useMemo<TabDefinition[]>(
    () => [
      { id: 'locations', label: 'Locations', icon: 'globe', badge: counts.locations },
      { id: 'factions', label: 'Factions', icon: 'user', badge: counts.factions },
      { id: 'systems', label: 'Systems', icon: 'settings', badge: counts.systems },
      { id: 'timeline', label: 'Timeline', icon: 'book', badge: counts.events },
      { id: 'objects', label: 'Objects', icon: 'star', badge: counts.objects },
      { id: 'map', label: 'Map', icon: 'map' },
      { id: 'graph', label: 'Graph', icon: 'share' },
    ],
    [counts],
  )

  if (!project) {
    return (
      <>
        <PageHeader title="World" />
        <EmptyState
          icon="folder"
          title="No project selected"
          description="A world belongs to a project. Pick one first and its places, factions and history will appear here."
          action={
            <Button variant="primary" onClick={() => navigate('/projects')}>
              Choose a project
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="World"
        description={`The setting of ${project.title}: where it happens, who holds power, what the rules are and what already went wrong.`}
      />

      <Tabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)}>
        {tab === 'locations' ? <LocationsTab projectId={project.id} /> : null}
        {tab === 'factions' ? <FactionsTab projectId={project.id} /> : null}
        {tab === 'systems' ? <SystemsTab projectId={project.id} /> : null}
        {tab === 'timeline' ? <TimelineTab projectId={project.id} /> : null}
        {tab === 'objects' ? <ObjectsTab projectId={project.id} /> : null}
        {tab === 'map' ? <MapTab projectId={project.id} /> : null}
        {tab === 'graph' ? <RelationshipGraph projectId={project.id} /> : null}
      </Tabs>
    </>
  )
}
