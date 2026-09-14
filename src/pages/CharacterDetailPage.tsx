import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/Input'
import { Tabs, type TabDefinition } from '@/components/ui/Tabs'
import { AIExpansionPanel } from '@/features/ai/components/AIExpansionPanel'
import { useExpansion } from '@/features/ai/use-expansion'
import { expandCharacter } from '@/features/ai/provider-registry'
import { characterAdapter } from '@/features/ai/adapters/character-adapter'
import { CharacterPreview } from '@/features/characters/components/CharacterPreview'
import { ConsistencyPanel } from '@/features/characters/components/ConsistencyPanel'
import { AppearanceSection } from '@/features/characters/components/sections/AppearanceSection'
import { ExpressionsSection } from '@/features/characters/components/sections/ExpressionsSection'
import { HistorySection } from '@/features/characters/components/sections/HistorySection'
import { IdentitySection } from '@/features/characters/components/sections/IdentitySection'
import { ReferencesSection } from '@/features/characters/components/sections/ReferencesSection'
import { RelationshipsSection } from '@/features/characters/components/sections/RelationshipsSection'
import { StorySection } from '@/features/characters/components/sections/StorySection'
import { WardrobeSection } from '@/features/characters/components/sections/WardrobeSection'
import { formatRelativeTime } from '@/lib/format'
import { useCharacter, useCharactersForProject } from '@/stores/workspace-selectors'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Character } from '@/types/character'

type TabId =
  | 'identity'
  | 'appearance'
  | 'wardrobe'
  | 'expressions'
  | 'story'
  | 'relationships'
  | 'references'
  | 'assist'
  | 'history'

export function CharacterDetailPage() {
  const { characterId } = useParams<{ characterId: string }>()
  const navigate = useNavigate()

  const character = useCharacter(characterId)
  const cast = useCharactersForProject(character?.projectId ?? null)
  const updateCharacter = useWorkspaceStore((state) => state.updateCharacter)
  const snapshotCharacter = useWorkspaceStore((state) => state.snapshotCharacter)

  const [tab, setTab] = useState<TabId>('identity')
  const [outfitId, setOutfitId] = useState<string>('')
  const [expressionId, setExpressionId] = useState<string>('')
  const [applied, setApplied] = useState<string | null>(null)

  const expansion = useExpansion(character, expandCharacter)

  const tabs = useMemo<TabDefinition[]>(() => {
    if (!character) return []
    return [
      { id: 'identity', label: 'Identity', icon: 'user' },
      { id: 'appearance', label: 'Appearance', icon: 'palette' },
      { id: 'wardrobe', label: 'Wardrobe', badge: character.outfits.length },
      { id: 'expressions', label: 'Expressions', badge: character.expressions.length },
      { id: 'story', label: 'Story', icon: 'pen' },
      { id: 'relationships', label: 'Relationships', badge: character.relationships.length },
      { id: 'references', label: 'References', icon: 'image', badge: character.references.length },
      { id: 'assist', label: 'Assist', icon: 'sparkles' },
      { id: 'history', label: 'History', icon: 'undo', badge: character.versions.length },
    ]
  }, [character])

  if (!character) {
    return (
      <EmptyState
        icon="search"
        title="Character not found"
        description="This character may have been deleted, or the link points at a different browser's data."
        action={
          <Button variant="primary" onClick={() => navigate('/characters')}>
            Back to characters
          </Button>
        }
      />
    )
  }

  const onChange = (changes: Partial<Character>) => updateCharacter(character.id, changes)

  const previewOutfit =
    character.outfits.find((outfit) => outfit.id === outfitId) ??
    character.outfits.find((outfit) => outfit.isDefault) ??
    null

  const previewExpression =
    character.expressions.find((expression) => expression.id === expressionId) ?? null

  return (
    <>
      {/* Breadcrumb back to the cast, so the tab bar is not the only way out. */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm">
        <Link to="/characters" className="rounded-sm text-ink-muted hover:text-ink hover:underline">
          Characters
        </Link>
        <Icon name="chevronRight" size={14} className="text-ink-faint" />
        <span className="truncate text-ink">{character.name}</span>
      </nav>

      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl text-ink">{character.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {character.role ? <Badge tone="primary">{character.role}</Badge> : null}
            {character.pronouns ? <Badge>{character.pronouns}</Badge> : null}
            {character.ageRange ? <Badge>{character.ageRange}</Badge> : null}
            <span className="text-xs text-ink-faint">
              Edited {formatRelativeTime(character.updatedAt)}
            </span>
          </p>
        </div>
      </div>

      {applied ? (
        <p
          role="status"
          className="mb-5 rounded-md border border-success/40 bg-bg-inset px-3 py-2.5 text-sm text-ink-muted"
        >
          {applied}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => {
              setTab('history')
              setApplied(null)
            }}
          >
            View history
          </button>
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <Tabs tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)}>
            {tab === 'identity' ? <IdentitySection character={character} onChange={onChange} /> : null}
            {tab === 'appearance' ? <AppearanceSection character={character} onChange={onChange} /> : null}
            {tab === 'wardrobe' ? <WardrobeSection character={character} onChange={onChange} /> : null}
            {tab === 'expressions' ? <ExpressionsSection character={character} onChange={onChange} /> : null}
            {tab === 'story' ? <StorySection character={character} onChange={onChange} /> : null}
            {tab === 'relationships' ? (
              <RelationshipsSection character={character} cast={cast} onChange={onChange} />
            ) : null}
            {tab === 'references' ? <ReferencesSection character={character} onChange={onChange} /> : null}
            {tab === 'history' ? <HistorySection character={character} /> : null}
            {tab === 'assist' ? (
              <AIExpansionPanel
                entity={character}
                adapter={characterAdapter}
                title="Expand this character"
                summary="Suggests starting text for fields you have left empty: appearance, traits, weaknesses, goals, dialogue style and a backstory opener."
                reads="This character's name and role. Nothing else, and nothing from other projects."
                tool={expansion}
                onApply={(patch, count) => {
                  // Snapshot before writing, so applying suggestions is always
                  // reversible from the History tab.
                  snapshotCharacter(character.id, 'Before AI suggestions')
                  updateCharacter(character.id, patch)
                  setApplied(
                    `Applied ${count} suggestion${count === 1 ? '' : 's'}. A restore point was saved first.`,
                  )
                }}
              />
            ) : null}
          </Tabs>
        </div>

        {/* Sidebar: preview and checklist stay visible while editing any tab. */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20 lg:self-start">
          <Card padded={false} className="p-4">
            <CharacterPreview
              character={character}
              outfit={previewOutfit}
              expression={previewExpression}
            />

            {character.outfits.length > 0 ? (
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-ink-faint">Outfit</span>
                <Select
                  value={outfitId || (previewOutfit?.id ?? '')}
                  onChange={(event) => setOutfitId(event.target.value)}
                  aria-label="Preview outfit"
                >
                  {character.outfits.map((outfit) => (
                    <option key={outfit.id} value={outfit.id}>
                      {outfit.name}
                      {outfit.isDefault ? ' (default)' : ''}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}

            {character.expressions.length > 0 ? (
              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-ink-faint">Expression</span>
                <Select
                  value={expressionId}
                  onChange={(event) => setExpressionId(event.target.value)}
                  aria-label="Preview expression"
                >
                  <option value="">None</option>
                  {character.expressions.map((expression) => (
                    <option key={expression.id} value={expression.id}>
                      {expression.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
          </Card>

          <Card>
            <ConsistencyPanel character={character} />
          </Card>
        </aside>
      </div>
    </>
  )
}
