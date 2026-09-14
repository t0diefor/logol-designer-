import { useCallback, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { clamp, clientToSvg, snapPoint, type Point } from '@/lib/svg-coords'
import { useLocationsForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'

const CANVAS = { width: 1000, height: 720 }
const GRID = 20
const NODE = { width: 150, height: 46 }
/** How far the pointer must travel before a press counts as a drag, not a click. */
const DRAG_THRESHOLD = 3
/** Arrow-key nudge distance, and the larger step when Shift is held. */
const NUDGE = GRID
const NUDGE_LARGE = GRID * 5

interface DragState {
  id: string
  /** Offset from the node's origin to where the pointer grabbed it. */
  grabX: number
  grabY: number
  position: Point
  moved: boolean
}

/**
 * Node-based map workspace.
 *
 * Locations are draggable nodes; a line is drawn from each place to whatever
 * it sits inside. This is not a geographic map and does not pretend to be --
 * it is a spatial arrangement of the places in the story, which is what is
 * actually useful when working out how a scene gets from one to another.
 *
 * Interaction notes:
 *  - Dragging updates local state and commits to the store on release, so a
 *    drag is one undoable change and one autosave write rather than sixty.
 *  - Pointer capture means the drag survives the cursor leaving the node, and
 *    a pointerup outside the window still ends it.
 *  - Every node is a real focusable button and can be moved with the arrow
 *    keys, so the map is not mouse-only.
 */
export function MapTab({ projectId }: { projectId: string }) {
  const locations = useLocationsForProject(projectId)
  const updateLocation = useWorkspaceStore((state) => state.updateLocation)
  const createLocation = useWorkspaceStore((state) => state.createLocation)

  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [snapToGrid, setSnapToGrid] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const positionOf = useCallback(
    (id: string, fallback: Point): Point =>
      drag?.id === id ? drag.position : fallback,
    [drag],
  )

  function handlePointerDown(event: React.PointerEvent<SVGGElement>, id: string, at: Point) {
    // Ignore secondary buttons so a right-click never starts a drag.
    if (event.button !== 0) return
    const svg = svgRef.current
    if (!svg) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const pointer = clientToSvg(svg, event.clientX, event.clientY)

    setSelectedId(id)
    setDrag({
      id,
      grabX: pointer.x - at.x,
      grabY: pointer.y - at.y,
      position: at,
      moved: false,
    })
  }

  function handlePointerMove(event: React.PointerEvent<SVGGElement>) {
    if (!drag) return
    const svg = svgRef.current
    if (!svg) return

    const pointer = clientToSvg(svg, event.clientX, event.clientY)
    const raw = { x: pointer.x - drag.grabX, y: pointer.y - drag.grabY }
    const next = snapToGrid ? snapPoint(raw, GRID) : raw

    const moved =
      drag.moved ||
      Math.abs(next.x - drag.position.x) > DRAG_THRESHOLD ||
      Math.abs(next.y - drag.position.y) > DRAG_THRESHOLD

    setDrag({
      ...drag,
      moved,
      position: {
        x: clamp(next.x, 0, CANVAS.width - NODE.width),
        y: clamp(next.y, 0, CANVAS.height - NODE.height),
      },
    })
  }

  function endDrag() {
    if (!drag) return
    // Only write if the node actually moved; a plain click should not dirty
    // the document or trigger a save.
    if (drag.moved) {
      updateLocation(drag.id, { mapX: Math.round(drag.position.x), mapY: Math.round(drag.position.y) })
    }
    setDrag(null)
  }

  function nudge(id: string, at: Point, dx: number, dy: number) {
    updateLocation(id, {
      mapX: Math.round(clamp(at.x + dx, 0, CANVAS.width - NODE.width)),
      mapY: Math.round(clamp(at.y + dy, 0, CANVAS.height - NODE.height)),
    })
  }

  if (locations.length === 0) {
    return (
      <EmptyState
        icon="map"
        title="Nothing to place yet"
        description="The map arranges the locations in your project so you can see how they sit relative to one another. Add a location and it will appear here."
        action={
          <Button variant="primary" icon="plus" onClick={() => createLocation(projectId, 'New place')}>
            Add a location
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-ink-muted">
          Drag to arrange, or focus a place and use the arrow keys. Lines link each place to
          whatever it sits inside. This is a spatial sketch, not a geographic map.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(event) => setSnapToGrid(event.target.checked)}
            className="accent-[var(--pf-primary)]"
          />
          Snap to grid
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-bg-inset border-[length:var(--pf-border-width)]">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
          // Capped to the viewport so the whole workspace stays visible while
          // dragging; `meet` scales it down rather than clipping the edges.
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto max-h-[62vh] w-full min-w-[720px] touch-none"
          role="application"
          aria-label="Location map. Drag nodes to arrange them, or focus one and use the arrow keys."
        >
          <defs>
            <pattern id="pf-map-grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
              <path
                d={`M ${GRID} 0 L 0 0 0 ${GRID}`}
                fill="none"
                stroke="var(--pf-border)"
                strokeWidth="1"
                opacity="0.5"
              />
            </pattern>
          </defs>

          <rect width={CANVAS.width} height={CANVAS.height} fill="url(#pf-map-grid)" />

          {/* Containment links, drawn under the nodes. */}
          {locations.map((location) => {
            if (!location.parentLocationId) return null
            const parent = locations.find((l) => l.id === location.parentLocationId)
            if (!parent) return null

            const from = positionOf(location.id, { x: location.mapX, y: location.mapY })
            const to = positionOf(parent.id, { x: parent.mapX, y: parent.mapY })

            return (
              <line
                key={`${location.id}-link`}
                x1={from.x + NODE.width / 2}
                y1={from.y + NODE.height / 2}
                x2={to.x + NODE.width / 2}
                y2={to.y + NODE.height / 2}
                stroke="var(--pf-border-strong)"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            )
          })}

          {locations.map((location) => {
            const at = positionOf(location.id, { x: location.mapX, y: location.mapY })
            const active = drag?.id === location.id
            const selected = selectedId === location.id

            return (
              <g
                key={location.id}
                transform={`translate(${at.x}, ${at.y})`}
                onPointerDown={(event) => handlePointerDown(event, location.id, at)}
                onPointerMove={handlePointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={(event) => {
                  const step = event.shiftKey ? NUDGE_LARGE : NUDGE
                  const moves: Record<string, [number, number]> = {
                    ArrowLeft: [-step, 0],
                    ArrowRight: [step, 0],
                    ArrowUp: [0, -step],
                    ArrowDown: [0, step],
                  }
                  const move = moves[event.key]
                  if (!move) return
                  event.preventDefault()
                  nudge(location.id, at, move[0], move[1])
                }}
                tabIndex={0}
                role="button"
                aria-label={`${location.name}${location.kind ? `, ${location.kind}` : ''}. Use arrow keys to move.`}
                className={cn('cursor-grab focus-visible:outline-none', active && 'cursor-grabbing')}
              >
                <rect
                  width={NODE.width}
                  height={NODE.height}
                  rx="6"
                  fill="var(--pf-surface)"
                  stroke={selected ? 'var(--pf-primary)' : 'var(--pf-border-strong)'}
                  strokeWidth={selected ? 2 : 1}
                />
                <text
                  x="12"
                  y="20"
                  fill="var(--pf-text)"
                  fontSize="13"
                  fontFamily="var(--pf-font-body)"
                >
                  {location.name.length > 18 ? `${location.name.slice(0, 17)}…` : location.name}
                </text>
                <text
                  x="12"
                  y="35"
                  fill="var(--pf-text-faint)"
                  fontSize="10"
                  fontFamily="var(--pf-font-mono)"
                >
                  {location.kind || 'unclassified'}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Positions are saved with the project. A drag writes once, on release.
      </p>
    </>
  )
}
