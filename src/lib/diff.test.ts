import { describe, expect, it } from 'vitest'
import { diffStats, diffWords, tokenize } from './diff'

/** Rebuilding one side from the parts is the property that must always hold. */
function rebuild(parts: ReturnType<typeof diffWords>, side: 'before' | 'after') {
  return parts
    .filter((part) => part.op === 'equal' || part.op === (side === 'before' ? 'delete' : 'insert'))
    .map((part) => part.text)
    .join('')
}

describe('tokenize', () => {
  it('keeps trailing whitespace so the text can be rebuilt exactly', () => {
    expect(tokenize('one two  three').join('')).toBe('one two  three')
  })

  it('handles an empty string', () => {
    expect(tokenize('')).toEqual([])
  })

  it('preserves leading whitespace, which a trailing-only rule loses', () => {
    expect(tokenize('   indented').join('')).toBe('   indented')
  })

  it('round-trips whitespace-only text', () => {
    expect(tokenize('   ').join('')).toBe('   ')
  })
})

describe('diffWords', () => {
  it('reports no change for identical text', () => {
    expect(diffWords('the same', 'the same')).toEqual([{ op: 'equal', text: 'the same' }])
  })

  it('treats an empty original as a pure insert', () => {
    expect(diffWords('', 'new text')).toEqual([{ op: 'insert', text: 'new text' }])
  })

  it('treats an emptied field as a pure delete', () => {
    expect(diffWords('old text', '')).toEqual([{ op: 'delete', text: 'old text' }])
  })

  it('isolates a single changed word', () => {
    const parts = diffWords('she walked to the door', 'she ran to the door')
    expect(parts.map((p) => p.op)).toEqual(['equal', 'delete', 'insert', 'equal'])
    expect(parts.find((p) => p.op === 'delete')?.text.trim()).toBe('walked')
    expect(parts.find((p) => p.op === 'insert')?.text.trim()).toBe('ran')
  })

  it('merges adjacent runs instead of emitting one part per word', () => {
    const parts = diffWords('a b c d', 'a x y d')
    // Not six parts of one word each.
    expect(parts.length).toBeLessThanOrEqual(4)
  })

  it('rebuilds both sides exactly, for a range of edits', () => {
    const cases: [string, string][] = [
      ['She said nothing.', 'She said nothing at all.'],
      ['Keep it short.', 'Short.'],
      ['one two three four five', 'five four three two one'],
      ['', 'something'],
      ['something', ''],
      ['  leading space', 'leading space  '],
      ['   ', 'text'],
      ['text', '   '],
      ['\n\nparagraph gap\n', 'paragraph gap'],
    ]

    for (const [before, after] of cases) {
      const parts = diffWords(before, after)
      expect(rebuild(parts, 'before')).toBe(before)
      expect(rebuild(parts, 'after')).toBe(after)
    }
  })

  it('falls back to a whole-block replace on very long text', () => {
    const long = 'word '.repeat(1300)
    const parts = diffWords(long, `${long}extra`)
    // Honest about not having computed a fine-grained diff.
    expect(parts.map((p) => p.op)).toEqual(['delete', 'insert'])
  })
})

describe('diffStats', () => {
  it('counts words added and removed', () => {
    const stats = diffStats(diffWords('she walked to the door', 'she ran to the door'))
    expect(stats.added).toBe(1)
    expect(stats.removed).toBe(1)
    expect(stats.unchanged).toBe(4)
  })

  it('reports how much of the original survives', () => {
    const stats = diffStats(diffWords('one two three four', 'one two three four'))
    expect(stats.retained).toBe(1)

    const rewritten = diffStats(diffWords('one two three four', 'completely different words here'))
    expect(rewritten.retained).toBe(0)
  })

  it('does not divide by zero on an empty original', () => {
    expect(diffStats(diffWords('', 'new')).retained).toBe(1)
  })
})
