import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Input'
import { cn } from '@/lib/cn'
import { FieldGrid, TextField } from '@/features/characters/components/sections/section-kit'
import {
  useCharactersForProject,
  useFactionsForProject,
  useLocationsForProject,
  useTimelineForProject,
} from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { WorldEvent } from '@/types/world'

const SIGNIFICANCE: { value: WorldEvent['significance']; label: string; dot: string }[] = [
  { value: 'minor', label: 'Minor', dot: 'h-2 w-2 bg-ink-faint' },
  { value: 'notable', label: 'Notable', dot: 'h-2.5 w-2.5 bg-ink-muted' },
  { value: 'major', label: 'Major', dot: 'h-3.5 w-3.5 bg-primary' },
  { value: 'world-changing', label: 'World-changing', dot: 'h-4 w-4 bg-accent' },
]

/** Multi-select as a row of toggle chips, which reads better than a native multiple select. */
function ChipMultiSelect({
  legend,
  options,
  selected,
  onChange,
  emptyHint,
}: {
  legend: string
  options: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
  emptyHint: string
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-sm font-medium text-ink">{legend}</legend>
      {options.length === 0 ? (
        <p className="text-xs text-ink-faint">{emptyHint}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const on = selected.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={on}
                // Qualified so it does not collide with the same name elsewhere.
                aria-label={`${on ? 'Remove' : 'Add'} ${option.name} \u2014 ${legend}`}
                onClick={() =>
                  onChange(
                    on ? selected.filter((id) => id !== option.id) : [...selected, option.id],
                  )
                }
                className={cn(
                  'rounded-pill border px-2.5 py-0.5 text-xs border-[length:var(--pf-border-width)]',
                  'transition-colors duration-[var(--pf-duration-fast)]',
                  on
                    ? 'border-transparent bg-primary text-primary-fg'
                    : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                )}
              >
                {option.name}
              </button>
            )
          })}
        </div>
      )}
    </fieldset>
  )
}

