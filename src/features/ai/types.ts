/**
 * The AI contract, entity-agnostic.
 *
 * Two rules shape everything in this folder:
 *
 * 1. **Nothing is applied without an explicit decision.** A tool returns
 *    proposals. The user accepts, edits or rejects each one. There is no code
 *    path that writes a generated value straight onto a record.
 *
 * 2. **Capability is never overstated.** A provider reports what it can
 *    actually do. Mock mode says so in the UI, and tools that need a real
 *    provider are disabled rather than quietly falling back to invented
 *    output presented as the real thing.
 *
 * The proposal machinery is generic over the entity being edited so that
 * characters, locations, factions and (later) scenes all share one reviewed
 * apply path. Each entity supplies a `FieldAdapter` saying how to read and
 * write its fields as plain strings; everything else is common.
 */

export type AIToolId =
  | 'character.expand'
  | 'character.consistency'
  | 'world.expand'
  | 'story.outline'
  | 'story.rewrite'
  | 'panel.describe'
  | 'image.generate'

/**
 * A single suggested change to one field.
 *
 * `current` is captured at proposal time so the review UI can show exactly
 * what would be replaced, and so a proposal generated against stale data can
 * be detected rather than silently clobbering a newer edit.
 */
export interface FieldProposal {
  /** Dotted path into the entity, e.g. `appearance.hair`. */
  key: string
  /** Human label for the review UI. */
  label: string
  /** The value as it stood when the proposal was made. */
  current: string
  /** What the tool suggests instead. Editable by the user before accepting. */
  proposed: string
  /** Why the tool suggested it. Shown so the user can judge, not just accept. */
  rationale: string
}

export type ProposalDecision = 'pending' | 'accepted' | 'rejected'

export interface ReviewableProposal extends FieldProposal {
  decision: ProposalDecision
  /** The user's edited version, when they have changed the proposed text. */
  edited: string
}

/**
 * How to read and write one entity's fields as strings.
 *
 * Strings, because the review UI is uniform: every proposal is text the user
 * can read, edit and compare. Fields that are not strings underneath (an
 * array of traits, a list of world rules) are flattened on read and parsed on
 * write by the adapter, so the UI never has to know the difference.
 */
export interface FieldAdapter<T> {
  read: (entity: T, key: string) => string
  write: (entity: T, key: string, value: string) => Partial<T>
}

/**
 * Whether the underlying field has changed since the proposal was made.
 *
 * A proposal records the value it was generated against. If the live value no
 * longer matches, the user edited that field while the review panel was open,
 * and applying the suggestion would destroy an edit they made *after* seeing
 * it -- exactly the silent overwrite this feature exists to prevent.
 *
 * Deliberately a pure function of the live entity rather than something
 * tracked in state: staleness is then derived during render and cannot go out
 * of date, and there is no effect writing state back on every store change.
 */
export function isProposalStale<T>(
  entity: T,
  proposal: FieldProposal,
  adapter: FieldAdapter<T>,
): boolean {
  return adapter.read(entity, proposal.key) !== proposal.current
}

export interface PatchResult<T> {
  /** The changes to write. Never includes a stale proposal. */
  patch: Partial<T>
  /** Keys that were accepted but skipped because the field changed underneath. */
  skipped: string[]
  /** How many proposals will actually be written. */
  appliedCount: number
}

/**
 * Merges every accepted proposal into one patch, refusing stale ones.
 *
 * The UI blocks a stale proposal from being applied before it reaches here;
 * this second check is defence in depth, so no future caller can bypass it.
 */
export function buildPatch<T extends object>(
  entity: T,
  proposals: ReviewableProposal[],
  adapter: FieldAdapter<T>,
): PatchResult<T> {
  let patch: Partial<T> = {}
  const skipped: string[] = []
  let appliedCount = 0

  for (const proposal of proposals) {
    if (proposal.decision !== 'accepted') continue

    if (isProposalStale(entity, proposal, adapter)) {
      skipped.push(proposal.key)
      continue
    }

    const value = proposal.edited.trim()
    if (!value) continue

    // Nested groups are merged against the running patch, not the original, so
    // accepting several fields in one group does not lose all but the last.
    const merged = { ...entity, ...patch } as T
    patch = { ...patch, ...adapter.write(merged, proposal.key, value) }
    appliedCount += 1
  }

  return { patch, skipped, appliedCount }
}

export interface AIRequestContext {
  /** Abort signal, so a slow request can be cancelled by the user. */
  signal: AbortSignal
}

export interface ProviderStatus {
  id: string
  name: string
  /** False when no API key or proxy is configured -- the app then runs in mock mode. */
  configured: boolean
  /** Which tools this provider can genuinely perform. */
  supports: AIToolId[]
  /**
   * Shown in the AI panel. For mock mode this states plainly that output is
   * generated locally from templates and is not model output.
   */
  description: string
  /** Estimated cost of one call, in CAD. Zero in mock mode. */
  estimatedCostCad: number
}

/** A generator produces proposals for one entity. One per tool. */
export type ProposalGenerator<T> = (
  entity: T,
  context: AIRequestContext,
) => Promise<FieldProposal[]>
