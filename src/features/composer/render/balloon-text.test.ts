import { describe, expect, it } from 'vitest'
import { fitBalloonRect, layOutBalloon } from './balloon-text'
import type { Balloon } from '@/types/comic'

function balloon(overrides: Partial<Balloon> = {}): Balloon {
  return {
    id: 'b1',
    kind: 'speech',
    text: '',
    rect: { x: 0, y: 0, width: 140, height: 60 },
    speakerId: null,
    tailX: 0,
    tailY: 60,
    fontSize: 13,
    align: 'center',
    z: 0,
    ...overrides,
  }
}

const LONG = 'You are telling me the ledger walked out on its own.'

describe('layOutBalloon', () => {
  it('wraps a round balloon inside the ellipse, not the bounding box', () => {
    const speech = layOutBalloon(balloon({ kind: 'speech', text: LONG }))
    const caption = layOutBalloon(balloon({ kind: 'caption', text: LONG }))

    // Same box, but the ellipse has less usable width, so it must wrap tighter.
    expect(speech.maxWidth).toBeLessThan(caption.maxWidth)
    expect(speech.maxWidth).toBeCloseTo(140 * Math.SQRT1_2 - 20, 5)
    expect(caption.maxWidth).toBeCloseTo(140 - 12, 5)
  })

  it('reports text that does not fit, rather than drawing it outside', () => {
    const laid = layOutBalloon(balloon({ text: LONG }))

    expect(laid.truncated).toBe(true)
    expect(laid.lines).toHaveLength(laid.maxLines)
    // The visible last line says so, instead of simply ending mid-sentence.
    expect(laid.lines.at(-1)).toMatch(/…$/)
  })

  it('does not claim truncation for text that fits exactly', () => {
    const laid = layOutBalloon(balloon({ text: 'Hi.' }))

    expect(laid.truncated).toBe(false)
    expect(laid.lines).toEqual(['Hi.'])
  })

  it('anchors text to the inset edge when aligned, not the bounding box edge', () => {
    const left = layOutBalloon(balloon({ align: 'left', text: 'Hi.' }))
    const centre = layOutBalloon(balloon({ align: 'center', text: 'Hi.' }))

    expect(centre.textX).toBeCloseTo(70, 5)
    expect(centre.textAnchor).toBe('middle')
    // Inside the ellipse's inscribed rectangle, so well right of x = 0.
    expect(left.textX).toBeGreaterThan(70 - 140 / 2)
    expect(left.textAnchor).toBe('start')
  })
})

describe('fitBalloonRect', () => {
  it('grows the balloon enough that nothing is cut off', () => {
    const original = balloon({ text: LONG })
    expect(layOutBalloon(original).truncated).toBe(true)

    const fitted = { ...original, rect: fitBalloonRect(original) }

    expect(fitted.rect.height).toBeGreaterThan(original.rect.height)
    expect(layOutBalloon(fitted).truncated).toBe(false)
  })

  it('keeps the width and the centre, so the balloon does not wander', () => {
    const original = balloon({ text: LONG })
    const fitted = fitBalloonRect(original)

    expect(fitted.width).toBe(original.rect.width)
    expect(fitted.x).toBe(original.rect.x)
    expect(fitted.y + fitted.height / 2).toBeCloseTo(
      original.rect.y + original.rect.height / 2,
      5,
    )
  })

  it('never shrinks a balloon that is already big enough', () => {
    const original = balloon({ text: 'Hi.' })
    expect(fitBalloonRect(original)).toEqual(original.rect)
  })
})