export function TimelineTab({ projectId }: { projectId: string }) {
  const events = useTimelineForProject(projectId)
  const locations = useLocationsForProject(projectId)
  const factions = useFactionsForProject(projectId)
  const characters = useCharactersForProject(projectId)

  const createWorldEvent = useWorkspaceStore((state) => state.createWorldEvent)
  const updateWorldEvent = useWorkspaceStore((state) => state.updateWorldEvent)
  const deleteWorldEvent = useWorkspaceStore((state) => state.deleteWorldEvent)
  const moveWorldEvent = useWorkspaceStore((state) => state.moveWorldEvent)

  const [openId, setOpenId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<WorldEvent | null>(null)

  if (events.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="No history yet"
        description="Events the story stands on: a war, a treaty, the night everything changed. They are ordered by position rather than by date, because invented calendars cannot be sorted."
        action={
          <Button
            variant="primary"
            icon="plus"
            onClick={() => {
              const event = createWorldEvent(projectId, 'The founding')
              setOpenId(event.id)
            }}
          >
            Add the first event
          </Button>
        }
      />
    )
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm leading-6 text-ink-muted">
          Earliest at the top. Ordered by position, not by the date label, so invented calendars
          still sort correctly.
        </p>
        <Button
          icon="plus"
          onClick={() => {
            const event = createWorldEvent(projectId, `Event ${events.length + 1}`)
            setOpenId(event.id)
          }}
        >
          Add event
        </Button>
      </div>

      <ol className="relative flex flex-col">
        {/* The spine. Decorative, so hidden from assistive technology. */}
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[7px] top-4 w-px bg-line"
        />

        {events.map((event, index) => {
          const open = openId === event.id
          const marker = SIGNIFICANCE.find((s) => s.value === event.significance) ?? SIGNIFICANCE[1]!
          const location = locations.find((l) => l.id === event.locationId)

          return (
            <li key={event.id} className="relative pl-7">
              <span
                aria-hidden="true"
                className={cn(
                  'absolute left-0 top-[18px] -translate-x-1/2 rounded-pill ring-4 ring-bg',
                  marker.dot,
                )}
                style={{ left: '7px' }}
              />

              <div className="border-b border-line py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : event.id)}
                    aria-expanded={open}
                    className="min-w-0 flex-1 rounded-sm text-left"
                  >
                    <span className="block truncate text-base text-ink">{event.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-faint">
                      {event.whenLabel ? <span>{event.whenLabel}</span> : <span>No date set</span>}
                      {location ? <span>&middot; {location.name}</span> : null}
                      {event.significance !== 'notable' ? (
                        <Badge tone={event.significance === 'world-changing' ? 'accent' : 'neutral'}>
                          {marker.label}
                        </Badge>
                      ) : null}
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton
                      icon="chevronUp"
                      label={`Move ${event.title} earlier`}
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveWorldEvent(event.id, 'earlier')}
                    />
                    <IconButton
                      icon="chevronDown"
                      label={`Move ${event.title} later`}
                      size="sm"
                      disabled={index === events.length - 1}
                      onClick={() => moveWorldEvent(event.id, 'later')}
                    />
                    <IconButton
                      icon="trash"
                      label={`Delete ${event.title}`}
                      size="sm"
                      variant="danger"
                      onClick={() => setPendingDelete(event)}
                    />
                  </div>
                </div>

                {open ? (
                  <div className="mt-4 rounded-lg border border-line bg-surface p-4 border-[length:var(--pf-border-width)]">
                    <FieldGrid>
                      <TextField
                        label="Title"
                        value={event.title}
                        onChange={(title) => updateWorldEvent(event.id, { title })}
                      />
                      <TextField
                        label="When"
                        hint="Free text -- your calendar, not the browser's."
                        value={event.whenLabel}
                        onChange={(whenLabel) => updateWorldEvent(event.id, { whenLabel })}
                        placeholder="Third Age, year 412"
                      />

                      <Field label="Significance">
                        {({ id, describedBy }) => (
                          <Select
                            id={id}
                            aria-describedby={describedBy}
                            value={event.significance}
                            onChange={(e) =>
                              updateWorldEvent(event.id, {
                                significance: e.target.value as WorldEvent['significance'],
                              })
                            }
                          >
                            {SIGNIFICANCE.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>

                      <Field label="Where">
                        {({ id, describedBy }) => (
                          <Select
                            id={id}
                            aria-describedby={describedBy}
                            value={event.locationId ?? ''}
                            onChange={(e) =>
                              updateWorldEvent(event.id, { locationId: e.target.value || null })
                            }
                          >
                            <option value="">Not tied to a place</option>
                            {locations.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </Field>

                      <TextField
                        label="Summary"
                        value={event.summary}
                        onChange={(summary) => updateWorldEvent(event.id, { summary })}
                        multiline
                        rows={3}
                        wide
                      />
                      <TextField
                        label="What happened"
                        value={event.description}
                        onChange={(description) => updateWorldEvent(event.id, { description })}
                        multiline
                        rows={5}
                        wide
                      />
                    </FieldGrid>

                    <div className="mt-6 flex flex-col gap-5">
                      <ChipMultiSelect
                        legend="Factions involved"
                        options={factions}
                        selected={event.involvedFactionIds}
                        onChange={(involvedFactionIds) =>
                          updateWorldEvent(event.id, { involvedFactionIds })
                        }
                        emptyHint="No factions in this project yet."
                      />
                      <ChipMultiSelect
                        legend="Characters involved"
                        options={characters}
                        selected={event.involvedCharacterIds}
                        onChange={(involvedCharacterIds) =>
                          updateWorldEvent(event.id, { involvedCharacterIds })
                        }
                        emptyHint="No characters in this project yet."
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this event?"
        description={pendingDelete ? `"${pendingDelete.title}" will be removed from the timeline. This cannot be undone.` : ''}
        confirmLabel="Delete event"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) {
            deleteWorldEvent(pendingDelete.id)
            if (openId === pendingDelete.id) setOpenId(null)
          }
          setPendingDelete(null)
        }}
      />
    </>
  )
}
