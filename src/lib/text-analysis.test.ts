import { describe, expect, it } from 'vitest'
import {
  analyseSentences,
  analyseText,
  findEchoes,
  findRepeatedPhrases,
  splitSentences,
} from './text-analysis'

describe('splitSentences', () => {
  it('splits on terminal punctuation followed by a capital', () => {
    expect(splitSentences('She left. He stayed. Nobody spoke.')).toHaveLength(3)
  })

  it('keeps a quoted sentence together with its closing quote', () => {
    const sentences = splitSentences('"Get out," she said. He did not move.')
    expect(sentences).toHaveLength(2)
  })

  it('returns nothing for empty or whitespace-only text', () => {
    expect(splitSentences('')).toEqual([])
    expect(splitSentences('   \n ')).toEqual([])
  })
})

describe('findEchoes', () => {
  it('flags a word repeated close together', () => {
    const echoes = findEchoes('The lantern swung. Below the lantern, nothing moved.')
    expect(echoes.map((e) => e.word)).toContain('lantern')
  })

  it('ignores the same word when it is far apart', () => {
    const filler = 'padding '.repeat(60)
    const echoes = findEchoes(`lantern ${filler} lantern`)
    expect(echoes.map((e) => e.word)).not.toContain('lantern')
  })

  it('ignores common function words', () => {
    const echoes = findEchoes('the door and the window and the floor')
    expect(echoes.map((e) => e.word)).not.toContain('the')
    expect(echoes.map((e) => e.word)).not.toContain('and')
  })

  it('ignores very short words', () => {
    expect(findEchoes('cat sat cat sat').map((e) => e.word)).toEqual([])
  })

  it('ignores case and surrounding punctuation', () => {
    const echoes = findEchoes('Lantern. The lantern, again.')
    expect(echoes.map((e) => e.word)).toContain('lantern')
  })

  it('orders the tightest echo first', () => {
    // Unique filler, so the only repeats are the two words under test.
    const unique = (n: number) =>
      Array.from({ length: n }, (_, i) => `padding${i}`).join(' ')

    // 'harbour' repeats immediately; 'ledger' repeats 15 words apart.
    const text = `harbour harbour ${unique(10)} ledger ${unique(15)} ledger`
    const echoes = findEchoes(text)

    expect(echoes[0]!.word).toBe('harbour')
    expect(echoes[0]!.closestGap).toBe(1)
    expect(echoes.map((e) => e.word)).toContain('ledger')
  })
})

describe('findRepeatedPhrases', () => {
  it('finds a phrase used twice', () => {
    const found = findRepeatedPhrases('out of the dark and back out of the dark again')
    expect(found.map((f) => f.phrase)).toContain('out of the')
  })

  it('finds nothing in text too short to repeat', () => {
    expect(findRepeatedPhrases('two words')).toEqual([])
  })

  it('finds nothing when every phrase is unique', () => {
    expect(findRepeatedPhrases('each of these words appears only a single time here')).toEqual([])
  })
})

describe('analyseSentences', () => {
  it('measures length and spread', () => {
    const stats = analyseSentences('One two three. Four five.')
    expect(stats.count).toBe(2)
    expect(stats.longest).toBe(3)
    expect(stats.shortest).toBe(2)
  })

  it('detects a monotonous run of similar-length sentences', () => {
    const stats = analyseSentences('One two three four. Five six seven eight. Nine ten more words.')
    expect(stats.longestMonotonousRun).toBeGreaterThanOrEqual(3)
  })

  it('does not call varied sentences monotonous', () => {
    const stats = analyseSentences('Stop. He had been walking for most of the afternoon already. Then nothing.')
    expect(stats.longestMonotonousRun).toBeLessThan(3)
  })

  it('handles empty text without dividing by zero', () => {
    expect(analyseSentences('')).toEqual({
      count: 0,
      averageLength: 0,
      longest: 0,
      shortest: 0,
      longestMonotonousRun: 0,
    })
  })
})

describe('analyseText', () => {
  it('counts words and estimates reading time', () => {
    const analysis = analyseText('word '.repeat(400).trim())
    expect(analysis.words).toBe(400)
    expect(analysis.readingMinutes).toBe(2)
  })

  it('reports zero reading time for empty text', () => {
    expect(analyseText('').readingMinutes).toBe(0)
  })

  it('rounds a very short passage up to one minute rather than zero', () => {
    expect(analyseText('a handful of words').readingMinutes).toBe(1)
  })
})
