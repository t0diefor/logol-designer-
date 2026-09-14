import { describe, expect, it } from 'vitest'
import { improvePacing, makeConcise, outlineFromNotes, summarise } from './rewrite-rules'

describe('makeConcise', () => {
  it('removes hedges and intensifiers', () => {
    const result = makeConcise('She was very quite certainly afraid.')
    expect(result.text).toBe('She was afraid.')
    expect(result.changes.length).toBeGreaterThan(0)
  })

  it('swaps padded phrases for short ones', () => {
    expect(makeConcise('He went in order to find her.').text).toBe('He went to find her.')
    expect(makeConcise('She left due to the fact that it was late.').text).toBe(
      'She left because it was late.',
    )
  })

  it('re-capitalises when the opening word is removed', () => {
    // "Just" is cut from the front, so "she" has to become "She".
    expect(makeConcise('Just she stood there.').text).toBe('She stood there.')
  })

  it('does not leave double spaces or spaces before punctuation', () => {
    const result = makeConcise('He waited, very quietly , and said nothing.')
    expect(result.text).not.toMatch(/ {2}/)
    expect(result.text).not.toMatch(/\s[,.]/)
  })

  it('reports every change it made, so the edit can be checked', () => {
    const result = makeConcise('It was basically in order to help.')
    expect(result.changes.some((c) => c.includes('in order to'))).toBe(true)
    expect(result.changes.some((c) => c.includes('basically'))).toBe(true)
  })

  it('leaves clean prose untouched', () => {
    const clean = 'She said nothing. He left.'
    expect(makeConcise(clean).text).toBe(clean)
  })

  it('handles empty input', () => {
    expect(makeConcise('').text).toBe('')
    expect(makeConcise('   ').changes).toEqual([])
  })
})

describe('improvePacing', () => {
  it('splits a long sentence at an existing clause break', () => {
    const long =
      'She walked the whole length of the harbour road in the rain without stopping once, and nobody who saw her that evening said a single word about it afterwards.'
    const result = improvePacing(long)
    expect(result.text).toContain('. And')
    expect(result.changes[0]).toMatch(/split a \d+-word sentence/)
  })

  it('leaves short sentences alone', () => {
    const short = 'She left. He stayed.'
    expect(improvePacing(short).text).toBe(short)
  })

  it('says so when a long sentence has nowhere to split', () => {
    const long = `${'word '.repeat(30).trim()}.`
    const result = improvePacing(long)
    expect(result.text).toBe(long)
    expect(result.changes[0]).toMatch(/no clause break/)
  })
})

describe('summarise', () => {
  it('keeps whole sentences rather than inventing new text', () => {
    const text =
      'The harbour was empty. A single lantern burned at the end of the pier where the ferry usually moored. Rain started. Nobody came.'
    const result = summarise(text)

    for (const sentence of result.text.split(/(?<=[.!?])\s+/)) {
      expect(text).toContain(sentence.trim())
    }
  })

  it('keeps the original order', () => {
    const text = 'First thing happens. A much longer and more detailed middle event occurs here. Last.'
    const result = summarise(text)
    expect(result.text.indexOf('First')).toBeLessThan(result.text.length)
    expect(result.text.startsWith('First')).toBe(true)
  })

  it('returns short text unchanged and says why', () => {
    const result = summarise('Only one sentence here.')
    expect(result.text).toBe('Only one sentence here.')
    expect(result.changes[0]).toMatch(/already short enough/)
  })
})

describe('outlineFromNotes', () => {
  it('splits notes written as lines', () => {
    expect(outlineFromNotes('She arrives\nHe lies\nShe knows')).toEqual([
      'She arrives',
      'He lies',
      'She knows',
    ])
  })

  it('strips existing bullets and numbering', () => {
    expect(outlineFromNotes('- She arrives\n2. He lies\n* She knows')).toEqual([
      'She arrives',
      'He lies',
      'She knows',
    ])
  })

  it('falls back to sentences for a single paragraph', () => {
    expect(outlineFromNotes('She arrives. He lies. She knows.')).toHaveLength(3)
  })

  it('returns nothing for empty notes', () => {
    expect(outlineFromNotes('   ')).toEqual([])
  })
})
