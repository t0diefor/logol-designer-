import { useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { ACCEPTED_IMAGE_TYPES, uploadImageAsset } from '../upload'
import type { AssetKind } from '@/types/asset'

export interface UploadZoneProps {
  projectId: string
  kind: AssetKind
  /** Collections to file new uploads into. */
  collectionIds?: string[]
  compact?: boolean
}

/**
 * Drag-and-drop upload for the library.
 *
 * Files are processed one at a time rather than in parallel: IndexedDB writes
 * contend with each other, and a clear per-file error beats a fast pile-up of
 * failures with no way to tell which file caused which.
 */
export function UploadZone({ projectId, kind, collectionIds = [], compact = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addAsset = useWorkspaceStore((state) => state.addAsset)
  const setAssetCollections = useWorkspaceStore((state) => state.setAssetCollections)

  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [added, setAdded] = useState(0)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    setBusy(true)
    setErrors([])
    setAdded(0)
    setProgress({ done: 0, total: files.length })

    const failures: string[] = []
    let count = 0

    for (const [index, file] of Array.from(files).entries()) {
      const result = await uploadImageAsset(file, { projectId, kind })
      if (result.ok) {
        addAsset(result.asset)
        if (collectionIds.length > 0) setAssetCollections(result.asset.id, collectionIds)
        count += 1
      } else {
        failures.push(result.error.message)
      }
      setProgress({ done: index + 1, total: files.length })
    }

    setAdded(count)
    setErrors(failures)
    setBusy(false)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

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
          'rounded-lg border border-dashed text-center',
          'transition-colors duration-[var(--pf-duration-fast)]',
          compact ? 'px-4 py-4' : 'px-6 py-8',
          dragging ? 'border-primary bg-surface-raised' : 'border-line',
        )}
      >
        <p className={cn('text-sm', dragging ? 'text-ink' : 'text-ink-muted')}>
          Drop images here
        </p>
        <p className="mt-1 text-xs text-ink-faint">
          PNG, JPEG, WebP, GIF or SVG, up to 12 MB each. Stored in this browser, never uploaded.
        </p>
        <Button
          className="mt-3"
          icon="plus"
          loading={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy && progress ? `Adding ${progress.done} of ${progress.total}` : 'Choose files'}
        </Button>
      </div>

      {added > 0 ? (
        <p role="status" className="mt-3 text-sm text-success">
          Added {added} image{added === 1 ? '' : 's'}.
        </p>
      ) : null}

      {errors.length > 0 ? (
        <ul role="alert" className="mt-3 flex flex-col gap-1.5">
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
    </div>
  )
}
