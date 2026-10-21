import { useCallback, useRef, useState } from 'react'
import { PageContent } from '../render/PageRenderer'
import {
  containRect,
  resizeRect,
  snapRect,
  RESIZE_HANDLES,
  type Guide,
  type ResizeHandle,
} from '../alignment'
import { clientToSvg, snapPoint } from '@/lib/svg-coords'
import type { Page, Panel } from '@/types/comic'
import type { Rect } from '@/types/common'

export interface PageCanvasProps {
  page: Page
  imageUrls?: Map<string, string>
  selectedPanelId: string | null
  onSelect: (panelId: string | null) => void
  /** Called once, on release, with the final rectangle. */
  onCommit: (panelId: string, rect: Rect) => void
  zoom: number
  snapToGrid: boolean
  gridSize: number
}

type Interaction =
  | { mode: 'move'; panelId: string; grabX: number; grabY: number; rect: Rect; moved: boolean }
  | { mode: 'resize'; panelId: string; handle: ResizeHandle; startX: number; startY: number; origin: Rect; rect: Rect; moved: boolean }

/** Handle size in screen pixels, converted to page units so it stays constant under zoom. */
const HANDLE_SCREEN_SIZE = 9

/**
 * The interactive page surface.
 *
 * Interaction rules, and why each one is there:
 *
 * - **A drag writes once, on release.** The live rectangle is local state;
 *   the store is updated when the pointer comes up. Sixty writes per second
 *   would mean sixty autosave writes and sixty undo entries for one gesture.
 *
 * - **Pointer capture** keeps the drag alive when the cursor leaves the panel
 *   or the window, so releasing outside still ends it cleanly.
 *
 * - **Handles are sized in screen pixels**, divided by the zoom, so they stay
 *   grabbable at 40% and do not swell into the panel at 200%.
 *
 * - **Snapping always draws its guide.** A panel that moves somewhere the user
 *   did not put it, with no line explaining why, reads as a bug.
 *
 * - **The live interaction lives in a ref, not only in state.** The pointer
 *   handlers are attached to the hit rectangle *and* to the root `<svg>`, so
 *   one `pointerup` runs `endInteraction` twice as it bubbles. Both calls come
 *   from the same render, so a state-only check still sees the gesture as
 *   active the second time and commits it twice -- which is two undo entries
 *   for one drag, and an undo that visibly does nothing. The ref is cleared
 *   synchronously, so the bubbled copy is a no-op. The same ref keeps
 *   `pointermove` correct when React batches several moves into one render.
 */
