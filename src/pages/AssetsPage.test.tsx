import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/render'
import { AssetsPage } from './AssetsPage'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { EMPTY_WORKSPACE } from '@/stores/slices/types'
import { newId, nowIso } from '@/lib/id'
import type { Asset } from '@/types/asset'

const store = () => useWorkspaceStore.getState()

/*
 * jsdom has no IndexedDB, so AssetThumb cannot resolve a blob. That is fine:
 * these tests are about filtering, usage and deletion, and the thumbnail's own
 * missing-data state is exercised in the browser pass instead.
 */
vi.mock('@/features/assets/use-asset-url', () => ({
  useAssetUrl: () => ({ url: null, loading: false, missing: true }),
}))

function seedAsset(projectId: string, overrides: Partial<Asset> = {}) {
  const id = newId()
  const timestamp = nowIso()
  const asset: Asset = {
    id,
    createdAt: timestamp,
    updatedAt: timestamp,
    ownerId: null,
    projectId,
    name: 'Harbour at night',
    kind: 'background',
    source: 'uploaded',
    mimeType: 'image/png',
    byteSize: 2048,
    width: 800,
    height: 600,
    blobKey: id,
    generationPrompt: '',
    generationProvider: '',
    collectionIds: [],
    tags: [],
    favorite: false,
    description: '',
    ...overrides,
  }
  store().addAsset(asset)
  return asset
}

function seedProject() {
  useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  return store().createProject({ title: 'The Lantern Wars', logline: '', genre: '' }).id
}

describe('AssetsPage', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ ...EMPTY_WORKSPACE, currentProjectId: null, currentComicId: null })
  })

  it('asks for a project first', () => {
    renderWithProviders(<AssetsPage />)
    expect(screen.getByRole('heading', { name: 'No project selected' })).toBeInTheDocument()
  })

  it('offers placeholders when the library is empty', () => {
    seedProject()
    renderWithProviders(<AssetsPage />)
    expect(screen.getByRole('heading', { name: 'No assets yet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate \d+ placeholders/ })).toBeInTheDocument()
  })

  it('lists assets and reports the total size', () => {
    const projectId = seedProject()
    seedAsset(projectId, { name: 'Harbour at night', byteSize: 2048 })
    seedAsset(projectId, { name: 'Lantern prop', byteSize: 1024 })

    renderWithProviders(<AssetsPage />)

    expect(screen.getByRole('button', { name: /Harbour at night/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('2 of 2')
    expect(screen.getByRole('status')).toHaveTextContent('3.0 KB')
  })

  it('marks assets nobody references as unused', () => {
    const projectId = seedProject()
    seedAsset(projectId)

    renderWithProviders(<AssetsPage />)
    expect(screen.getAllByText('unused').length).toBeGreaterThan(0)
    expect(screen.getByRole('status')).toHaveTextContent('1 unused')
  })

  it('counts a reference held by a character', () => {
    const projectId = seedProject()
    const asset = seedAsset(projectId)
    const character = store().createCharacter(projectId, 'Mira')
    store().updateCharacter(character.id, { references: [{ assetId: asset.id, label: '' }] })

    renderWithProviders(<AssetsPage />)
    expect(screen.getByText('1 use')).toBeInTheDocument()
    expect(screen.queryByText('unused')).not.toBeInTheDocument()
  })

  it('filters by search across name and tags', async () => {
    const projectId = seedProject()
    seedAsset(projectId, { name: 'Harbour at night' })
    seedAsset(projectId, { name: 'Lantern prop', tags: ['brass'] })

    renderWithProviders(<AssetsPage />)
    await userEvent.type(screen.getByLabelText('Search assets'), 'brass')

    expect(screen.getByRole('button', { name: /Lantern prop/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Harbour at night/ })).not.toBeInTheDocument()
  })

  it('filters to favourites only', async () => {
    const projectId = seedProject()
    seedAsset(projectId, { name: 'Harbour at night', favorite: true })
    seedAsset(projectId, { name: 'Lantern prop' })

    renderWithProviders(<AssetsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Favourites' }))

    expect(screen.getByRole('button', { name: /Harbour at night/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Lantern prop/ })).not.toBeInTheDocument()
  })

  it('switches to list view', async () => {
    const projectId = seedProject()
    seedAsset(projectId)

    renderWithProviders(<AssetsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'List view' }))

    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('creates a collection and files an asset into it', async () => {
    const projectId = seedProject()
    const asset = seedAsset(projectId)

    renderWithProviders(<AssetsPage />)

    await userEvent.type(screen.getByLabelText('New collection name'), 'Moodboard')
    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    await userEvent.click(screen.getByRole('button', { name: /Harbour at night/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to collection Moodboard' }))

    expect(store().assets[asset.id]!.collectionIds).toHaveLength(1)
  })

  it('warns how many places an asset is used before deleting it', async () => {
    const projectId = seedProject()
    const asset = seedAsset(projectId)
    const character = store().createCharacter(projectId, 'Mira')
    store().updateCharacter(character.id, { references: [{ assetId: asset.id, label: '' }] })

    renderWithProviders(<AssetsPage />)
    await userEvent.click(screen.getByRole('button', { name: /Harbour at night/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // A bare "are you sure" would hide that something else breaks.
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/used in 1 place/i)).toBeInTheDocument()
  })

  it('says plainly when deleting an asset affects nothing', async () => {
    const projectId = seedProject()
    seedAsset(projectId)

    renderWithProviders(<AssetsPage />)
    await userEvent.click(screen.getByRole('button', { name: /Harbour at night/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    // The sidebar says this too, so assert it on the confirmation itself.
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/not used anywhere/i)).toBeInTheDocument()
  })

  it('shows where an asset is used, with a link back', async () => {
    const projectId = seedProject()
    const asset = seedAsset(projectId)
    const character = store().createCharacter(projectId, 'Mira Halloway')
    store().updateCharacter(character.id, {
      expressions: [
        { id: newId(), name: 'Furious', description: '', reference: { assetId: asset.id, label: '' } },
      ],
    })

    renderWithProviders(<AssetsPage />)
    await userEvent.click(screen.getByRole('button', { name: /Harbour at night/ }))

    const link = screen.getByRole('link', { name: 'Mira Halloway — Furious' })
    expect(link).toHaveAttribute('href', `/characters/${character.id}`)
  })

  it('flags a placeholder as not artwork', async () => {
    const projectId = seedProject()
    seedAsset(projectId, { source: 'placeholder', name: 'Background — interior' })

    renderWithProviders(<AssetsPage />)
    await userEvent.click(screen.getByRole('button', { name: /Background/ }))

    expect(screen.getByText(/Generated placeholder, not artwork/)).toBeInTheDocument()
  })

  it('explains an empty filter result rather than showing a blank grid', async () => {
    const projectId = seedProject()
    seedAsset(projectId)

    renderWithProviders(<AssetsPage />)
    await userEvent.type(screen.getByLabelText('Search assets'), 'zzzzz')

    expect(screen.getByRole('heading', { name: 'Nothing matches' })).toBeInTheDocument()
  })

  it('only shows assets from the selected project', () => {
    const projectId = seedProject()
    seedAsset(projectId, { name: 'Mine' })

    const other = store().createProject({ title: 'Other', logline: '', genre: '' })
    seedAsset(other.id, { name: 'Theirs' })
    store().setCurrentProject(projectId)

    renderWithProviders(<AssetsPage />)

    expect(screen.getByRole('button', { name: /Mine/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Theirs/ })).not.toBeInTheDocument()
  })
})
