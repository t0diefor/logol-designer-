import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { Input } from '@/components/ui/Input'
import { formatRelativeTime } from '@/lib/format'
import { useWorkspaceStore } from '@/stores/workspace-store'
import type { Character } from '@/types/character'
import { ListHeader } from './section-kit'

/**
 * Version history: the undo story for a character sheet.
 *
 * A form editor cannot sensibly offer keystroke-level undo across eight tabs,
 * so restore points are explicit instead. Any destructive-feeling action --
 * applying AI suggestions, restoring an older version -- snapshots first, so
 * there is always a way back.
 */
export function HistorySection({ character }: { character: Character }) {
  const snapshotCharacter = useWorkspaceStore((state) => state.snapshotCharacter)
  const restoreCharacterVersion = useWorkspaceStore((state) => state.restoreCharacterVersion)
  const deleteCharacterVersion = useWorkspaceStore((state) => state.deleteCharacterVersion)

  const [label, setLabel] = useState('')
  const [pendingRestore, setPendingRestore] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // Newest first: the version someone wants is nearly always a recent one.
  const versions = [...character.versions].reverse()

  return (
    <>
      <ListHeader
        title="History"
        description="Save a restore point before a big rewrite. Restoring is itself undoable -- the current state is saved first."
      />

      <div className="mb-6 flex flex-wrap items-end gap-2">
        <label className="min-w-56 flex-1">
          <span className="mb-1.5 block text-sm font-medium text-ink">Restore point name</span>
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Before the rewrite"
          />
        </label>
        <Button
          icon="copy"
          onClick={() => {
            snapshotCharacter(character.id, label.trim() || 'Manual save point')
            setLabel('')
            setMessage('Restore point saved.')
          }}
        >
          Save restore point
        </Button>
      </div>

      {message ? (
        <p role="status" className="mb-5 text-sm text-success">
          {message}
        </p>
      ) : null}

      {versions.length === 0 ? (
        <EmptyState
          icon="undo"
          title="No restore points yet"
          description="Save one before a major change. PanelForge also saves one automatically whenever you apply AI suggestions."
        />
      ) : (
        <ul className="flex flex-col">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0"
            >
              <span className="text-ink-faint">
                <Icon name="undo" size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{version.label || 'Unnamed restore point'}</p>
                <p className="text-xs text-ink-faint">{formatRelativeTime(version.createdAt)}</p>
              </div>
              <Button size="sm" onClick={() => setPendingRestore(version.id)}>
                Restore
              </Button>
              <IconButton
                icon="trash"
                label={`Delete restore point ${version.label}`}
                size="sm"
                variant="danger"
                onClick={() => deleteCharacterVersion(character.id, version.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingRestore !== null}
        title="Restore this version?"
        description="The sheet will be rolled back to how it looked at this restore point. The current state is saved as a new restore point first, so you can come straight back."
        confirmLabel="Restore"
        onCancel={() => setPendingRestore(null)}
        onConfirm={() => {
          if (pendingRestore) {
            const ok = restoreCharacterVersion(character.id, pendingRestore)
            setMessage(ok ? 'Version restored.' : 'That restore point could not be read.')
          }
          setPendingRestore(null)
        }}
      />
    </>
  )
}
