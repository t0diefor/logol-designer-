import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Input'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { PageCanvas } from '@/features/composer/components/PageCanvas'
import { PanelInspector } from '@/features/composer/components/PanelInspector'
import { PageSvg } from '@/features/composer/render/PageRenderer'
import { useComposerHistory } from '@/features/composer/history'
import { defaultPanelRect, layoutTemplate, PAGE_TEMPLATES } from '@/features/composer/templates'
import { useProjectAssetUrls } from '@/features/composer/use-image-urls'
import { cn } from '@/lib/cn'
import {
  useAssetsForProject,
  useCharactersForProject,
  useComicsForProject,
  useCurrentProject,
  useEpisodesForComic,
  usePagesForEpisode,
} from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { PAGE_PRESETS, type Balloon, type Page } from '@/types/comic'
import type { Rect } from '@/types/common'

const ZOOM_STEPS = [0.4, 0.6, 0.8, 1, 1.25, 1.5]

export function ComposerPage() {
  const navigate = useNavigate()
  const project = useCurrentProject()

  const comics = useComicsForProject(project?.id ?? null)
  const comic = comics[0] ?? null
  const episodes = useEpisodesForComic(comic?.id ?? null)
  const episode = episodes[0] ?? null
  const pages = usePagesForEpisode(episode?.id ?? null)

  const assets = useAssetsForProject(project?.id ?? null)
  const cast = useCharactersForProject(project?.id ?? null)
  const imageUrls = useProjectAssetUrls(assets)

  const store = useWorkspaceStore
  const createComic = useWorkspaceStore((state) => state.createComic)
  const createEpisode = useWorkspaceStore((state) => state.createEpisode)
  const createPage = useWorkspaceStore((state) => state.createPage)
  const updatePage = useWorkspaceStore((state) => state.updatePage)
  const replacePage = useWorkspaceStore((state) => state.replacePage)
  const deletePage = useWorkspaceStore((state) => state.deletePage)
  const movePage = useWorkspaceStore((state) => state.movePage)
  const duplicatePage = useWorkspaceStore((state) => state.duplicatePage)

  const history = useComposerHistory()

  const [pageId, setPageId] = useState<string | null>(null)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [pendingDeletePage, setPendingDeletePage] = useState<Page | null>(null)

  const page = pages.find((candidate) => candidate.id === pageId) ?? pages[0] ?? null
  const selectedPanel = page?.panels.find((panel) => panel.id === selectedPanelId) ?? null

  /**
   * Every mutation goes through here, so the snapshot is always taken against
   * the state immediately before the change. Scattering `record()` calls would
   * eventually miss one, and a missing snapshot is an un-undoable action.
   */
  const commit = useCallback(
    (change: () => void) => {
      const current = page ? store.getState().pages[page.id] : null
      if (current) history.record(current)
      change()
    },
    [page, history, store],
  )

  const undo = useCallback(() => {
    if (!page) return
    const current = store.getState().pages[page.id]
    if (!current) return
    const previous = history.undo(page.id, current)
    if (previous) replacePage(previous)
  }, [page, history, replacePage, store])

  const redo = useCallback(() => {
    if (!page) return
    const current = store.getState().pages[page.id]
    if (!current) return
    const next = history.redo(page.id, current)
    if (next) replacePage(next)
  }, [page, history, replacePage, store])

  /** Creates the comic, episode and first page in one step. */
  function startBook() {
    if (!project) return
    const newComic = comic ?? createComic(project.id, project.title)
    const newEpisode = episode ?? createEpisode(newComic.id, 'Episode one')
    const created = createPage(newEpisode.id)
    setPageId(created.id)
  }

  const addPanel = useCallback(() => {
    if (!page) return
    commit(() => {
      const panel = store.getState().addPanel(page.id, defaultPanelRect(page))
      if (panel) setSelectedPanelId(panel.id)
    })
  }, [page, commit, store])

  const applyTemplate = useCallback(
    (templateId: string) => {
      if (!page) return
      const template = PAGE_TEMPLATES.find((candidate) => candidate.id === templateId)
      if (!template) return

      commit(() => {
        const state = store.getState()
        // Replacing, not appending: a template describes the whole page.
        for (const panel of [...page.panels]) state.deletePanel(page.id, panel.id)
        for (const rect of layoutTemplate(template, page)) state.addPanel(page.id, rect)
        state.updatePage(page.id, { templateId })
      })
      setSelectedPanelId(null)
    },
    [page, commit, store],
  )

  /* ---------------- Keyboard shortcuts ---------------- */

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      // Never hijack keys while someone is typing into a field.
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (target?.isContentEditable) return

      const meta = event.metaKey || event.ctrlKey

      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (meta && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      // Save is continuous, but the shortcut is muscle memory, so it is
      // accepted and acknowledged rather than left to trigger the browser's
      // save dialog.
      if (meta && event.key.toLowerCase() === 's') {
        event.preventDefault()
        return
      }
      if (meta && event.key.toLowerCase() === 'd' && selectedPanel && page) {
        event.preventDefault()
        commit(() => {
          const copy = store.getState().duplicatePanel(page.id, selectedPanel.id)
          if (copy) setSelectedPanelId(copy.id)
        })
        return
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedPanel && page) {
        event.preventDefault()
        commit(() => store.getState().deletePanel(page.id, selectedPanel.id))
        setSelectedPanelId(null)
        return
      }
      if (event.key === 'Escape') {
        setSelectedPanelId(null)
        return
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setZoom((z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? z)
        return
      }
      if (event.key === '-') {
        event.preventDefault()
        setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? z)
        return
      }
      // Tab cycles panels, which is how you move between them without a mouse.
      if (event.key === 'Tab' && page && page.panels.length > 0) {
        event.preventDefault()
        const ordered = [...page.panels].sort((a, b) => a.z - b.z)
        const index = ordered.findIndex((panel) => panel.id === selectedPanelId)
        const next = event.shiftKey
          ? ordered[(index - 1 + ordered.length) % ordered.length]
          : ordered[(index + 1) % ordered.length]
        setSelectedPanelId(next?.id ?? null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [page, selectedPanel, selectedPanelId, commit, undo, redo, store])

  const templateSummary = useMemo(
    () => PAGE_TEMPLATES.find((template) => template.id === page?.templateId)?.name,
    [page?.templateId],
  )

  if (!project) {
    return (
      <>
        <PageHeader title="Composer" />
        <EmptyState
          icon="folder"
          title="No project selected"
          description="Pages belong to a project. Pick one first."
          action={<Button variant="primary" onClick={() => navigate('/projects')}>Choose a project</Button>}
        />
      </>
    )
  }

  if (!page) {
    return (
      <>
        <PageHeader
          title="Composer"
          description={`Lay out the pages of ${project.title}.`}
        />
        <EmptyState
          icon="layout"
          title="No pages yet"
          description="A page is a document, not a drawing: every panel, balloon and image stays editable, and the export in phase 7 renders from exactly what you see here."
          action={
            <Button variant="primary" icon="plus" onClick={startBook}>
              Create the first page
            </Button>
          }
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Composer"
        description={`Page ${page.index} of ${pages.length}${templateSummary ? ` · ${templateSummary}` : ''}`}
        actions={
          <>
            <Button
              size="sm"
              icon="undo"
              disabled={!history.canUndo(page.id)}
              onClick={undo}
            >
              Undo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!history.canRedo(page.id)}
              onClick={redo}
            >
              Redo
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[150px_minmax(0,1fr)_300px]">
        {/* ---- Page rail ---- */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            icon="plus"
            fullWidth
            onClick={() => {
              if (!episode) return
              const created = createPage(episode.id)
              setPageId(created.id)
              setSelectedPanelId(null)
            }}
          >
            Add page
          </Button>

          <ul className="flex gap-2 overflow-x-auto xl:flex-col xl:overflow-visible">
            {pages.map((candidate) => (
              <li key={candidate.id} className="shrink-0 xl:shrink">
                <button
                  type="button"
                  onClick={() => {
                    setPageId(candidate.id)
                    setSelectedPanelId(null)
                  }}
                  aria-current={candidate.id === page.id ? 'true' : undefined}
                  aria-label={`Page ${candidate.index}`}
                  className={cn(
                    'block w-24 overflow-hidden rounded-md border xl:w-full',
                    'border-[length:var(--pf-border-width)]',
                    candidate.id === page.id
                      ? 'border-primary'
                      : 'border-line hover:border-line-strong',
                  )}
                >
                  <span className="block bg-page">
                    <PageSvg page={candidate} imageUrls={imageUrls} className="h-auto w-full" />
                  </span>
                  <span className="block py-1 text-center text-[11px] text-ink-muted">
                    {candidate.index}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {pages.length > 1 ? (
            <div className="flex gap-1">
              <IconButton
                icon="chevronUp"
                label="Move page earlier"
                size="sm"
                disabled={page.index === 1}
                onClick={() => movePage(page.id, 'up')}
              />
              <IconButton
                icon="chevronDown"
                label="Move page later"
                size="sm"
                disabled={page.index === pages.length}
                onClick={() => movePage(page.id, 'down')}
              />
            </div>
          ) : null}

          <div className="flex gap-1">
            <IconButton
              icon="copy"
              label="Duplicate page"
              size="sm"
              onClick={() => {
                const copy = duplicatePage(page.id)
                if (copy) setPageId(copy.id)
              }}
            />
            <IconButton
              icon="trash"
              label="Delete page"
              size="sm"
              variant="danger"
              onClick={() => setPendingDeletePage(page)}
            />
          </div>
        </div>

        {/* ---- Canvas ---- */}
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button size="sm" icon="plus" onClick={addPanel}>
              Add panel
            </Button>

            <Select
              aria-label="Apply a page template"
              value=""
              onChange={(event) => {
                if (event.target.value) applyTemplate(event.target.value)
              }}
              fullWidth={false}
              className="h-8 text-xs"
            >
              <option value="">Apply template&hellip;</option>
              {PAGE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} — {template.description}
                </option>
              ))}
            </Select>

            <Select
              aria-label="Page size"
              value={page.size.label}
              onChange={(event) => {
                const preset = PAGE_PRESETS.find((p) => p.label === event.target.value)
                if (preset) commit(() => updatePage(page.id, { size: preset }))
              }}
              fullWidth={false}
              className="h-8 text-xs"
            >
              {PAGE_PRESETS.map((preset) => (
                <option key={preset.label} value={preset.label}>
                  {preset.label}
                </option>
              ))}
            </Select>

            <label className="flex items-center gap-1.5 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(event) => setSnapToGrid(event.target.checked)}
                className="accent-[var(--pf-primary)]"
              />
              Snap
            </label>

            <div className="ml-auto flex items-center gap-1">
              <IconButton
                icon="close"
                label="Zoom out"
                size="sm"
                onClick={() =>
                  setZoom((z) => ZOOM_STEPS[Math.max(0, ZOOM_STEPS.indexOf(z) - 1)] ?? z)
                }
              />
              <span className="w-12 text-center text-xs text-ink-muted tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <IconButton
                icon="plus"
                label="Zoom in"
                size="sm"
                onClick={() =>
                  setZoom(
                    (z) => ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, ZOOM_STEPS.indexOf(z) + 1)] ?? z,
                  )
                }
              />
            </div>
          </div>

          <div className="overflow-auto rounded-lg border border-line bg-bg-inset p-4 border-[length:var(--pf-border-width)]">
            <div style={{ width: `${zoom * 100}%`, margin: '0 auto' }}>
              <PageCanvas
                page={page}
                imageUrls={imageUrls}
                selectedPanelId={selectedPanelId}
                onSelect={setSelectedPanelId}
                onCommit={(panelId, rect: Rect) =>
                  commit(() => store.getState().updatePanel(page.id, panelId, { rect }))
                }
                zoom={zoom}
                snapToGrid={snapToGrid}
                gridSize={6}
              />
            </div>
          </div>

          <p className="mt-2 text-xs text-ink-faint">
            Tab cycles panels · Delete removes one · Ctrl/Cmd+D duplicates · Ctrl/Cmd+Z undoes ·
            + and − zoom
          </p>
        </div>

        {/* ---- Inspector ---- */}
        <aside className="xl:sticky xl:top-20 xl:self-start">
          <Card>
            {selectedPanel ? (
              <PanelInspector
                page={page}
                panel={selectedPanel}
                assets={assets}
                cast={cast}
                onPanelChange={(changes) =>
                  commit(() => store.getState().updatePanel(page.id, selectedPanel.id, changes))
                }
                onBalloonAdd={(kind) =>
                  commit(() => {
                    const rect = selectedPanel.rect
                    const width = Math.min(140, rect.width * 0.6)
                    const height = kind === 'sfx' ? 40 : 60

                    // Every balloon used to be dropped at the same spot, so a
                    // second one landed exactly on the first and both became
                    // unreadable. Stack below whatever is already in the
                    // panel, stopping at the bottom edge rather than spilling
                    // outside it.
                    const lowest = selectedPanel.balloons.reduce(
                      (bottom, existing) => Math.max(bottom, existing.rect.y + existing.rect.height),
                      rect.y + 8,
                    )
                    const y = Math.min(
                      lowest + 8,
                      Math.max(rect.y + 8, rect.y + rect.height - height - 8),
                    )

                    const balloon: Omit<Balloon, 'id' | 'z'> = {
                      kind,
                      text: kind === 'sfx' ? 'TSSK' : '',
                      rect: {
                        x: rect.x + rect.width / 2 - width / 2,
                        y,
                        width,
                        height,
                      },
                      speakerId: null,
                      tailX: 0,
                      tailY: kind === 'speech' || kind === 'thought' ? 60 : 0,
                      fontSize: kind === 'sfx' ? 28 : 13,
                      align: 'center',
                    }
                    store.getState().addBalloon(page.id, selectedPanel.id, balloon)
                  })
                }
                onBalloonChange={(balloonId, changes) =>
                  commit(() =>
                    store.getState().updateBalloon(page.id, selectedPanel.id, balloonId, changes),
                  )
                }
                onBalloonDelete={(balloonId) =>
                  commit(() => store.getState().deleteBalloon(page.id, selectedPanel.id, balloonId))
                }
                onPlacementAdd={(assetId) =>
                  commit(() =>
                    store.getState().addPlacement(page.id, selectedPanel.id, {
                      kind: 'asset',
                      refId: assetId,
                      rect: { ...selectedPanel.rect },
                      rotation: 0,
                      flipX: false,
                      opacity: 1,
                      variant: '',
                    }),
                  )
                }
                onPlacementChange={(placementId, changes) =>
                  commit(() =>
                    store
                      .getState()
                      .updatePlacement(page.id, selectedPanel.id, placementId, changes),
                  )
                }
                onPlacementDelete={(placementId) =>
                  commit(() =>
                    store.getState().deletePlacement(page.id, selectedPanel.id, placementId),
                  )
                }
                onReorder={(direction) =>
                  commit(() => store.getState().reorderPanel(page.id, selectedPanel.id, direction))
                }
                onDuplicate={() =>
                  commit(() => {
                    const copy = store.getState().duplicatePanel(page.id, selectedPanel.id)
                    if (copy) setSelectedPanelId(copy.id)
                  })
                }
                onDelete={() => {
                  commit(() => store.getState().deletePanel(page.id, selectedPanel.id))
                  setSelectedPanelId(null)
                }}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <SectionLabel as="h2">Page {page.index}</SectionLabel>
                <p className="text-sm leading-6 text-ink-muted">
                  Select a panel to edit it, or apply a template to lay the page out.
                </p>
                <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
                  <dt className="text-ink-muted">Panels</dt>
                  <dd className="text-ink tabular-nums">{page.panels.length}</dd>
                  <dt className="text-ink-muted">Text items</dt>
                  <dd className="text-ink tabular-nums">
                    {page.panels.reduce((sum, panel) => sum + panel.balloons.length, 0)}
                  </dd>
                  <dt className="text-ink-muted">Size</dt>
                  <dd className="text-ink">{page.size.label}</dd>
                </dl>
                <Badge>Pages stay editable — nothing is flattened</Badge>
              </div>
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={pendingDeletePage !== null}
        title="Delete this page?"
        description={
          pendingDeletePage
            ? `Page ${pendingDeletePage.index} and everything on it will be removed, and the pages after it renumbered. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete page"
        destructive
        onCancel={() => setPendingDeletePage(null)}
        onConfirm={() => {
          if (pendingDeletePage) {
            history.clear(pendingDeletePage.id)
            deletePage(pendingDeletePage.id)
            setPageId(null)
            setSelectedPanelId(null)
          }
          setPendingDeletePage(null)
        }}
      />
    </>
  )
}
