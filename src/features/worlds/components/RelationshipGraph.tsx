import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import {
  useCharactersForProject,
  useFactionsForProject,
  useLocationsForProject,
} from '@/stores/workspace-selectors'

type NodeKind = 'character' | 'faction' | 'location'

interface GraphNode {
  id: string
  label: string
  kind: NodeKind
  x: number
  y: number
  angle: number
}

interface GraphEdge {
  from: string
  to: string
  label: string
  kind: 'relationship' | 'rivalry' | 'based-at'
}

const VIEW = { width: 900, height: 620 }
const CENTRE = { x: VIEW.width / 2, y: VIEW.height / 2 }
const RADIUS = 232

const KIND_COLOR: Record<NodeKind, string> = {
  character: 'var(--pf-primary)',
  faction: 'var(--pf-danger)',
  location: 'var(--pf-accent)',
}

const EDGE_COLOR: Record<GraphEdge['kind'], string> = {
  relationship: 'var(--pf-primary)',
  rivalry: 'var(--pf-danger)',
  'based-at': 'var(--pf-accent)',
}

/**
 * Relationship graph.
 *
 * Layout is deterministic rather than a force simulation: nodes are placed on
 * a circle, grouped contiguously by type with a gap between groups. That gives
 * three properties a physics layout does not -- the same data always draws the
 * same picture, it settles instantly, and nothing jitters while you read it.
 *
 * The trade-off is honest: a force layout would cluster densely connected
 * nodes together, which this does not. For a cast of a few dozen, legibility
 * and stability are worth more than clustering.
 */
