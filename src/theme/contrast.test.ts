import { describe, expect, it } from 'vitest'
import { THEME_LIST } from './themes'
import { contrastRatio, WCAG_AA_BODY, WCAG_AA_LARGE } from '@/lib/contrast'

/**
 * Accessibility gate for the theme system.
 *
 * Every theme must clear WCAG AA on the colour pairs a user actually reads.
 * A theme that fails here is a bug, not a style preference -- fix the palette
 * rather than relaxing the threshold.
 */
describe.each(THEME_LIST.map((t) => [t.name, t] as const))('%s theme contrast', (_name, theme) => {
  const c = theme.colors

  // Body text must be readable on all three background layers.
  it.each([
    ['text on bg', c.text, c.bg],
    ['text on surface', c.text, c.surface],
    ['text on surfaceRaised', c.text, c.surfaceRaised],
    ['text on surfaceOverlay', c.text, c.surfaceOverlay],
    ['textMuted on bg', c.textMuted, c.bg],
    ['textMuted on surface', c.textMuted, c.surface],
  ])('%s meets AA for body text', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_BODY)
  })

  // Foreground colours printed on top of filled controls.
  it.each([
    ['primaryFg on primary', c.primaryFg, c.primary],
    ['accentFg on accent', c.accentFg, c.accent],
    ['successFg on success', c.successFg, c.success],
    ['warningFg on warning', c.warningFg, c.warning],
    ['dangerFg on danger', c.dangerFg, c.danger],
    ['textInverse on primary', c.textInverse, c.primary],
  ])('%s meets AA for body text', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_BODY)
  })

  // Non-text contrast (WCAG 1.4.11). These are the tokens that actually carry
  // the duty of identifying a control or its state, so they owe the full 3:1.
  // `textFaint` is held to the same bar because it is used at large sizes.
  it.each([
    ['textFaint on bg', c.textFaint, c.bg],
    ['textFaint on surface', c.textFaint, c.surface],
    ['ring on bg', c.ring, c.bg],
    ['ring on surface', c.ring, c.surface],
    ['ring on surfaceOverlay', c.ring, c.surfaceOverlay],
    ['primary on surface', c.primary, c.surface],
    ['accent on surface', c.accent, c.surface],
    ['danger on surface', c.danger, c.surface],
  ])('%s meets 3:1 for non-text contrast', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(WCAG_AA_LARGE)
  })

  /*
   * `border` and `borderStrong` are deliberately NOT held to 3:1.
   *
   * WCAG 1.4.11 requires 3:1 only for visuals that are *required* to identify
   * a component or its state. In PanelForge no control depends on its resting
   * border for that: inputs are identified by an inset fill that differs from
   * the surface, focus is shown with `ring` (tested at 3:1 above), and
   * selection is shown with `primary`/`accent` fills (also tested above).
   * Borders are emphasis only, which lets the soft themes stay soft.
   *
   * They still must be *visible*, so they get a perceptibility floor -- this
   * catches the real bug of a border that vanishes into its background.
   */
  it.each([
    ['border on surface', c.border, c.surface],
    ['borderStrong on surface', c.borderStrong, c.surface],
    ['border on bg', c.border, c.bg],
  ])('%s is perceptible against its background', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(1.25)
  })

  // An input must be distinguishable from the surface it sits on without
  // relying on its border, since that is the assumption the rule above makes.
  it('inset input fill is distinguishable from the surface', () => {
    expect(contrastRatio(c.bgInset, c.surface)).toBeGreaterThanOrEqual(1.1)
  })
})
