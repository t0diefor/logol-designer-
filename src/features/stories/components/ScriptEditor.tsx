import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { RewritePanel } from '@/features/ai/components/RewritePanel'
import { cn } from '@/lib/cn'
import { countWords } from '@/lib/format'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Character } from '@/types/character'
import type { DialogueLine, Scene } from '@/types/story'

const KINDS: { value: DialogueLine['kind']; label: string; hint: string }[] = [
  { value: 'dialogue', label: 'Dialogue', hint: 'Spoken aloud, in a balloon.' },
  { value: 'narration', label: 'Narration', hint: 'A caption box in the narrator’s voice.' },
  { value: 'caption', label: 'Caption', hint: 'Time, place or a title card.' },
  { value: 'sfx', label: 'SFX', hint: 'A sound drawn into the art.' },
]

/** Visual treatment per line kind, so the script reads at a glance. */
const KIND_STYLE: Record<DialogueLine['kind'], string> = {
  dialogue: 'border-l-primary',
  narration: 'border-l-accent',
  caption: 'border-l-line-strong',
  sfx: 'border-l-warning',
}

/**
 * Dialogue, narration, caption and SFX lines for one scene.
 *
 * The four kinds are one list rather than four, because in a comic they
 * interleave: a caption, then two lines of dialogue, then a sound effect. The
 * order is the reading order, which is also the order the composer will place
 * them in a panel in phase 6.
 */
export function ScriptEditor({ scene, cast }: { scene: Scene; cast: Character[] }) {
  const addLine = useWorkspaceStore((state) => state.addLine)
  const updateLine = useWorkspaceStore((state) => state.updateLine)
  const removeLine = useWorkspaceStore((state) => state.removeLine)
  const moveLine = useWorkspaceStore((state) => state.moveLine)

  const [rewritingId, setRewritingId] = useState<string | null>(null)

  const lines = [...scene.lines].sort((a, b) => a.index - b.index)
  const rewriting = lines.find((line) => line.id === rewritingId) ?? null
  const spokenWords = lines.reduce((total, line) => total + countWords(line.text), 0)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base text-ink">Script</h3>
          <p className="mt-1 max-w-xl text-sm leading-6 text-ink-muted">
            Dialogue, narration, captions and sound, in reading order. This is the order the
            composer will place them in a panel.
          </p>
        </div>
        <span className="text-xs text-ink-faint tabular-nums">
          {spokenWords} word{spokenWords === 1 ? '' : 's'} in {lines.length} line
          {lines.length === 1 ? '' : 's'}
        </span>
      </div>

      {lines.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3">
          {lines.map((line, index) => (
            <li
              key={line.id}
              className={cn(
                'rounded-md border border-line border-l-4 bg-bg-inset p-3',
                KIND_STYLE[line.kind],
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={line.kind}
                  onChange={(event) =>
                    updateLine(scene.id, line.id, {
                      kind: event.target.value as DialogueLine['kind'],
                    })
                  }
                  aria-label={`Line ${index + 1} kind`}
                  fullWidth={false}
                  className="h-8 text-xs"
                >
                  {KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </Select>

                {line.kind === 'dialogue' ? (
                  <Select
                    value={line.characterId ?? ''}
                    onChange={(event) =>
                      updateLine(scene.id, line.id, { characterId: event.target.value || null })
                    }
                    aria-label={`Line ${index + 1} speaker`}
                    fullWidth={false}
                    className="h-8 text-xs"
                  >
                    <option value="">Unassigned speaker</option>
                    {cast.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </Select>
                ) : null}

                {line.kind === 'dialogue' && !line.characterId ? (
                  <Input
                    value={line.speakerName}
                    onChange={(event) =>
                      updateLine(scene.id, line.id, { speakerName: event.target.value })
                    }
                    aria-label={`Line ${index + 1} speaker name`}
                    placeholder="Or type a name"
                    fullWidth={false}
                    className="h-8 w-40 text-xs"
                  />
                ) : null}

                <div className="ml-auto flex shrink-0 items-center gap-1">
                  <IconButton
                    icon="sparkles"
                    label={`Rewrite line ${index + 1}`}
                    size="sm"
                    disabled={!line.text.trim()}
                    onClick={() => setRewritingId(line.id)}
                  />
                  <IconButton
                    icon="chevronUp"
                    label={`Move line ${index + 1} up`}
                    size="sm"
                    disabled={index === 0}
                    onClick={() => moveLine(scene.id, line.id, 'up')}
                  />
                  <IconButton
                    icon="chevronDown"
                    label={`Move line ${index + 1} down`}
                    size="sm"
                    disabled={index === lines.length - 1}
                    onClick={() => moveLine(scene.id, line.id, 'down')}
                  />
                  <IconButton
                    icon="trash"
                    label={`Delete line ${index + 1}`}
                    size="sm"
                    variant="danger"
                    onClick={() => removeLine(scene.id, line.id)}
                  />
                </div>
              </div>

              {line.kind === 'dialogue' ? (
                <Input
                  value={line.parenthetical}
                  onChange={(event) =>
                    updateLine(scene.id, line.id, { parenthetical: event.target.value })
                  }
                  aria-label={`Line ${index + 1} direction`}
                  placeholder="(quietly)"
                  className="mt-2 h-8 text-xs italic"
                />
              ) : null}

              <Textarea
                value={line.text}
                onChange={(event) => updateLine(scene.id, line.id, { text: event.target.value })}
                aria-label={`Line ${index + 1} text`}
                rows={2}
                className="mt-2"
                placeholder={KINDS.find((k) => k.value === line.kind)?.hint}
              />
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm text-ink-faint">
          No lines yet. Add dialogue, a caption or a sound effect.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {KINDS.map((kind) => (
          <Button
            key={kind.value}
            size="sm"
            icon="plus"
            onClick={() => addLine(scene.id, kind.value)}
          >
            {kind.label}
          </Button>
        ))}
      </div>

      {rewriting ? (
        <RewritePanel
          open
          fieldLabel={`Line ${lines.indexOf(rewriting) + 1}`}
          text={rewriting.text}
          onClose={() => setRewritingId(null)}
          onApply={(text) => updateLine(scene.id, rewriting.id, { text })}
        />
      ) : null}
    </>
  )
}
