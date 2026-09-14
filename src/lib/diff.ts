/**
 * Word-level text diff.
 *
 * Phases 2 and 3 only ever proposed values for *empty* fields, so showing the
 * suggestion was enough. Rewriting is different: it proposes replacing prose
 * the user already wrote, and "here is the new version" does not let anyone
 * judge what they would lose. A diff does.
 *
 * Implemented as a longest-common-subsequence over word tokens rather than
 * characters. Character diffs of prose produce unreadable confetti; word
 * diffs line up with how people actually read a sentence.
 */

export type DiffOp = 'equal' | 'insert' | 'delete'

export interface DiffPart {
  op: DiffOp
  /** The text of this run, including the whitespace that followed each token. */
  text: string
}

/**
 * Above this many tokens on either side, the quadratic LCS table gets too
 * expensive to build during a render. Past it we report a whole-block replace,
 * which is honest -- it says "all of this changes" rather than pretending to a
 * precision we did not compute.
 */
const MAX_TOKENS = 1200

/**
 * Splits into words, keeping the whitespace around each one attached to it, so
 * joining the tokens reproduces the input byte for byte.
 *
 * `\s*\S+\s*` works because regex matching is non-overlapping and
 * left-to-right: the trailing `\s*` consumes the gap, leaving none for the
 * next token's leading `\s*`. The leading `\s*` therefore only ever matches
 * at the very start of the string -- which is exactly the whitespace a
 * trailing-only rule silently loses.
 */
export function tokenize(text: string): string[] {
  if (!text) return []
  const tokens = text.match(/\s*\S+\s*/g)
  // Whitespace-only input has no words but is still text that must round-trip.
  if (!tokens) return [text]
  return tokens
}

/** Builds the LCS length table for two token arrays. */
function lcsTable(a: string[], b: string[]): Uint32Array {
  const width = b.length + 1
  const table = new Uint32Array((a.length + 1) * width)

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i] === b[j]
          ? table[(i + 1) * width + (j + 1)]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + (j + 1)]!)
    }
  }

  return table
}

/**
 * Diffs two strings at word granularity.
 *
 * Adjacent operations of the same kind are merged, so the result is a short
 * list of runs rather than one entry per word -- which keeps the rendered
 * output readable and the DOM small.
 */
export function diffWords(before: string, after: string): DiffPart[] {
  if (before === after) {
    return before ? [{ op: 'equal', text: before }] : []
  }
  if (!before) return after ? [{ op: 'insert', text: after }] : []
  if (!after) return [{ op: 'delete', text: before }]

  const a = tokenize(before)
  const b = tokenize(after)

  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) {
    return [
      { op: 'delete', text: before },
      { op: 'insert', text: after },
    ]
  }

  const width = b.length + 1
  const table = lcsTable(a, b)
  const parts: DiffPart[] = []

  /** Appends a run, merging it into the previous one when the op matches. */
  const push = (op: DiffOp, text: string) => {
    const last = parts[parts.length - 1]
    if (last && last.op === op) {
      last.text += text
      return
    }
    parts.push({ op, text })
  }

  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push('equal', a[i]!)
      i += 1
      j += 1
    } else if (table[(i + 1) * width + j]! >= table[i * width + (j + 1)]!) {
      push('delete', a[i]!)
      i += 1
    } else {
      push('insert', b[j]!)
      j += 1
    }
  }

  while (i < a.length) {
    push('delete', a[i]!)
    i += 1
  }
  while (j < b.length) {
    push('insert', b[j]!)
    j += 1
  }

  return parts
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
  /** 0-1. How much of the original survives, by word count. */
  retained: number
}

/** Summarises a diff, so the UI can say "12 words removed" before the detail. */
export function diffStats(parts: DiffPart[]): DiffStats {
  let added = 0
  let removed = 0
  let unchanged = 0

  for (const part of parts) {
    const count = tokenize(part.text).length
    if (part.op === 'insert') added += count
    else if (part.op === 'delete') removed += count
    else unchanged += count
  }

  const original = removed + unchanged
  return {
    added,
    removed,
    unchanged,
    retained: original === 0 ? 1 : unchanged / original,
  }
}
