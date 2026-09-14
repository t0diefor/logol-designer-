import { useEffect, useState } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ThemeSwitcher } from '@/theme/components/ThemeSwitcher'
import { formatBytes } from '@/lib/format'
import { assetTotalBytes, getStorageEstimate } from '@/lib/idb'
import { EMPTY_WORKSPACE, useWorkspaceStore } from '@/stores/workspace-store'
import { useTheme } from '@/theme/use-theme'
import { hasSampleProject, loadSampleProject } from '@/features/onboarding/sample-project'

/** Reads browser storage figures, so the numbers shown are measured not guessed. */
function useStorageUsage() {
  const [usage, setUsage] = useState<{ used: number; quota: number; assets: number } | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function read() {
      try {
        const [estimate, assets] = await Promise.all([getStorageEstimate(), assetTotalBytes()])
        if (cancelled) return
        if (!estimate) {
          setUnavailable(true)
          return
        }
        setUsage({ used: estimate.usage, quota: estimate.quota, assets })
      } catch {
        if (!cancelled) setUnavailable(true)
      }
    }

    void read()
    return () => {
      cancelled = true
    }
  }, [])

  return { usage, unavailable }
}

export function SettingsPage() {
  const { theme, reducedMotion } = useTheme()
  const { usage, unavailable } = useStorageUsage()
  const projects = useWorkspaceStore((state) => state.projects)
  const replaceAll = useWorkspaceStore((state) => state.replaceAll)
  const [confirmClear, setConfirmClear] = useState(false)
  const sampleLoaded = useWorkspaceStore(hasSampleProject)

  const projectCount = Object.keys(projects).length
  const percentUsed = usage && usage.quota > 0 ? (usage.used / usage.quota) * 100 : 0

  return (
    <>
      <PageHeader
        title="Settings"
        description="Appearance and local storage. Nothing here leaves this browser."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Appearance"
            description="Six themes, switchable at any time. Your choice is remembered on this device."
            actions={<ThemeSwitcher />}
          />
          <dl className="grid grid-cols-2 gap-y-3 text-sm">
            <dt className="text-ink-muted">Active theme</dt>
            <dd className="text-ink">{theme.name}</dd>
            <dt className="text-ink-muted">Base scheme</dt>
            <dd className="text-ink capitalize">{theme.scheme}</dd>
            <dt className="text-ink-muted">Motion style</dt>
            <dd className="text-ink capitalize">{theme.motion.style}</dd>
            <dt className="text-ink-muted">Motion currently</dt>
            <dd className="text-ink">{reducedMotion ? 'Reduced' : 'Full'}</dd>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Local storage"
            description="Your work lives in this browser's IndexedDB. Clearing site data deletes it."
          />

          {unavailable ? (
            <p className="text-sm text-ink-muted">
              This browser does not report storage usage, so no figure can be shown. Saving still
              works.
            </p>
          ) : !usage ? (
            <p className="text-sm text-ink-muted">Reading storage usage...</p>
          ) : (
            <>
              <div
                className="h-2 w-full overflow-hidden rounded-pill bg-bg-inset"
                role="img"
                aria-label={`${percentUsed.toFixed(1)} percent of available storage used`}
              >
                <div
                  className="h-full rounded-pill bg-primary transition-[width] duration-[var(--pf-duration-slow)]"
                  style={{ width: `${Math.min(100, Math.max(1, percentUsed))}%` }}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-y-3 text-sm">
                <dt className="text-ink-muted">Used</dt>
                <dd className="text-ink">{formatBytes(usage.used)}</dd>
                <dt className="text-ink-muted">Available</dt>
                <dd className="text-ink">{formatBytes(usage.quota)}</dd>
                <dt className="text-ink-muted">Assets</dt>
                <dd className="text-ink">{formatBytes(usage.assets)}</dd>
                <dt className="text-ink-muted">Projects</dt>
                <dd className="text-ink">{projectCount}</dd>
              </dl>
            </>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Sample project"
            description="A worked example with characters, a world, a timeline and a script, so every screen has something in it."
          />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-bg-inset p-4">
            <div>
              <p className="text-sm font-medium text-ink">Load &ldquo;The Lantern Wars&rdquo;</p>
              <p className="mt-1 text-sm text-ink-muted">
                Creates an ordinary project you can edit or delete like any other.
              </p>
            </div>
            <Button
              icon="book"
              disabled={sampleLoaded}
              onClick={() => loadSampleProject(useWorkspaceStore.getState)}
            >
              {sampleLoaded ? 'Already loaded' : 'Load sample project'}
            </Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Danger zone"
            description="Irreversible actions. Export your project data first if you want a copy."
          />
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-danger/40 bg-bg-inset p-4">
            <div>
              <p className="text-sm font-medium text-ink">Delete all local data</p>
              <p className="mt-1 text-sm text-ink-muted">
                Removes every project, comic, character and asset stored in this browser.
              </p>
            </div>
            <Button variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
              Delete everything
            </Button>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Delete all local data?"
        description={`All ${projectCount} project${projectCount === 1 ? '' : 's'} and everything inside them -- comics, characters and assets -- will be permanently removed from this browser. This cannot be undone.`}
        confirmLabel="Delete everything"
        destructive
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          replaceAll(EMPTY_WORKSPACE)
          setConfirmClear(false)
        }}
      />
    </>
  )
}
