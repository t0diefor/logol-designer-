import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProposalGenerator, ReviewableProposal } from './types'

export type AIRunState = 'idle' | 'running' | 'review' | 'error' | 'empty'

/**
 * Drives one run of a proposal-generating AI tool, for any entity type.
 *
 * Handles the four states the brief asks for -- loading, error, cancellation,
 * and a reviewable result -- plus a fifth that matters in practice: `empty`,
 * when the tool has nothing to suggest because every field is already written.
 * Showing "no suggestions, your sheet is complete" is a better answer than an
 * empty review list that looks broken.
 */
export function useExpansion<T>(entity: T | null, generate: ProposalGenerator<T>) {
  const [state, setState] = useState<AIRunState>('idle')
  const [proposals, setProposals] = useState<ReviewableProposal[]>([])
  const [error, setError] = useState<string | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // Abort any in-flight request if the component unmounts, so a resolved
  // promise cannot call setState on a component that is gone.
  useEffect(() => {
    return () => controllerRef.current?.abort()
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState('idle')
    setProposals([])
    setError(null)
  }, [])

  const run = useCallback(async () => {
    if (entity === null) return

    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    setState('running')
    setError(null)
    setProposals([])

    try {
      const result = await generate(entity, { signal: controller.signal })
      if (controller.signal.aborted) return

      if (result.length === 0) {
        setState('empty')
        return
      }

      setProposals(
        result.map((proposal) => ({ ...proposal, decision: 'pending', edited: proposal.proposed })),
      )
      setState('review')
    } catch (caught) {
      // A cancellation is a user action, not a failure, so it returns to idle
      // rather than showing an error the user caused on purpose.
      if (caught instanceof DOMException && caught.name === 'AbortError') {
        setState('idle')
        return
      }
      setError(caught instanceof Error ? caught.message : 'The suggestion could not be generated.')
      setState('error')
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }, [entity, generate])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState('idle')
  }, [])

  const decide = useCallback((key: string, decision: ReviewableProposal['decision']) => {
    setProposals((current) =>
      current.map((proposal) => (proposal.key === key ? { ...proposal, decision } : proposal)),
    )
  }, [])

  const edit = useCallback((key: string, value: string) => {
    setProposals((current) =>
      current.map((proposal) => (proposal.key === key ? { ...proposal, edited: value } : proposal)),
    )
  }, [])

  const decideAll = useCallback((decision: ReviewableProposal['decision']) => {
    setProposals((current) => current.map((proposal) => ({ ...proposal, decision })))
  }, [])

  /**
   * Re-bases a stale proposal onto the field's current value.
   *
   * This is the explicit "yes, replace what I just wrote" action. It is the
   * only way a stale proposal can ever be applied, and it takes a deliberate
   * click after the panel has shown the user exactly what would be lost.
   */
  const rebase = useCallback((key: string, liveValue: string) => {
    setProposals((current) =>
      current.map((proposal) =>
        proposal.key === key ? { ...proposal, current: liveValue, decision: 'accepted' } : proposal,
      ),
    )
  }, [])

  const acceptedCount = proposals.filter((proposal) => proposal.decision === 'accepted').length
  const pendingCount = proposals.filter((proposal) => proposal.decision === 'pending').length

  return {
    state,
    proposals,
    error,
    acceptedCount,
    pendingCount,
    run,
    cancel,
    reset,
    decide,
    edit,
    decideAll,
    rebase,
  }
}

export type ExpansionTool = ReturnType<typeof useExpansion>
