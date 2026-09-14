import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Select } from '@/components/ui/Input'
import { useAssetUrl } from '@/features/assets/use-asset-url'
import { ACCEPTED_IMAGE_TYPES, uploadImageAsset } from '@/features/assets/upload'
import { cn } from '@/lib/cn'
import { formatBytes } from '@/lib/format'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Asset } from '@/types/asset'
import type { Character } from '@/types/character'
import { ListHeader } from './section-kit'

/** One stored reference image, with the controls that act on it. */
function ReferenceTile({
  asset,
  character,
  onDetach,
  onAssignExpression,
}: {
  asset: Asset
  character: Character
  onDetach: () => void
  onAssignExpression: (expressionId: string) => void
}) {
  const { url, loading, missing } = useAssetUrl(asset.id)

  const assignedTo = character.expressions.find(
    (expression) => expression.reference?.assetId === asset.id,
  )

  return (
    <li className="overflow-hidden rounded-lg border border-line bg-surface border-[length:var(--pf-border-width)]">
      <div className="relative aspect-[4/3] bg-bg-inset">
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-ink-faint">
            Loading...
          </div>
        ) : missing || !url ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-3 text-center text-ink-faint">
            <Icon name="alert" size={18} />
            <span className="text-xs">Image data is missing from this browser</span>
          </div>
        ) : (
          <img src={url} alt={asset.name} className="h-full w-full object-cover" />
        )}

        <div className="absolute right-2 top-2">
          <IconButton
            icon="trash"
            label={`Delete ${asset.name}`}
            size="sm"
            variant="surface"
            onClick={onDetach}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <p className="truncate text-sm text-ink" title={asset.name}>
          {asset.name}
        </p>
        <p className="text-xs text-ink-faint">
          {asset.width > 0 ? `${asset.width}×${asset.height} · ` : ''}
          {formatBytes(asset.byteSize)}
        </p>

        {character.expressions.length > 0 ? (
          <label className="mt-1 block">
            <span className="mb-1 block text-xs text-ink-faint">Use for expression</span>
            <Select
              value={assignedTo?.id ?? ''}
              onChange={(event) => onAssignExpression(event.target.value)}
              aria-label={`Assign ${asset.name} to an expression`}
            >
              <option value="">Not assigned</option>
              {character.expressions.map((expression) => (
                <option key={expression.id} value={expression.id}>
                  {expression.name}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
      </div>
    </li>
  )
}

export function ReferencesSection({
  character,
  onChange,
}: {
  character: Character
  onChange: (changes: Partial<Character>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  const assets = useWorkspaceStore((state) => state.assets)
  const addAsset = useWorkspaceStore((state) => state.addAsset)
  const deleteAsset = useWorkspaceStore((state) => state.deleteAsset)

  const attached = character.references
    .map((reference) => assets[reference.assetId])
    .filter((asset): asset is Asset => Boolean(asset))

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    setBusy(true)
    setErrors([])

    const failures: string[] = []
    const added: { assetId: string; label: string }[] = []

    // Sequential rather than parallel: IndexedDB writes contend with each
    // other, and a clear per-file error beats a fast pile-up of failures.
    for (const file of Array.from(files)) {
      const result = await uploadImageAsset(file, {
        projectId: character.projectId,
        kind: 'character-reference',
        tags: [character.name.toLowerCase()],
      })

      if (result.ok) {
        addAsset(result.asset)
        added.push({ assetId: result.asset.id, label: result.asset.name })
      } else {
        failures.push(result.error.message)
      }
    }

    if (added.length > 0) {
      onChange({ references: [...character.references, ...added].slice(0, 40) })
    }
    setErrors(failures)
    setBusy(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function assignExpression(assetId: string, expressionId: string) {
    const asset = assets[assetId]
    onChange({
      expressions: character.expressions.map((expression) => {
        // Clear this asset from any other expression first, so one image is
        // never the reference for two different faces.
        if (expression.reference?.assetId === assetId && expression.id !== expressionId) {
          return { ...expression, reference: null }
        }
        if (expression.id !== expressionId) return expression
        return { ...expression, reference: { assetId, label: asset?.name ?? '' } }
      }),
    })
  }

  return (
    <>
      <ListHeader
        title="Reference images"
        description="Written description alone drifts between artists. An image is the tiebreaker. Files are stored in this browser, never uploaded anywhere."
        action={
          <Button
            icon="plus"
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            Add images
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {/* Drop zone. The button above remains the keyboard-accessible path. */}
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFiles(event.dataTransfer.files)
        }}
        className={cn(
          'mb-5 rounded-lg border border-dashed px-5 py-6 text-center text-sm',
          'transition-colors duration-[var(--pf-duration-fast)]',
          dragging ? 'border-primary bg-surface-raised text-ink' : 'border-line text-ink-muted',
        )}
      >
        Drop images here, or use the button above. PNG, JPEG, WebP, GIF or SVG, up to 12 MB each.
      </div>

      {errors.length > 0 ? (
        <ul role="alert" className="mb-5 flex flex-col gap-1.5">
          {errors.map((message) => (
            <li
              key={message}
              className="rounded-md border border-danger/40 bg-bg-inset px-3 py-2 text-sm text-danger"
            >
              {message}
            </li>
          ))}
        </ul>
      ) : null}

      {attached.length === 0 ? (
        <EmptyState
          icon="image"
          title="No reference images"
          description="Add a face, a full-body turnaround, or anything you would hand an artist. They stay on this device."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {attached.map((asset) => (
            <ReferenceTile
              key={asset.id}
              asset={asset}
              character={character}
              onDetach={() => deleteAsset(asset.id)}
              onAssignExpression={(expressionId) => assignExpression(asset.id, expressionId)}
            />
          ))}
        </ul>
      )}
    </>
  )
}
