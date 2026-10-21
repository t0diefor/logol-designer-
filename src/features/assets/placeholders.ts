import { newId, nowIso } from '@/lib/id'
import { assetPut } from '@/lib/idb'
import type { Asset, AssetKind } from '@/types/asset'

/**
 * Procedurally drawn placeholder assets.
 *
 * The brief asks for placeholders when nothing has been uploaded, and the
 * composer in phase 6 needs *something* to place. These are generated as SVG
 * and stored as real assets, so they behave identically to an upload: same
 * blob store, same usage tracking, same export path.
 *
 * They are deliberately obvious -- labelled, flat, and drawn in the theme's
 * own neutral tones -- so a placeholder can never be mistaken for finished
 * artwork in a page proof.
 */

interface PlaceholderSpec {
  name: string
  kind: AssetKind
  width: number
  height: number
  tint: string
  label: string
}

const SPECS: PlaceholderSpec[] = [
  { name: 'Background — interior', kind: 'background', width: 1200, height: 900, tint: '#3A4252', label: 'INTERIOR' },
  { name: 'Background — exterior night', kind: 'background', width: 1200, height: 900, tint: '#232B3B', label: 'EXT. NIGHT' },
  { name: 'Background — rooftop', kind: 'background', width: 1200, height: 900, tint: '#42394A', label: 'ROOFTOP' },
  { name: 'Prop — lantern', kind: 'prop', width: 600, height: 600, tint: '#5A4A2C', label: 'PROP' },
  { name: 'Prop — ledger', kind: 'prop', width: 600, height: 600, tint: '#4A4036', label: 'PROP' },
  { name: 'Figure — standing', kind: 'character-reference', width: 600, height: 900, tint: '#3E3747', label: 'FIGURE' },
  { name: 'Figure — seated', kind: 'character-reference', width: 600, height: 900, tint: '#37404A', label: 'FIGURE' },
  { name: 'Panel tone — flat', kind: 'panel', width: 900, height: 600, tint: '#2E3340', label: 'TONE' },
]

/** Draws one placeholder as an SVG string. */
function drawPlaceholder({ width, height, tint, label }: PlaceholderSpec): string {
  const stroke = 'rgba(255,255,255,0.22)'
  const inset = Math.round(Math.min(width, height) * 0.045)
  const fontSize = Math.round(Math.min(width, height) * 0.075)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`,
    `<rect width="${width}" height="${height}" fill="${tint}"/>`,
    // Diagonals, the universal "this is a placeholder" mark.
    `<path d="M0 0 L${width} ${height} M${width} 0 L0 ${height}" stroke="${stroke}" stroke-width="2" fill="none"/>`,
    `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" fill="none" stroke="${stroke}" stroke-width="3"/>`,
    `<text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" fill="rgba(255,255,255,0.75)" font-family="monospace" font-size="${fontSize}" letter-spacing="${Math.round(fontSize * 0.14)}">${label}</text>`,
    `<text x="${width / 2}" y="${height / 2 + fontSize * 1.5}" text-anchor="middle" fill="rgba(255,255,255,0.45)" font-family="monospace" font-size="${Math.round(fontSize * 0.45)}">${width}×${height} PLACEHOLDER</text>`,
    `</svg>`,
  ].join('')
}

/**
 * Creates the placeholder set for a project and writes the blobs.
 *
 * Returns the asset records for the caller to add to the store, so the store
 * update happens in one batch rather than eight.
 */
export async function createPlaceholderAssets(projectId: string): Promise<Asset[]> {
  const created: Asset[] = []

  for (const spec of SPECS) {
    const svg = drawPlaceholder(spec)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const id = newId()
    const timestamp = nowIso()

    await assetPut({
      id,
      blob,
      mimeType: 'image/svg+xml',
      byteSize: blob.size,
      createdAt: timestamp,
    })

    created.push({
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      name: spec.name,
      kind: spec.kind,
      source: 'placeholder',
      mimeType: 'image/svg+xml',
      byteSize: blob.size,
      width: spec.width,
      height: spec.height,
      blobKey: id,
      generationPrompt: '',
      generationProvider: '',
      collectionIds: [],
      tags: ['placeholder'],
      favorite: false,
      description: 'Generated placeholder. Replace it with real artwork when you have some.',
    })
  }

  return created
}

export const PLACEHOLDER_COUNT = SPECS.length
