import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Scene } from '@/types/story'

/**
 * Beat sheet for one scene.
 *
 * Each beat records what changes, not just what happens. A beat that changes
 * nothing is the clearest signal a scene has dead weight in it, and asking for
 * the change explicitly is what surfaces that -- so the field is shown, empty
 * and waiting, rather than hidden behind a disclosure.
 */
export function BeatSheet({ scene }: { scene: Scene }) {
  const addBeat = useWorkspaceStore((state) => state.addBeat)
  const updateBeat = useWorkspaceStore((state) => state.updateBeat)
  const removeBeat = useWorkspaceStore((state) => state.removeBeat)

  const [draft, setDraft] = useState('')

  const beats = [...scene.beats].sort((a, b) => a.index - b.index)
  const withoutChange = beats.filter((beat) => !beat.change.trim()).length

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base text-ink">Beats</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-ink-muted">
            One unit of change each. If you cannot name what shifts, the beat is probably not
            earning its place.
          </p>
        </div>
        {beats.length > 0 && withoutChange > 0 ? (
          <span className="text-xs text-warning">
            {withoutChange} beat{withoutChange === 1 ? '' : 's'} with no change named
          </span>
        ) : null}
      </div>

      {beats.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3">
          {beats.map((beat, index) => (
            <li key={beat.id} className="flex items-start gap-2">
              <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-xs text-ink-faint tabular-nums">
                {index + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Input
                  value={beat.summary}
                  onChange={(event) => updateBeat(scene.id, beat.id, { summary: event.target.value })}
                  aria-label={`Beat ${index + 1} summary`}
                  placeholder="What happens"
                />
                <Input
                  value={beat.change}
                  onChange={(event) => updateBeat(scene.id, beat.id, { change: event.target.value })}
                  aria-label={`Beat ${index + 1}: what changes`}
                  placeholder="What changes as a result"
                  className={!beat.change.trim() ? 'border-warning/50' : undefined}
                />
              </div>
              <IconButton
                icon="trash"
                label={`Delete beat ${index + 1}`}
                size="sm"
                variant="danger"
                className="mt-1"
                onClick={() => removeBeat(scene.id, beat.id)}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">
          No beats yet. Break the scene into the moments that move it.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' || !draft.trim()) return
            event.preventDefault()
            addBeat(scene.id, draft.trim())
            setDraft('')
          }}
          placeholder="Add a beat and press Enter"
          aria-label="New beat"
        />
        <Button
          icon="plus"
          disabled={!draft.trim()}
          onClick={() => {
            addBeat(scene.id, draft.trim())
            setDraft('')
          }}
        >
          Add
        </Button>
      </div>
    </>
  )
}
