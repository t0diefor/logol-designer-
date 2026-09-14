import { useNavigate } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <EmptyState
      icon="search"
      title="Page not found"
      description="That route does not exist in PanelForge. It may have been a link from a later phase of the build."
      action={
        <Button variant="primary" onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
      }
    />
  )
}
