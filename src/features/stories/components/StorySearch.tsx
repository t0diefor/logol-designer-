import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput } from '@/components/ui/Input'
import type { Scene } from '@/types/story'

interface Hit {
  sceneId: string
  sceneTitle: string
  sceneIndex: number
  field: string
  /** The matching text, trimmed to a readable window around the match. */
  excerpt: string
  matchStart: number
  matchLength: number
}

/** Cuts a window around the match so long fields do not dominate the results. */
function excerptAround(text: string, index: number, length: number, window = 60) {
  const start = Math.max(0, index - window)
  const end = Math.min(text.length, index + length + window)
  return {
    excerpt: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
    matchStart: index - start + (start > 0 ? 1 : 0),
    matchLength: length,
  }
}

/**
 * Full-text search across every scene in a story.
 *
 * Searches the fields a writer actually loses things in -- summary, the three
 * engine fields, beats and every script line -- and names which field each hit
 * came from, because "it's in here somewhere" is the problem being solved.
 */
export function StorySearch({
  scenes,
  onOpenScene,
}: {
  scenes: Scene[]
  onOpenScene: (sceneId: string) => void
}) {
  const [query, setQuery] = useState('')

  const hits = useMemo<Hit[]>(() => {
    const needle = query.trim().toLowerCase()
    if (needle.length < 2) return []

    const found: Hit[] = []

    for (const scene of scenes) {
      const fields: [string, string][] = [
        ['Title', scene.title],
        ['Slug', scene.slug],
        ['Summary', scene.summary],
        ['Goal', scene.goal],
        ['Conflict', scene.conflict],
        ['Outcome', scene.outcome],
        ...scene.beats.map<[string, string]>((beat, i) => [`Beat ${i + 1}`, `${beat.summary} ${beat.change}`]),
        ...scene.lines.map<[string, string]>((line, i) => [
          `${line.kind[0]!.toUpperCase()}${line.kind.slice(1)} ${i + 1}`,
          line.text,
        ]),
      ]

      for (const [field, value] of fields) {
        const index = value.toLowerCase().indexOf(needle)
        if (index === -1) continue
        found.push({
          sceneId: scene.id,
          sceneTitle: scene.title || `Scene ${scene.index + 1}`,
          sceneIndex: scene.index,
          field,
          ...excerptAround(value, index, needle.length),
        })
      }
    }

    return found
  }, [scenes, query])

  return (
    <>
      <div className="mb-5 max-w-xl">
        <SearchInput
          label="Search this story"
          placeholder="Search scenes, beats and every script line"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <p className="mt-2 text-xs text-ink-faint">
          {query.trim().length < 2
            ? 'Type at least two characters.'
            : `${hits.length} match${hits.length === 1 ? '' : 'es'} across ${new Set(hits.map((h) => h.sceneId)).size} scene${new Set(hits.map((h) => h.sceneId)).size === 1 ? '' : 's'}.`}
        </p>
      </div>

      {query.trim().length >= 2 && hits.length === 0 ? (
        <EmptyState
          icon="search"
          title="Nothing found"
          description="No scene, beat or line in this story contains that text."
        />
      ) : null}

      {hits.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {hits.map((hit, index) => (
            <li key={`${hit.sceneId}-${hit.field}-${index}`}>
              <button
                type="button"
                onClick={() => onOpenScene(hit.sceneId)}
                className="w-full rounded-md border border-line bg-surface p-3 text-left border-[length:var(--pf-border-width)] hover:border-line-strong hover:bg-surface-raised"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-ink">
                    {hit.sceneIndex + 1}. {hit.sceneTitle}
                  </span>
                  <Badge>{hit.field}</Badge>
                </span>
                <span className="mt-1.5 block text-sm leading-6 text-ink-muted">
                  {hit.excerpt.slice(0, hit.matchStart)}
                  <mark className="rounded-sm bg-accent px-0.5 text-accent-fg">
                    {hit.excerpt.slice(hit.matchStart, hit.matchStart + hit.matchLength)}
                  </mark>
                  {hit.excerpt.slice(hit.matchStart + hit.matchLength)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  )
}
