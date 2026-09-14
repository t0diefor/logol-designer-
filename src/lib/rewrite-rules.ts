/**
 * Rule-based prose transforms.
 *
 * These are deterministic editors, not generated text. Each one applies a
 * stated rule you could apply by hand, which means the result is predictable,
 * instant, free, and reviewable against a clear expectation.
 *
 * The reason they exist rather than waiting for phase 8: a meaningful part of
 * "make this tighter" is mechanical. Cutting hedges and swapping padded
 * phrases for short ones is a rule, not a judgement. Tools that genuinely do
 * need judgement -- shifting emotional tone, offering a different phrasing of
 * the same beat -- are NOT implemented here, and the UI disables them rather
 * than substituting something that looks like the real thing.
 */

/** Hedges and intensifiers that almost always weaken a sentence. */
const FILLER_WORDS = [
  'very', 'really', 'quite', 'rather', 'somewhat', 'actually', 'basically',
  'literally', 'simply', 'truly', 'definitely', 'certainly', 'absolutely',
  'totally', 'completely', 'entirely', 'just', 'sort of', 'kind of',
]

/** Padded phrases and their short equivalents. */
const PHRASE_SWAPS: [RegExp, string][] = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bat the present time\b/gi, 'now'],
  [/\ba large number of\b/gi, 'many'],
  [/\ba small number of\b/gi, 'a few'],
  [/\bin the event that\b/gi, 'if'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin spite of the fact that\b/gi, 'although'],
  [/\bis able to\b/gi, 'can'],
  [/\bwas able to\b/gi, 'could'],
  [/\bmade the decision to\b/gi, 'decided to'],
  [/\bcame to the realisation that\b/gi, 'realised'],
  [/\bcame to the realization that\b/gi, 'realized'],
  [/\bthe majority of\b/gi, 'most'],
  [/\bon a daily basis\b/gi, 'daily'],
  [/\bin close proximity to\b/gi, 'near'],
  [/\bbegan to\b/gi, ''],
  [/\bstarted to\b/gi, ''],
]

/** Collapses whitespace and tidies spacing before punctuation. */
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
}

/** Re-capitalises the first letter of each sentence after an edit. */
function recapitalise(text: string): string {
  return text.replace(/(^|[.!?]\s+|\n\s*)([a-z])/g, (_, prefix: string, letter: string) =>
    prefix + letter.toUpperCase(),
  )
}

export interface RewriteResult {
  text: string
  /** What the rule actually did, listed so the user can check it. */
  changes: string[]
}

/**
 * Cuts hedges, intensifiers and padded phrases.
 *
 * Never reorders or rephrases -- only removes and substitutes -- so what comes
 * back is recognisably the writer's sentence with the padding gone.
 */
export function makeConcise(text: string): RewriteResult {
  if (!text.trim()) return { text, changes: [] }

  let result = text
  const changes: string[] = []

  for (const [pattern, replacement] of PHRASE_SWAPS) {
    const matches = result.match(pattern)
    if (!matches) continue
    result = result.replace(pattern, replacement)
    changes.push(
      replacement
        ? `"${matches[0]}" → "${replacement}"`
        : `removed "${matches[0].trim()}"`,
    )
  }

  for (const filler of FILLER_WORDS) {
    // Word-boundary match, with the following space, so removal does not
    // leave a double gap.
    const pattern = new RegExp(`\\b${filler}\\s+`, 'gi')
    const matches = result.match(pattern)
    if (!matches) continue
    result = result.replace(pattern, '')
    changes.push(`removed "${filler}" ×${matches.length}`)
  }

  return { text: recapitalise(tidy(result)), changes }
}

/** Sentences longer than this are candidates for splitting. */
const LONG_SENTENCE = 24

/**
 * Splits over-long sentences at a coordinating conjunction.
 *
 * Only splits where a comma already precedes the conjunction, because that is
 * where the writer has already signalled a clause boundary. Splitting anywhere
 * else produces sentences that are shorter and worse.
 */
export function improvePacing(text: string): RewriteResult {
  if (!text.trim()) return { text, changes: [] }

  const changes: string[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)

  const rewritten = sentences.map((sentence) => {
    const words = sentence.split(/\s+/).filter(Boolean)
    if (words.length <= LONG_SENTENCE) return sentence

    const split = sentence.replace(
      /,\s+(and|but|so|yet|then)\s+/i,
      (_match, conjunction: string) => `. ${conjunction[0]!.toUpperCase()}${conjunction.slice(1)} `,
    )

    if (split !== sentence) {
      changes.push(`split a ${words.length}-word sentence`)
      return split
    }

    changes.push(`${words.length}-word sentence has no clause break to split at`)
    return sentence
  })

  return { text: tidy(rewritten.join(' ')), changes }
}

/**
 * Extractive summary: keeps whole sentences rather than inventing new ones.
 *
 * Picks the opening sentence (which usually establishes the situation) plus
 * the highest-information sentence by unique-content-word count. Nothing is
 * paraphrased, so the summary cannot say something the scene does not.
 */
export function summarise(text: string, maxSentences = 2): RewriteResult {
  const sentences = text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= maxSentences) {
    return { text: sentences.join(' '), changes: ['Text is already short enough to stand as its own summary.'] }
  }

  const score = (sentence: string) =>
    new Set(
      sentence
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z']/g, ''))
        .filter((word) => word.length > 4),
    ).size

  const [first, ...rest] = sentences
  const ranked = [...rest].sort((a, b) => score(b) - score(a)).slice(0, maxSentences - 1)

  // Restore original order so the summary still reads forwards.
  const chosen = [first!, ...ranked].sort(
    (a, b) => sentences.indexOf(a) - sentences.indexOf(b),
  )

  return {
    text: chosen.join(' '),
    changes: [`Kept ${chosen.length} of ${sentences.length} sentences, unchanged and in order.`],
  }
}

/**
 * Turns loose notes into a beat list.
 *
 * Splits on line breaks first (people already write notes in lines), falling
 * back to sentences. Strips leading bullet characters so a pasted list does
 * not end up double-bulleted.
 */
export function outlineFromNotes(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const byLine = trimmed
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*•\d.)\]]+\s*/, '').trim())
    .filter(Boolean)

  if (byLine.length > 1) return byLine

  return trimmed
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}
