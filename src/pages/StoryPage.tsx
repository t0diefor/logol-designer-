import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Input'
import { Tabs, type TabDefinition } from '@/components/ui/Tabs'
import { RepetitionPanel } from '@/features/stories/components/RepetitionPanel'
import { SceneEditor } from '@/features/stories/components/SceneEditor'
import { StorySearch } from '@/features/stories/components/StorySearch'
import { TextField } from '@/features/characters/components/sections/section-kit'
import { cn } from '@/lib/cn'
import {
  sceneProse,
  useCharactersForProject,
  useCurrentProject,
  useLocationsForProject,
  useScenesForStory,
  useStoriesForProject,
  useStoryWordCount,
} from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Scene } from '@/types/story'

type TabId = 'outline' | 'scenes' | 'search'

const STATUS_TONE: Record<Scene['status'], 'neutral' | 'primary' | 'success'> = {
  idea: 'neutral',
  outlined: 'neutral',
  drafted: 'primary',
  revised: 'primary',
  final: 'success',
}

export function StoryPage() {
  const navigate = useNavigate()
  const project = useCurrentProject()

  const stories = useStoriesForProject(project?.id ?? null)
  const cast = useCharactersForProject(project?.id ?? null)
  const locations = useLocationsForProject(project?.id ?? null)

  const createStory = useWorkspaceStore((state) => state.createStory)
  const updateStory = useWorkspaceStore((state) => state.updateStory)
  const deleteStory = useWorkspaceStore((state) => state.deleteStory)
  const createScene = useWorkspaceStore((state) => state.createScene)
  const deleteScene = useWorkspaceStore((state) => state.deleteScene)
  const moveScene = useWorkspaceStore((state) => state.moveScene)

  const [storyId, setStoryId] = useState<string | null>(stories[0]?.id ?? null)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('outline')
  const [pendingDeleteStory, setPendingDeleteStory] = useState(false)
  const [pendingDeleteScene, setPendingDeleteScene] = useState<Scene | null>(null)

  const story = stories.find((candidate) => candidate.id === storyId) ?? stories[0] ?? null
  const scenes = useScenesForStory(story?.id ?? null)
  const wordCount = useStoryWordCount(story?.id ?? null)

  const scene = scenes.find((candidate) => candidate.id === sceneId) ?? null

  const tabs = useMemo<TabDefinition[]>(
    () => [
      { id: 'outline', label: 'Outline', icon: 'book' },
      { id: 'scenes', label: 'Scenes', icon: 'pen', badge: scenes.length },
      { id: 'search', label: 'Search', icon: 'search' },
    ],
    [scenes.length],
  )

  if (!project) {
    return (
      <>
        <PageHeader title="Story" />
        <EmptyState
          icon="folder"
          title="No project selected"
          description="A story belongs to a project. Pick one first and its scripts will appear here."
          action={
            <Button variant="primary" onClick={() => navigate('/projects')}>
              Choose a project
            </Button>
          }
        />
      </>
    )
  }

  if (!story) {
    return (
      <>
        <PageHeader
          title="Story"
          description={`Scripts for ${project.title}: outlines, scenes, beats and dialogue.`}
        />
        <EmptyState
          icon="pen"
          title="No story yet"
          description="A story holds one script: its premise, its scenes, and the beats and dialogue inside them. Everything you write here is searchable and counted as you go."
          action={
            <Button
              variant="primary"
              icon="plus"
              onClick={() => {
                const created = createStory(project.id, 'Episode one')
                setStoryId(created.id)
              }}
            >
              Start a story
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Story"
        description={`Scripts for ${project.title}.`}
        actions={
          <>
            {stories.length > 1 ? (
              <Select
                aria-label="Choose a story"
                value={story.id}
                onChange={(event) => {
                  setStoryId(event.target.value)
                  setSceneId(null)
                }}
                fullWidth={false}
              >
                {stories.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </option>
                ))}
              </Select>
            ) : null}
            <Button
              icon="plus"
              onClick={() => {
                const created = createStory(project.id, `Episode ${stories.length + 1}`)
                setStoryId(created.id)
                setSceneId(null)
              }}
            >
              New story
            </Button>
          </>
        }
      />

      <Tabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)}>
        {tab === 'outline' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <Card>
              <div className="grid gap-5">
                <TextField
                  label="Title"
                  value={story.title}
                  onChange={(title) => updateStory(story.id, { title })}
                />
                <TextField
                  label="Logline"
                  hint="One sentence. If it takes two, the story may not be one story yet."
                  value={story.logline}
                  onChange={(logline) => updateStory(story.id, { logline })}
                  multiline
                  rows={2}
                />
                <TextField
                  label="Theme"
                  hint="What the story is arguing, not what happens in it."
                  value={story.theme}
                  onChange={(theme) => updateStory(story.id, { theme })}
                  multiline
                  rows={2}
                />
                <TextField
                  label="Premise"
                  value={story.premise}
                  onChange={(premise) => updateStory(story.id, { premise })}
                  multiline
                  rows={5}
                />
                <TextField
                  label="Outline"
                  hint="The shape of the whole thing, before it is broken into scenes."
                  value={story.outline}
                  onChange={(outline) => updateStory(story.id, { outline })}
                  multiline
                  rows={10}
                />
              </div>

              <div className="mt-6 flex border-t border-line pt-4">
                <Button
                  variant="danger"
                  icon="trash"
                  className="ml-auto"
                  onClick={() => setPendingDeleteStory(true)}
                >
                  Delete story
                </Button>
              </div>
            </Card>

            <aside className="lg:sticky lg:top-20 lg:self-start">
              <Card>
                <h3 className="text-sm font-medium text-ink">Story totals</h3>
                <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                  <dt className="text-ink-muted">Words</dt>
                  <dd className="text-ink tabular-nums">{wordCount}</dd>
                  <dt className="text-ink-muted">Scenes</dt>
                  <dd className="text-ink tabular-nums">{scenes.length}</dd>
                  <dt className="text-ink-muted">Final</dt>
                  <dd className="text-ink tabular-nums">
                    {scenes.filter((s) => s.status === 'final').length}
                  </dd>
                </dl>
                <p className="mt-3 text-xs leading-5 text-ink-faint">
                  Counts cover the premise, outline and everything written inside each scene.
                </p>
              </Card>
            </aside>
          </div>
        ) : null}

        {tab === 'scenes' ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)]">
            <div className={cn('flex flex-col gap-3', scene && 'hidden lg:flex')}>
              <Button
                icon="plus"
                fullWidth
                onClick={() => {
                  const created = createScene(story.id, `Scene ${scenes.length + 1}`)
                  setSceneId(created.id)
                }}
              >
                Add scene
              </Button>

              {scenes.length === 0 ? (
                <p className="px-1 py-3 text-sm text-ink-faint">
                  No scenes yet. A scene is the unit you will turn into pages.
                </p>
              ) : (
                <ol className="flex flex-col gap-0.5">
                  {scenes.map((candidate, index) => {
                    const active = candidate.id === sceneId
                    return (
                      <li key={candidate.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSceneId(candidate.id)}
                          aria-current={active ? 'true' : undefined}
                          className={cn(
                            'min-w-0 flex-1 rounded-md px-3 py-2 text-left',
                            'transition-colors duration-[var(--pf-duration-fast)]',
                            active
                              ? 'bg-primary text-primary-fg'
                              : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
                          )}
                        >
                          <span className="block truncate text-sm font-medium">
                            {index + 1}. {candidate.title || 'Untitled scene'}
                          </span>
                          <span
                            className={cn(
                              'block truncate text-xs',
                              active ? 'opacity-80' : 'text-ink-faint',
                            )}
                          >
                            {candidate.status}
                            {candidate.lines.length > 0 ? ` · ${candidate.lines.length} lines` : ''}
                          </span>
                        </button>
                        <div className="flex shrink-0 flex-col">
                          <IconButton
                            icon="chevronUp"
                            label={`Move scene ${index + 1} up`}
                            size="sm"
                            disabled={index === 0}
                            onClick={() => moveScene(candidate.id, 'up')}
                          />
                          <IconButton
                            icon="chevronDown"
                            label={`Move scene ${index + 1} down`}
                            size="sm"
                            disabled={index === scenes.length - 1}
                            onClick={() => moveScene(candidate.id, 'down')}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>

            <div className="min-w-0">
              {scene ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSceneId(null)}
                      className="rounded-sm text-sm text-ink-muted hover:text-ink lg:hidden"
                    >
                      &larr; Back to scenes
                    </button>
                    <Badge tone={STATUS_TONE[scene.status]}>{scene.status}</Badge>
                    <IconButton
                      icon="trash"
                      label={`Delete scene ${scene.title}`}
                      size="sm"
                      variant="danger"
                      className="ml-auto"
                      onClick={() => setPendingDeleteScene(scene)}
                    />
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="min-w-0">
                      <SceneEditor scene={scene} cast={cast} locations={locations} />
                    </div>
                    <aside className="xl:sticky xl:top-20 xl:self-start">
                      <Card>
                        <RepetitionPanel text={sceneProse(scene)} />
                      </Card>
                    </aside>
                  </div>
                </>
              ) : (
                <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-line px-6 py-10 text-center">
                  <p className="text-sm text-ink-muted">
                    Select a scene to edit it, or add one.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {tab === 'search' ? (
          <StorySearch
            scenes={scenes}
            onOpenScene={(id) => {
              setSceneId(id)
              setTab('scenes')
            }}
          />
        ) : null}
      </Tabs>

      <ConfirmDialog
        open={pendingDeleteStory}
        title="Delete this story?"
        description={`"${story.title}" and all ${scenes.length} of its scenes will be removed. This cannot be undone.`}
        confirmLabel="Delete story"
        destructive
        onCancel={() => setPendingDeleteStory(false)}
        onConfirm={() => {
          deleteStory(story.id)
          setStoryId(null)
          setSceneId(null)
          setPendingDeleteStory(false)
        }}
      />

      <ConfirmDialog
        open={pendingDeleteScene !== null}
        title="Delete this scene?"
        description={
          pendingDeleteScene
            ? `"${pendingDeleteScene.title || 'Untitled scene'}", its beats and its script lines will be removed. The scenes after it are renumbered.`
            : ''
        }
        confirmLabel="Delete scene"
        destructive
        onCancel={() => setPendingDeleteScene(null)}
        onConfirm={() => {
          if (pendingDeleteScene) {
            deleteScene(pendingDeleteScene.id)
            if (sceneId === pendingDeleteScene.id) setSceneId(null)
          }
          setPendingDeleteScene(null)
        }}
      />
    </>
  )
}
