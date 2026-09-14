import { improvePacing, makeConcise, summarise } from '@/lib/rewrite-rules'
import { newId } from '@/lib/id'
import type { AIRequestContext } from './types'

/**
 * Rewriting tools.
 *
 * The important distinction in this file is between tools that are genuinely
 * mechanical and tools that need judgement:
 *
 *  - Cutting hedges, splitting an over-long sentence at a clause break, and
 *    selecting existing sentences as a summary are rules. They run offline,
 *    instantly, for nothing, and are honestly labelled as rule-based edits.
 *
 *  - Shifting emotional tone and offering a genuinely different phrasing of
 *    the same beat are not rules. There is no honest offline implementation,
 *    so those tools report `needsModel` and the UI disables them with an
 *    explanation rather than substituting something that merely looks like
 *    the real thing.
 *
 * This is the product brief's "do not claim a capability you do not have",
 * expressed as data rather than as a promise.
 */

export type RewriteToolId = 'concise' | 'pacing' | 'summarise' | 'tone' | 'alternatives'

export interface RewriteToolMeta {
  id: RewriteToolId
  label: string
  /** What it does, in the user's terms. */
  description: string
  /** How it works, stated plainly so trust can be calibrated. */
  method: string
  /** True when no honest offline implementation exists. */
  needsModel: boolean
}

export const REWRITE_TOOLS: RewriteToolMeta[] = [
  {
    id: 'concise',
    label: 'Tighten',
    description: 'Cuts hedges, intensifiers and padded phrases.',
    method: 'Rule-based. Removes and substitutes only — never reorders or rephrases.',
    needsModel: false,
  },
  {
    id: 'pacing',
    label: 'Break up long sentences',
    description: 'Splits over-long sentences where a clause break already exists.',
    method: 'Rule-based. Splits only at a comma before a conjunction.',
    needsModel: false,
  },
  {
    id: 'summarise',
    label: 'Summarise',
    description: 'Reduces the passage to its most informative sentences.',
    method: 'Extractive. Keeps whole sentences unchanged, so it cannot invent anything.',
    needsModel: false,
  },
  {
    id: 'tone',
    label: 'Change emotional tone',
    description: 'Rewrites the passage colder, warmer, angrier or more distant.',
    method: 'Needs a language model. No honest offline version exists.',
    needsModel: true,
  },
  {
    id: 'alternatives',
    label: 'Suggest alternatives',
    description: 'Offers different phrasings of the same beat.',
    method: 'Needs a language model. No honest offline version exists.',
    needsModel: true,
  },
]

export interface RewriteSuggestion {
  id: string
  /** Which tool produced it. */
  tool: RewriteToolId
  label: string
  /** The proposed replacement. */
  text: string
  /** What the rule actually did, itemised. */
  changes: string[]
}

const REWRITE_DELAY_MS = 350

/**
 * Runs a rewrite tool over a passage.
 *
 * Rejects rather than inventing output when the tool needs a model that is not
 * configured. Callers should not reach this -- the UI disables those tools --
 * but a failure here is the safe outcome if one ever does.
 */
export async function runRewrite(
  tool: RewriteToolId,
  text: string,
  { signal }: AIRequestContext,
): Promise<RewriteSuggestion[]> {
  const meta = REWRITE_TOOLS.find((candidate) => candidate.id === tool)
  if (!meta) throw new Error(`Unknown rewrite tool: ${tool}`)

  if (meta.needsModel) {
    throw new Error(
      `"${meta.label}" needs a language model, and no provider is configured. Nothing was changed.`,
    )
  }

  if (!text.trim()) {
    throw new Error('There is no text here to rewrite yet.')
  }

  // A short delay so loading and cancellation are genuinely exercisable.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, REWRITE_DELAY_MS)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Cancelled by the user', 'AbortError'))
    })
  })

  const result =
    tool === 'concise' ? makeConcise(text) : tool === 'pacing' ? improvePacing(text) : summarise(text)

  // A rule that changed nothing is reported as such rather than offered as a
  // suggestion the user would have to compare by eye to discover it is a no-op.
  if (result.text.trim() === text.trim()) {
    return []
  }

  return [
    {
      id: newId(),
      tool,
      label: meta.label,
      text: result.text,
      changes: result.changes,
    },
  ]
}

/** Which rewrite tools the active provider can genuinely perform. */
export function availableRewriteTools(): RewriteToolMeta[] {
  // Phase 8 will widen this once a model-backed provider is configured.
  return REWRITE_TOOLS.filter((tool) => !tool.needsModel)
}
