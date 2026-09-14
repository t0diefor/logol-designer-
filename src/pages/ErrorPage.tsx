import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Icon } from '@/components/ui/Icon'

/**
 * Route-level error boundary.
 *
 * Shows the real error message rather than a generic apology: the person
 * seeing this is usually the developer, and a message they can act on beats a
 * reassuring one they cannot. Saved work is untouched by a render error, and
 * the copy says so, because the first worry is always "did I lose it?".
 */
export function ErrorPage() {
  const error = useRouteError()

  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <Card className="max-w-lg">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-danger">
            <Icon name="alert" size={22} title="Error" />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl text-ink">Something broke</h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Your saved work is stored separately and has not been affected.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-md bg-bg-inset p-3 font-mono text-xs text-ink-muted">
              {detail}
            </pre>
            <div className="mt-5 flex gap-2">
              <Button variant="primary" onClick={() => window.location.assign('/')}>
                Back to dashboard
              </Button>
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
