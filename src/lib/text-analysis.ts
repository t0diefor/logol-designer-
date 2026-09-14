/**
 * Deterministic prose analysis.
 *
 * Everything here is computed, not generated. Repetition detection, sentence
 * rhythm and word counts are arithmetic over the text, so they are exact,
 * instant, free, and work with no provider configured.
 *
 * Kept separate from the AI features on purpose. Dressing a word-frequency
 * count up as "AI analysis" would overstate what it is, and the user cannot
 * calibrate how much to trust a tool that misrepresents itself.
 */

/**
 * Words too common to be worth flagging as repetition.
 *
 * Deliberately short. A long stop list starts swallowing words that genuinely
 * are being over-used -- "said", "just", "very" are exactly the echoes a
 * writer wants pointed out.
 */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for', 'from',
  'had', 'has', 'have', 'he', 'her', 'him', 'his', 'i', 'if', 'in', 'is', 'it',
  'its', 'me', 'my', 'no', 'not', 'of', 'on', 'or', 'our', 'out', 'she', 'so',
  'that', 'the', 'their', 'them', 'they', 'this', 'to', 'up', 'was', 'we',
  'were', 'what', 'when', 'which', 'who', 'will', 'with', 'you', 'your',
])

/** How close two uses of a word must be to read as an echo. */
const ECHO_WINDOW = 40

/** Words shorter than this are rarely worth flagging even when repeated. */
const MIN_ECHO_LENGTH = 4

export interface EchoFinding {
  word: string
  /** Word indices where it appears, in order. */
  positions: number[]
  /** The smallest gap between two uses, in words. */
  closestGap: number
  count: number
}

export interface PhraseFinding {
  phrase: string
  count: number
}

export interface SentenceStats {
  count: number
  averageLength: number
  longest: number
  shortest: number
  /**
   * Run of consecutive sentences within 20% of each other in length. A long
   * run reads as monotonous regardless of whether the sentences are good.
   */
  longestMonotonousRun: number
}

export interface TextAnalysis {
  words: number
  characters: number
  /** At 200 wpm, which is a common silent-reading figure for prose. */
  readingMinutes: number
  sentences: SentenceStats
  echoes: EchoFinding[]
  repeatedPhrases: PhraseFinding[]
}

function normaliseWord(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9'-]/g, '')
}

/** Splits prose into sentences. Handles the common abbreviation cases only. */
export function splitSentences(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  return trimmed
    .split(/(?<=[.!?])["')\]]*\s+(?=[A-Z"'(\u005B])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

/**
 * Finds words used more than once close together.
 *
 * Proximity is the signal, not raw frequency: a word used eight times across a
 * long scene is usually fine, while the same word twice in one breath is the
 * thing a reader trips over.
 */
export function findEchoes(text: string, window = ECHO_WINDOW): EchoFinding[] {
  const words = text.split(/\s+/).map(normaliseWord).filter(Boolean)
  const positions = new Map<string, number[]>()

  words.forEach((word, index) => {
    if (word.length < MIN_ECHO_LENGTH) return
    if (STOP_WORDS.has(word)) return
    const list = positions.get(word)
    if (list) list.push(index)
    else positions.set(word, [index])
  })

  const findings: EchoFinding[] = []

  for (const [word, list] of positions) {
    if (list.length < 2) continue

    let closest = Infinity
    for (let i = 1; i < list.length; i += 1) {
      closest = Math.min(closest, list[i]! - list[i - 1]!)
    }

    if (closest > window) continue
    findings.push({ word, positions: list, closestGap: closest, count: list.length })
  }

  // Tightest echoes first: those are the ones a reader actually notices.
  return findings.sort((a, b) => a.closestGap - b.closestGap || b.count - a.count)
}

/** Finds phrases of `size` words that appear more than once. */
export function findRepeatedPhrases(text: string, size = 3): PhraseFinding[] {
  const words = text.split(/\s+/).map(normaliseWord).filter(Boolean)
  if (words.length < size * 2) return []

  const counts = new Map<string, number>()
  for (let i = 0; i + size <= words.length; i += 1) {
    const phrase = words.slice(i, i + size).join(' ')
    counts.set(phrase, (counts.get(phrase) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([phrase, count]) => ({ phrase, count }))
    .sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase))
}

export function analyseSentences(text: string): SentenceStats {
  const sentences = splitSentences(text)
  if (sentences.length === 0) {
    return { count: 0, averageLength: 0, longest: 0, shortest: 0, longestMonotonousRun: 0 }
  }

  const lengths = sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length)
  const total = lengths.reduce((sum, length) => sum + length, 0)

  let run = 1
  let longestRun = 1
  for (let i = 1; i < lengths.length; i += 1) {
    const previous = lengths[i - 1]!
    const current = lengths[i]!
    const similar = previous > 0 && Math.abs(current - previous) / previous <= 0.2
    run = similar ? run + 1 : 1
    longestRun = Math.max(longestRun, run)
  }

  return {
    count: sentences.length,
    averageLength: Math.round((total / sentences.length) * 10) / 10,
    longest: Math.max(...lengths),
    shortest: Math.min(...lengths),
    longestMonotonousRun: longestRun,
  }
}

/** Full analysis of a block of prose. */
export function analyseText(text: string): TextAnalysis {
  const words = text.split(/\s+/).filter(Boolean).length

  return {
    words,
    characters: text.length,
    readingMinutes: Math.max(words > 0 ? 1 : 0, Math.round(words / 200)),
    sentences: analyseSentences(text),
    echoes: findEchoes(text),
    repeatedPhrases: findRepeatedPhrases(text),
  }
}
