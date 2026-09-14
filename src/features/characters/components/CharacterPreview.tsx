import { useMemo } from 'react'
import { useAssetUrl } from '@/features/assets/use-asset-url'
import { cn } from '@/lib/cn'
import type { Character, Expression, Outfit } from '@/types/character'

export interface CharacterPreviewProps {
  character: Character
  /** Which outfit the preview is showing, or null for the default. */
  outfit: Outfit | null
  /** Which expression the preview is showing, or null for none. */
  expression: Expression | null
  className?: string
}

/**
 * Character preview plate.
 *
 * What this is honestly doing: it shows the chosen expression's reference
 * image when one exists, and otherwise draws a generated identity plate from
 * the character's palette and initials. It does **not** draw the character --
 * PanelForge has no illustration engine, and a plate that implied otherwise
 * would be lying to the user about what they are looking at.
 *
 * It is deliberately built as real SVG rather than styled HTML. The composer
 * (phase 6) and export (phase 7) both render pages as SVG, and this is the
 * first place that pipeline is exercised: one renderer, screen and export.
 */
export function CharacterPreview({
  character,
  outfit,
  expression,
  className,
}: CharacterPreviewProps) {
  // Preference order: the expression's own reference, then the outfit's first
  // reference, then the character's first -- most specific image wins.
  const assetId =
    expression?.reference?.assetId ?? outfit?.references[0]?.assetId ?? character.references[0]?.assetId ?? null

  const { url, loading } = useAssetUrl(assetId)

  const initials = useMemo(() => {
    const parts = character.name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }, [character.name])

  const palette = character.palette.colors
  const plateFrom = palette[0] ?? 'var(--pf-surface-raised)'
  const plateTo = palette[1] ?? palette[0] ?? 'var(--pf-bg-inset)'
  const gradientId = `pf-plate-${character.id}`

  return (
    <figure className={cn('m-0 flex flex-col gap-3', className)}>
      <div className="overflow-hidden rounded-lg border border-line bg-bg-inset border-[length:var(--pf-border-width)]">
        {url ? (
          <img
            src={url}
            alt={
              expression
                ? `${character.name}, ${expression.name} expression`
                : `Reference image for ${character.name}`
            }
            className="block aspect-[3/4] w-full object-cover"
          />
        ) : (
          <svg
            viewBox="0 0 300 400"
            className="block aspect-[3/4] w-full"
            role="img"
            aria-label={`Generated placeholder plate for ${character.name}. No reference image attached.`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0.6" y2="1">
                <stop offset="0%" stopColor={plateFrom} />
                <stop offset="100%" stopColor={plateTo} />
              </linearGradient>
            </defs>

            <rect width="300" height="400" fill={`url(#${gradientId})`} />

            {/* Registration-style corner marks: this is a production plate, not artwork. */}
            {[
              [16, 16, 1, 1],
              [284, 16, -1, 1],
              [16, 384, 1, -1],
              [284, 384, -1, -1],
            ].map(([x, y, dx, dy]) => (
              <path
                key={`${x}-${y}`}
                d={`M${x} ${y! + dy! * 14} L${x} ${y} L${x! + dx! * 14} ${y}`}
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="1.5"
                fill="none"
              />
            ))}

            <text
              x="150"
              y="196"
              textAnchor="middle"
              fontSize="84"
              fontWeight="600"
              fill="currentColor"
              fillOpacity="0.5"
              fontFamily="var(--pf-font-display)"
            >
              {initials}
            </text>

            <text
              x="150"
              y="232"
              textAnchor="middle"
              fontSize="11"
              letterSpacing="2.5"
              fill="currentColor"
              fillOpacity="0.4"
              fontFamily="var(--pf-font-mono)"
            >
              NO REFERENCE
            </text>
          </svg>
        )}
      </div>

      <figcaption className="text-xs text-ink-muted">
        {loading ? (
          'Loading reference...'
        ) : url ? (
          <>
            Showing{' '}
            <span className="text-ink">
              {expression ? `${expression.name} expression` : outfit ? outfit.name : 'reference image'}
            </span>
          </>
        ) : (
          <>
            Generated plate from the palette and initials.{' '}
            <span className="text-ink-faint">Attach a reference image to replace it.</span>
          </>
        )}
      </figcaption>
    </figure>
  )
}
