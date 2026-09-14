import { describe, expect, it } from 'vitest'
import { countWords, formatBytes, formatRelativeTime } from './format'

describe('countWords', () => {
  it('counts plain words', () => {
    expect(countWords('the lamplighter walks north')).toBe(4)
  })

  it('treats an empty or whitespace-only string as zero', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   \n  ')).toBe(0)
  })

  it('splits on em and en dashes, which comic script writers use heavily', () => {
    expect(countWords('wait—no—stop')).toBe(3)
  })

  it('does not double-count runs of whitespace', () => {
    expect(countWords('one    two\n\nthree')).toBe(3)
  })
})

describe('formatBytes', () => {
  it('leaves small values in bytes', () => {
    expect(formatBytes(512)).toBe('512 B')
  })

  it('scales to KB and MB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB')
  })

  it('drops the decimal once the number is large enough not to need it', () => {
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB')
  })

  it('returns a placeholder rather than NaN for bad input', () => {
    expect(formatBytes(Number.NaN)).toBe('--')
    expect(formatBytes(-5)).toBe('--')
  })
})

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-12T12:00:00.000Z')

  it('describes very recent times as "just now"', () => {
    expect(formatRelativeTime('2026-03-12T11:59:57.000Z', now)).toBe('just now')
  })

  it('uses singular and plural correctly', () => {
    expect(formatRelativeTime('2026-03-12T11:59:00.000Z', now)).toBe('1 minute ago')
    expect(formatRelativeTime('2026-03-12T11:57:00.000Z', now)).toBe('3 minutes ago')
  })

  it('falls back to an absolute date beyond a week', () => {
    expect(formatRelativeTime('2026-01-02T12:00:00.000Z', now)).toMatch(/2026/)
  })

  it('does not throw on an invalid timestamp', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('unknown')
  })
})
