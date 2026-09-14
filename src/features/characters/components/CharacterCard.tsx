import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { IconButton } from '@/components/ui/IconButton'
import { useAssetUrl } from '@/features/assets/use-asset-url'
import { useMotionKit } from '@/hooks/use-motion-kit'
import { cn } from '@/lib/cn'
import { buildConsistencyChecklist, type Character } from '@/types/character'

export interface CharacterCardProps {
  character: Character
  onDuplicate: (character: Character) => void
  onDelete: (character: Character) => void
}

/** Two initials, used when a character has no reference image. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function CharacterCard({ character, onDuplicate, onDelete }: CharacterCardProps) {
  const kit = useMotionKit()
  const { url } = useAssetUrl(character.references[0]?.assetId ?? null)

  const checklist = buildConsistencyChecklist(character)
  const complete = checklist.filter((item) => item.complete).length
  const swatch = character.palette.colors[0] ?? null

  return (
    <motion.div variants={kit.item}>
      <Card interactive padded={false} className="h-full overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-4 p-4">
            {/* Portrait thumb: the reference image, or a palette-tinted monogram. */}
            <div
              className={cn(
                'flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md',
                'border border-line bg-bg-inset border-[length:var(--pf-border-width)]',
              )}
              style={swatch && !url ? { backgroundColor: swatch } : undefined}
            >
              {url ? (
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-lg text-ink-muted">
                  {initialsOf(character.name)}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <Link
                to={`/characters/${character.id}`}
                className="block truncate rounded-sm text-xl text-ink hover:underline"
              >
                {character.name}
              </Link>
              <p className="mt-0.5 truncate text-sm text-ink-muted">
                {character.role || <span className="italic text-ink-faint">No role set</span>}
                {character.pronouns ? (
                  <span className="text-ink-faint"> &middot; {character.pronouns}</span>
                ) : null}
              </p>
            </div>

            <div className="flex shrink-0 gap-1">
              <IconButton
                icon="copy"
                label={`Duplicate ${character.name}`}
                size="sm"
                onClick={() => onDuplicate(character)}
              />
              <IconButton
                icon="trash"
                label={`Delete ${character.name}`}
                size="sm"
                variant="danger"
                onClick={() => onDelete(character)}
              />
            </div>
          </div>

          {character.palette.colors.length > 0 ? (
            <div className="flex h-1.5" aria-hidden="true">
              {character.palette.colors.map((color, index) => (
                <span key={`${color}-${index}`} className="flex-1" style={{ backgroundColor: color }} />
              ))}
            </div>
          ) : null}

          <div className="mt-auto flex flex-wrap items-center gap-2 px-4 pb-4 pt-3">
            {character.tags.slice(0, 3).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
            {character.tags.length > 3 ? (
              <span className="text-xs text-ink-faint">+{character.tags.length - 3}</span>
            ) : null}

            <span
              className="ml-auto text-xs tabular-nums text-ink-faint"
              title={`${complete} of ${checklist.length} consistency checks complete`}
            >
              {complete}/{checklist.length} sheet
            </span>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