export function RelationshipGraph({ projectId }: { projectId: string }) {
  const characters = useCharactersForProject(projectId)
  const factions = useFactionsForProject(projectId)
  const locations = useLocationsForProject(projectId)

  const [focusId, setFocusId] = useState<string | null>(null)

  const { nodes, edges } = useMemo(() => {
    const allGroups: { kind: NodeKind; items: { id: string; label: string }[] }[] = [
      { kind: 'character', items: characters.map((c) => ({ id: c.id, label: c.name })) },
      { kind: 'faction', items: factions.map((f) => ({ id: f.id, label: f.name })) },
      { kind: 'location', items: locations.map((l) => ({ id: l.id, label: l.name })) },
    ]
    const groups = allGroups.filter((group) => group.items.length > 0)

    const total = groups.reduce((sum, group) => sum + group.items.length, 0)
    if (total === 0) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] }

    // A slice of the circle is reserved as a gap between groups, so the three
    // families read as distinct arcs rather than one undifferentiated ring.
    const gapSlots = groups.length > 1 ? groups.length : 0
    const slots = total + gapSlots
    const step = (Math.PI * 2) / slots

    const placed: GraphNode[] = []
    let slot = 0

    for (const group of groups) {
      for (const item of group.items) {
        // Start at the top of the circle rather than at 3 o'clock.
        const angle = slot * step - Math.PI / 2
        placed.push({
          id: item.id,
          label: item.label,
          kind: group.kind,
          angle,
          x: CENTRE.x + RADIUS * Math.cos(angle),
          y: CENTRE.y + RADIUS * Math.sin(angle),
        })
        slot += 1
      }
      slot += 1 // the gap
    }

    const known = new Set(placed.map((node) => node.id))
    const built: GraphEdge[] = []

    for (const character of characters) {
      for (const relationship of character.relationships) {
        if (!relationship.targetCharacterId) continue
        if (!known.has(relationship.targetCharacterId)) continue
        built.push({
          from: character.id,
          to: relationship.targetCharacterId,
          label: relationship.kind || 'knows',
          kind: 'relationship',
        })
      }
    }

    // Rivalries are stored on both sides; draw each pair once.
    const seenRivalry = new Set<string>()
    for (const faction of factions) {
      for (const rivalId of faction.rivalFactionIds) {
        if (!known.has(rivalId)) continue
        const key = [faction.id, rivalId].sort().join('|')
        if (seenRivalry.has(key)) continue
        seenRivalry.add(key)
        built.push({ from: faction.id, to: rivalId, label: 'rivals', kind: 'rivalry' })
      }
    }

    for (const faction of factions) {
      if (!faction.homeLocationId || !known.has(faction.homeLocationId)) continue
      built.push({
        from: faction.id,
        to: faction.homeLocationId,
        label: 'based at',
        kind: 'based-at',
      })
    }

    return { nodes: placed, edges: built }
  }, [characters, factions, locations])

  const connected = useMemo(() => {
    if (!focusId) return null
    const ids = new Set<string>([focusId])
    for (const edge of edges) {
      if (edge.from === focusId) ids.add(edge.to)
      if (edge.to === focusId) ids.add(edge.from)
    }
    return ids
  }, [edges, focusId])

  if (nodes.length === 0) {
    return (
      <EmptyState
        icon="share"
        title="Nothing to connect yet"
        description="The graph draws links between characters, factions and places. Add a few, record a relationship or a rivalry, and the shape of your world appears here."
      />
    )
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-ink-muted">
          Select a node to isolate what it connects to. Layout is fixed, so the same world always
          draws the same picture.
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-muted">
          {(['character', 'faction', 'location'] as NodeKind[]).map((kind) => (
            <span key={kind} className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-pill"
                style={{ backgroundColor: KIND_COLOR[kind] }}
              />
              {kind === 'character' ? 'Characters' : kind === 'faction' ? 'Factions' : 'Places'}
            </span>
          ))}
        </div>
      </div>

      {edges.length === 0 ? (
        <p className="mb-4 rounded-md border border-line bg-bg-inset px-3 py-2.5 text-sm text-ink-muted">
          No connections recorded yet. Add a relationship on a character, a rivalry between
          factions, or set where a faction is based, and lines will appear.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-line bg-bg-inset border-[length:var(--pf-border-width)]">
        <svg
          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
          /*
           * Capped so the whole graph fits on screen without scrolling. With
           * `meet`, the drawing scales down and centres inside the box rather
           * than being clipped, so no node can end up off the edge.
           */
          preserveAspectRatio="xMidYMid meet"
          className="block h-auto max-h-[62vh] w-full min-w-[680px]"
          role="img"
          aria-label={`Relationship graph: ${nodes.length} nodes and ${edges.length} connections.`}
        >
          {edges.map((edge, index) => {
            const from = nodeById.get(edge.from)
            const to = nodeById.get(edge.to)
            if (!from || !to) return null

            const dimmed = connected !== null && !(connected.has(edge.from) && connected.has(edge.to))

            // Curve every edge through the middle so parallel links between
            // neighbouring nodes stay distinguishable.
            const midX = (from.x + to.x) / 2
            const midY = (from.y + to.y) / 2
            const controlX = midX + (CENTRE.x - midX) * 0.45
            const controlY = midY + (CENTRE.y - midY) * 0.45

            return (
              <path
                key={`${edge.from}-${edge.to}-${index}`}
                d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
                fill="none"
                stroke={EDGE_COLOR[edge.kind]}
                strokeWidth={edge.kind === 'rivalry' ? 2 : 1.5}
                strokeDasharray={edge.kind === 'based-at' ? '5 4' : undefined}
                opacity={dimmed ? 0.12 : 0.6}
              />
            )
          })}

          {nodes.map((node) => {
            const dimmed = connected !== null && !connected.has(node.id)
            const isFocus = focusId === node.id
            // Labels on the left half are anchored end-on so they read outward.
            const onLeft = Math.cos(node.angle) < -0.1
            const labelOffset = 14

            return (
              <g
                key={node.id}
                opacity={dimmed ? 0.25 : 1}
                tabIndex={0}
                role="button"
                aria-label={`${node.label}, ${node.kind}`}
                aria-pressed={isFocus}
                onClick={() => setFocusId(isFocus ? null : node.id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  setFocusId(isFocus ? null : node.id)
                }}
                className="cursor-pointer"
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isFocus ? 9 : 6}
                  fill={KIND_COLOR[node.kind]}
                  stroke="var(--pf-bg)"
                  strokeWidth="2"
                />
                <text
                  x={node.x + (onLeft ? -labelOffset : labelOffset)}
                  y={node.y + 4}
                  textAnchor={onLeft ? 'end' : 'start'}
                  fontSize="12"
                  fontFamily="var(--pf-font-body)"
                  fill={isFocus ? 'var(--pf-text)' : 'var(--pf-text-muted)'}
                  fontWeight={isFocus ? 600 : 400}
                >
                  {node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {focusId ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-muted">
            Showing connections for{' '}
            <span className="text-ink">{nodeById.get(focusId)?.label}</span>
          </span>
          {edges
            .filter((edge) => edge.from === focusId || edge.to === focusId)
            .map((edge, index) => {
              const otherId = edge.from === focusId ? edge.to : edge.from
              return (
                <Badge key={`${otherId}-${index}`} tone={edge.kind === 'rivalry' ? 'danger' : 'neutral'}>
                  {edge.label} &middot; {nodeById.get(otherId)?.label}
                </Badge>
              )
            })}
          <button
            type="button"
            onClick={() => setFocusId(null)}
            className={cn('text-xs text-ink-muted underline')}
          >
            Clear
          </button>
        </div>
      ) : null}
    </>
  )
}
