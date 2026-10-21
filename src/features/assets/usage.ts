import type { WorkspaceData } from '@/stores/slices/types'

/**
 * Where an asset is actually used.
 *
 * Computed on demand rather than stored on the asset. A stored count drifts
 * the moment anything is deleted or re-pointed, and a wrong one is worse than
 * none: it is read right before a destructive action, so "used nowhere" has to
 * actually mean that.
 *
 * Every place an asset id can be referenced is enumerated here. If a later
 * phase adds another reference site -- a panel placement in phase 6 -- it must
 * be added to this function, or deleting an asset will silently break it.
 */

export type UsageKind =
  | 'project-cover'
  | 'comic-cover'
  | 'character-reference'
  | 'character-outfit'
  | 'character-expression'
  | 'location-reference'
  | 'object-reference'

export interface AssetUsage {
  kind: UsageKind
  /** The record using it, for a link back. */
  ownerId: string
  /** Human label, e.g. "Mira Halloway — Everyday". */
  label: string
  /** Route to the record, or null when it has no page of its own yet. */
  href: string | null
}

const KIND_LABEL: Record<UsageKind, string> = {
  'project-cover': 'Project cover',
  'comic-cover': 'Comic cover',
  'character-reference': 'Character reference',
  'character-outfit': 'Outfit reference',
  'character-expression': 'Expression reference',
  'location-reference': 'Location reference',
  'object-reference': 'Object reference',
}

export function usageKindLabel(kind: UsageKind): string {
  return KIND_LABEL[kind]
}

/** Every use of one asset, across the whole workspace. */
export function findAssetUsage(data: WorkspaceData, assetId: string): AssetUsage[] {
  const uses: AssetUsage[] = []

  for (const project of Object.values(data.projects)) {
    if (project.coverAssetId !== assetId) continue
    uses.push({
      kind: 'project-cover',
      ownerId: project.id,
      label: project.title,
      href: '/projects',
    })
  }

  for (const comic of Object.values(data.comics)) {
    if (comic.coverAsset?.assetId !== assetId) continue
    uses.push({ kind: 'comic-cover', ownerId: comic.id, label: comic.title, href: null })
  }

  for (const character of Object.values(data.characters)) {
    const href = `/characters/${character.id}`

    if (character.references.some((reference) => reference.assetId === assetId)) {
      uses.push({
        kind: 'character-reference',
        ownerId: character.id,
        label: character.name,
        href,
      })
    }

    for (const outfit of character.outfits) {
      if (!outfit.references.some((reference) => reference.assetId === assetId)) continue
      uses.push({
        kind: 'character-outfit',
        ownerId: character.id,
        label: `${character.name} — ${outfit.name}`,
        href,
      })
    }

    for (const expression of character.expressions) {
      if (expression.reference?.assetId !== assetId) continue
      uses.push({
        kind: 'character-expression',
        ownerId: character.id,
        label: `${character.name} — ${expression.name}`,
        href,
      })
    }
  }

  for (const location of Object.values(data.locations)) {
    if (!location.references.some((reference) => reference.assetId === assetId)) continue
    uses.push({
      kind: 'location-reference',
      ownerId: location.id,
      label: location.name,
      href: '/world',
    })
  }

  for (const object of Object.values(data.worldObjects)) {
    if (!object.references.some((reference) => reference.assetId === assetId)) continue
    uses.push({ kind: 'object-reference', ownerId: object.id, label: object.name, href: '/world' })
  }

  return uses
}

/**
 * Usage counts for every asset in one pass.
 *
 * The library renders a badge per card, and calling `findAssetUsage` once per
 * asset would walk the whole workspace once per asset. This walks it once.
 */
export function countAllAssetUsage(data: WorkspaceData): Map<string, number> {
  const counts = new Map<string, number>()
  const bump = (id: string | null | undefined) => {
    if (!id) return
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }

  for (const project of Object.values(data.projects)) bump(project.coverAssetId)
  for (const comic of Object.values(data.comics)) bump(comic.coverAsset?.assetId)

  for (const character of Object.values(data.characters)) {
    for (const reference of character.references) bump(reference.assetId)
    for (const outfit of character.outfits) {
      for (const reference of outfit.references) bump(reference.assetId)
    }
    for (const expression of character.expressions) bump(expression.reference?.assetId)
  }

  for (const location of Object.values(data.locations)) {
    for (const reference of location.references) bump(reference.assetId)
  }

  for (const object of Object.values(data.worldObjects)) {
    for (const reference of object.references) bump(reference.assetId)
  }

  return counts
}
