import { describe, expect, it } from 'vitest'
import { clamp, snap, snapPoint } from './svg-coords'

describe('snap', () => {
  it('rounds to the nearest grid multiple', () => {
    expect(snap(23, 20)).toBe(20)
    expect(snap(31, 20)).toBe(40)
    expect(snap(-9, 20)).toBe(-0)
  })

  it('is a no-op for a zero or negative step', () => {
    expect(snap(23, 0)).toBe(23)
    expect(snap(23, -5)).toBe(23)
  })

  it('snaps both axes of a point', () => {
    expect(snapPoint({ x: 23, y: 118 }, 20)).toEqual({ x: 20, y: 120 })
  })
})

describe('clamp', () => {
  it('keeps a value inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(99, 0, 10)).toBe(10)
  })
})
