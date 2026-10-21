import { describe, expect, it } from 'vitest'
import { balloonFont, layOutBalloonText, measureTextWidth, wrapText } from './text-layout'

/*
 * jsdom's canvas stub measures everything as 0, so these exercise the
 * fallback estimator. That is the right thing to test here: it is the path
 * that has to behave sanely when measurement is unavailable, and real
 * measurement is covered by the browser pass.
 */
const FONT = balloonFont(10, 'sans-serif')
const OPTIONS = { font: FONT, fontSize: 10, maxWidth: 100 }

describe('measureTextWidth', () => {
  it('estimates rather than returning zero when canvas cannot measure', () => {
    expect(measureTextWidth('hello', FONT, 10)).toBeGreaterThan(0)
  })

  it('returns zero for an empty string', () => {
    expect(measureTextWidth('', FONT, 10)).toBe(0)
  })

  it('scales with length', () => {
    expect(measureTextWidth('aaaaaaaaaa', FONT, 10)).toBeGreaterThan(
      measureTextWidth('aa', FONT, 10),
    )
  })
})

describe('wrapText', () => {
  it('returns nothing for empty text', () => {
    expect(wrapText('', OPTIONS)).toEqual([])
    expect(wrapText('   ', OPTIONS)).toEqual([])
  })

  it('keeps short text on one line', () => {
    expect(wrapText('hi', OPTIONS)).toEqual(['hi'])
  })

  it('wraps long text onto several lines', () => {
    const lines = wrapText('one two three four five six seven eight nine ten', OPTIONS)
    expect(lines.length).toBeGreaterThan(1)
  })

  it('preserves every word across the wrap', () => {
    const text = 'the ninth lamp is cold and the ledger says it never existed'
    const lines = wrapText(text, OPTIONS)
    expect(lines.join(' ').split(/\s+/)).toEqual(text.split(/\s+/))
  })

  it('honours an explicit line break as a hard break', () => {
    // A letterer who typed a break meant it.
    expect(wrapText('first\nsecond', { ...OPTIONS, maxWidth: 1000 })).toEqual(['first', 'second'])
  })

  it('keeps a blank line between paragraphs', () => {
    expect(wrapText('a\n\nb', { ...OPTIONS, maxWidth: 1000 })).toEqual(['a', '', 'b'])
  })

  it('breaks a word that cannot fit rather than overflowing the balloon', () => {
    const lines = wrapText('supercalifragilisticexpialidocious', { ...OPTIONS, maxWidth: 30 })
    expect(lines.length).toBeGreaterThan(1)
    // Nothing is lost when a word is split.
    expect(lines.join('')).toBe('supercalifragilisticexpialidocious')
  })

  it('ellipsises when the line cap is reached', () => {
    // Long enough to need more than two lines at this width, so the cap bites.
    const long = 'one two three four five six seven eight nine ten eleven twelve thirteen'
    expect(wrapText(long, OPTIONS).length).toBeGreaterThan(2)

    const lines = wrapText(long, { ...OPTIONS, maxLines: 2 })
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatch(/…$/)
  })

  it('does not ellipsise when the text already fits the cap', () => {
    const lines = wrapText('short', { ...OPTIONS, maxLines: 3 })
    expect(lines[0]).not.toMatch(/…$/)
  })

  it('does not loop forever on a zero or negative width', () => {
    expect(wrapText('anything', { ...OPTIONS, maxWidth: 0 })).toEqual(['anything'])
  })
})

describe('layOutBalloonText', () => {
  it('reports a height matching the line count', () => {
    const result = layOutBalloonText('one two three four five six', OPTIONS)
    expect(result.height).toBeCloseTo(result.lines.length * result.lineHeight)
  })

  it('has zero height for empty text, so an empty balloon centres nothing', () => {
    expect(layOutBalloonText('', OPTIONS).height).toBe(0)
  })
})