export function PageCanvas({
  page,
  imageUrls,
  selectedPanelId,
  onSelect,
  onCommit,
  zoom,
  snapToGrid,
  gridSize,
}: PageCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const [interaction, setInteractionState] = useState<Interaction | null>(null)
  const [guides, setGuides] = useState<Guide[]>([])

  /** Writes the ref synchronously and the render state for the next paint. */
  const setInteraction = useCallback((next: Interaction | null) => {
    interactionRef.current = next
    setInteractionState(next)
  }, [])

  const handleSize = HANDLE_SCREEN_SIZE / zoom

  /** The live rectangle for a panel: the dragged one if it is mid-gesture. */
  const rectOf = useCallback(
    (panel: Panel): Rect => (interaction?.panelId === panel.id ? interaction.rect : panel.rect),
    [interaction],
  )

  /** Everything except the panel being moved, plus the page's own margins. */
  const snapTargets = useCallback(
    (panelId: string) => ({
      others: page.panels.filter((panel) => panel.id !== panelId).map((panel) => panel.rect),
      extra: {
        x: [page.margin, page.size.width - page.margin, page.size.width / 2],
        y: [page.margin, page.size.height - page.margin, page.size.height / 2],
      },
    }),
    [page],
  )

  function startMove(event: React.PointerEvent, panel: Panel) {
    if (event.button !== 0) return
    const svg = svgRef.current
    if (!svg) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const pointer = clientToSvg(svg, event.clientX, event.clientY)

    onSelect(panel.id)
    setInteraction({
      mode: 'move',
      panelId: panel.id,
      grabX: pointer.x - panel.rect.x,
      grabY: pointer.y - panel.rect.y,
      rect: panel.rect,
      moved: false,
    })
  }

  function startResize(event: React.PointerEvent, panel: Panel, handle: ResizeHandle) {
    if (event.button !== 0) return
    const svg = svgRef.current
    if (!svg) return

    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    const pointer = clientToSvg(svg, event.clientX, event.clientY)

    onSelect(panel.id)
    setInteraction({
      mode: 'resize',
      panelId: panel.id,
      handle,
      startX: pointer.x,
      startY: pointer.y,
      origin: panel.rect,
      rect: panel.rect,
      moved: false,
    })
  }

  function handlePointerMove(event: React.PointerEvent) {
    const active = interactionRef.current
    if (!active) return
    const svg = svgRef.current
    if (!svg) return

    const pointer = clientToSvg(svg, event.clientX, event.clientY)
    const { others, extra } = snapTargets(active.panelId)

    if (active.mode === 'move') {
      const raw = { x: pointer.x - active.grabX, y: pointer.y - active.grabY }
      const base = snapToGrid ? snapPoint(raw, gridSize) : raw
      const candidate: Rect = { ...active.rect, x: base.x, y: base.y }

      const snapped = snapRect(candidate, others, extra)
      const contained = containRect(snapped.rect, page.size.width, page.size.height)

      setGuides(snapped.guides)
      setInteraction({ ...active, rect: contained, moved: true })
      return
    }

    const resized = resizeRect(
      active.origin,
      active.handle,
      pointer.x - active.startX,
      pointer.y - active.startY,
    )

    const snapped = snapRect(resized, others, extra)
    // Only the edges being dragged may move, so a snap on the opposite side
    // cannot drag the whole panel sideways mid-resize.
    const kept: Rect = {
      x: active.handle.includes('w') ? snapped.rect.x : resized.x,
      y: active.handle.includes('n') ? snapped.rect.y : resized.y,
      width: resized.width,
      height: resized.height,
    }

    setGuides(snapped.guides)
    setInteraction({ ...active, rect: kept, moved: true })
  }

  function endInteraction() {
    const active = interactionRef.current
    if (!active) return

    // Cleared first, and synchronously: this same pointerup still has to
    // bubble from the hit rectangle to the root <svg>, where it calls this
    // function again. Committing twice would mean two undo entries for one
    // gesture, so the first undo would appear to do nothing.
    setInteraction(null)
    setGuides([])

    // A plain click should not dirty the document or add an undo step.
    if (active.moved) onCommit(active.panelId, active.rect)
  }

  const selected = page.panels.find((panel) => panel.id === selectedPanelId) ?? null
  const selectedRect = selected ? rectOf(selected) : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${page.size.width} ${page.size.height}`}
      className="block h-auto w-full touch-none select-none"
      style={{ maxHeight: '72vh' }}
      preserveAspectRatio="xMidYMid meet"
      onPointerMove={handlePointerMove}
      onPointerUp={endInteraction}
      onPointerCancel={endInteraction}
      onPointerDown={() => onSelect(null)}
      role="application"
      aria-label={`Page ${page.index}. Select a panel to move or resize it.`}
    >
      <PageContent
        page={{
          ...page,
          // Feed the renderer the live rectangles so the real artwork moves
          // with the drag, not a separate ghost outline.
          panels: page.panels.map((panel) => ({ ...panel, rect: rectOf(panel) })),
        }}
        imageUrls={imageUrls}
        showGuides
        selectedPanelId={selectedPanelId}
      />

      {/* Hit areas. Separate from the artwork so a transparent panel is still
          grabbable across its whole rectangle. Only `pointerdown` is handled
          here: pointer capture retargets the rest of the gesture to this
          rectangle, and those events bubble to the root <svg>, which owns the
          move and release. Duplicating the handlers here would run both on
          every event. */}
      {page.panels.map((panel) => {
        const rect = rectOf(panel)
        return (
          <rect
            key={`hit-${panel.id}`}
            {...rect}
            fill="transparent"
            className="cursor-move"
            onPointerDown={(event) => startMove(event, panel)}
            tabIndex={0}
            role="button"
            aria-label={`Panel ${page.panels.indexOf(panel) + 1}${panel.description ? `: ${panel.description}` : ''}`}
            onFocus={() => onSelect(panel.id)}
          />
        )
      })}

      {/* Alignment guides, drawn above everything so they are never hidden. */}
      {guides.map((guide, index) =>
        guide.axis === 'x' ? (
          <line
            key={`g${index}`}
            x1={guide.position}
            y1={0}
            x2={guide.position}
            y2={page.size.height}
            stroke="var(--pf-accent)"
            strokeWidth={1 / zoom}
            pointerEvents="none"
          />
        ) : (
          <line
            key={`g${index}`}
            x1={0}
            y1={guide.position}
            x2={page.size.width}
            y2={guide.position}
            stroke="var(--pf-accent)"
            strokeWidth={1 / zoom}
            pointerEvents="none"
          />
        ),
      )}

      {/* Resize handles for the selected panel. */}
      {selected && selectedRect
        ? RESIZE_HANDLES.map((handle) => {
            const x =
              handle.includes('w')
                ? selectedRect.x
                : handle.includes('e')
                  ? selectedRect.x + selectedRect.width
                  : selectedRect.x + selectedRect.width / 2
            const y =
              handle.includes('n')
                ? selectedRect.y
                : handle.includes('s')
                  ? selectedRect.y + selectedRect.height
                  : selectedRect.y + selectedRect.height / 2

            const cursor =
              handle === 'n' || handle === 's'
                ? 'ns-resize'
                : handle === 'e' || handle === 'w'
                  ? 'ew-resize'
                  : handle === 'nw' || handle === 'se'
                    ? 'nwse-resize'
                    : 'nesw-resize'

            return (
              <rect
                key={handle}
                x={x - handleSize / 2}
                y={y - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="var(--pf-primary)"
                stroke="var(--pf-bg)"
                strokeWidth={1 / zoom}
                style={{ cursor }}
                onPointerDown={(event) => startResize(event, selected, handle)}
                aria-hidden="true"
              />
            )
          })
        : null}
    </svg>
  )
}
