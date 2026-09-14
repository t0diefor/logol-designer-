import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { SearchInput, Select } from '@/components/ui/Input'
import { CharacterCard } from '@/features/characters/components/CharacterCard'
import { CreateCharacterDialog } from '@/features/characters/components/CreateCharacterDialog'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { cn } from '@/lib/cn'
import {
  useCharactersForProject,
  useCharacterTagCounts,
  useCurrentProject,
} from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { buildConsistencyChecklist, type Character } from '@/types/character'

type SortKey = 'name' | 'recent' | 'incomplete'

export function CharactersPage() {
  const navigate = useNavigate()
  const kit = useMotionKit()
  const project = useCurrentProject()

  const characters = useCharactersForProject(project?.id ?? null)
  const tagCounts = useCharacterTagCounts(project?.id ?? null)

  const createCharacter = useWorkspaceStore((state) => state.createCharacter)
  const duplicateCharacter = useWorkspaceStore((state) => state.duplicateCharacter)
  const deleteCharacter = useWorkspaceStore((state) => state.deleteCharacter)

  const [createOpen, setCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Character | null>(null)
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('name')

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = characters.filter((character) => {
      if (activeTag && !character.tags.includes(activeTag)) return false
      if (!needle) return true
      // Searching only name and role would miss the thing people actually
      // search for, which is a half-remembered detail from the sheet.
      return (
        character.name.toLowerCase().includes(needle) ||
        character.role.toLowerCase().includes(needle) ||
        character.tags.some((tag) => tag.includes(needle)) ||
        character.appearance.general.toLowerCase().includes(needle) ||
        character.backstory.toLowerCase().includes(needle)
      )
    })

    const completeness = (character: Character) =>
      buildConsistencyChecklist(character).filter((item) => item.complete).length

    return [...filtered].sort((a, b) => {
      if (sort === 'recent') return b.updatedAt.localeCompare(a.updatedAt)
      if (sort === 'incomplete') return completeness(a) - completeness(b) || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name)
    })
  }, [characters, query, activeTag, sort])

  if (!project) {
    return (
      <>
        <PageHeader title="Characters" />
        <EmptyState
          icon="folder"
          title="No project selected"
          description="Characters belong to a project. Pick one first and its cast will appear here."
          action={<Button variant="primary" onClick={() => navigate('/projects')}>Choose a project</Button>}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Characters"
        description={`The cast of ${project.title}. Each sheet holds appearance, wardrobe, expressions and voice, so the character stays the same person across every issue.`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
            New character
          </Button>
        }
      />

      {characters.length > 0 ? (
        <div className="mb-6 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-56 flex-1">
              <SearchInput
                label="Search characters"
                placeholder="Search name, role, tags, appearance or backstory"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Select
              aria-label="Sort characters"
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              fullWidth={false}
            >
              <option value="name">A to Z</option>
              <option value="recent">Recently edited</option>
              <option value="incomplete">Least complete sheet</option>
            </Select>
          </div>

          {tagCounts.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-ink-faint">Tags</span>
              {tagCounts.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                  aria-pressed={activeTag === tag}
                  className={cn(
                    'rounded-pill border px-2.5 py-0.5 text-xs border-[length:var(--pf-border-width)]',
                    'transition-colors duration-[var(--pf-duration-fast)]',
                    activeTag === tag
                      ? 'border-transparent bg-primary text-primary-fg'
                      : 'border-line bg-bg-inset text-ink-muted hover:border-line-strong',
                  )}
                >
                  {tag} <span className="text-[10px] opacity-70">{count}</span>
                </button>
              ))}
              {activeTag ? (
                <button
                  type="button"
                  onClick={() => setActiveTag(null)}
                  className="ml-1 text-xs text-ink-muted underline"
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {characters.length === 0 ? (
        <EmptyState
          icon="user"
          title="No characters yet"
          description="A character sheet is what keeps someone recognisable across a hundred panels: their appearance broken into fields, their wardrobe, their expressions and how they speak. Start with a name -- the rest can wait."
          action={
            <Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>
              Create your first character
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="No matching characters"
          description="Nothing in this cast matches that search and tag combination."
          action={
            <Button
              onClick={() => {
                setQuery('')
                setActiveTag(null)
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-xs text-ink-faint" role="status">
            {visible.length} of {characters.length} character{characters.length === 1 ? '' : 's'}
            {activeTag ? (
              <>
                {' '}
                tagged <Badge>{activeTag}</Badge>
              </>
            ) : null}
          </p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={kit.stagger}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {visible.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                onDuplicate={(target) => duplicateCharacter(target.id)}
                onDelete={setPendingDelete}
              />
            ))}
          </motion.div>
        </>
      )}

      <CreateCharacterDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={(name, role) => {
          const character = createCharacter(project.id, name)
          if (role) {
            useWorkspaceStore.getState().updateCharacter(character.id, { role })
          }
          setCreateOpen(false)
          navigate(`/characters/${character.id}`)
        }}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this character?"
        description={
          pendingDelete
            ? `"${pendingDelete.name}" and their whole sheet will be removed. Other characters who list them in a relationship will keep the note, with the link cleared. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete character"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteCharacter(pendingDelete.id)
          setPendingDelete(null)
        }}
      />
    </>
  )
}
