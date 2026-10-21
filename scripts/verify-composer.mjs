/**
 * Browser verification for phase 6, the page and panel composer.
 *
 * Unit tests cover the geometry, the history stack and the page document in
 * isolation. What they cannot cover is a pointer drag through a real SVG
 * coordinate matrix, or text wrapping that depends on genuine font metrics --
 * both of which this exercises.
 *
 * Two findings from writing it are worth keeping in mind when editing it:
 *
 * 1. Filling the inspector fields scrolls the canvas out of view, so a
 *    `boundingBox` taken afterwards has a negative y and a drag aimed at it
 *    lands outside the document. It silently dragged nothing. Hence the
 *    `scrollIntoViewIfNeeded` and the explicit off-screen assertion.
 *
 * 2. The undo assertion compares against the pre-drag rectangle, so it passes
 *    trivially if the drag never happened. It is only meaningful because the
 *    move assertion above it runs first. Keep that order.
 *
 * Usage:
 *   npm run dev               # in one terminal
 *   npm run verify:composer   # in another
 *
 * Screenshots are written to .screenshots/ (git-ignored).
 */
import { chromium } from 'playwright'
const BASE = process.env.PF_BASE_URL ?? 'http://127.0.0.1:5173'
const problems = []
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } })
const p = await ctx.newPage()
p.on('console', (m) => {
  if (m.type() !== 'error' && m.type() !== 'warning') return
  const t = m.text()
  if (/fonts\.g|ERR_CONNECTION_RESET|ERR_BLOCKED|ERR_CERT_AUTHORITY_INVALID/.test(t)) return
  problems.push(`[console.${m.type()}] ${t}`)
})
p.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`))
const shot = async (n) => { await p.waitForTimeout(450); await p.screenshot({ path: `.screenshots/${n}.png` }); console.log('captured', n) }
const readPage = () => p.evaluate(async () => {
  const req = indexedDB.open('panelforge')
  const db = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
  const raw = await new Promise((res) => {
    const tx = db.transaction('kv','readonly').objectStore('kv').get('panelforge.workspace')
    tx.onsuccess = () => res(tx.result); tx.onerror = () => res(null)
  })
  if (!raw) return null
  const pages = Object.values(JSON.parse(raw).state.pages ?? {})
  return pages[0] ?? null
})

await p.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
await p.getByRole('button', { name: 'Load the sample project' }).click()
await p.waitForTimeout(1200)

// Give the project some art to place.
await p.goto(`${BASE}/assets`, { waitUntil: 'networkidle' })
await p.waitForTimeout(700)
await p.getByRole('button', { name: /Generate \d+ placeholders/ }).click()
await p.waitForTimeout(2200)

await p.goto(`${BASE}/composer`, { waitUntil: 'networkidle' })
await p.waitForTimeout(800)
await shot('90-composer-empty')

await p.getByRole('button', { name: 'Create the first page' }).click()
await p.waitForTimeout(1000)
await shot('91-composer-blank-page')

// Template.
await p.getByLabel('Apply a page template').selectOption('establishing')
await p.waitForTimeout(1200)
const afterTemplate = await readPage()
console.log('panels after template:', afterTemplate?.panels.length)
if ((afterTemplate?.panels.length ?? 0) !== 5) problems.push('[composer] template did not lay out 5 panels')
await shot('92-composer-template')

// Select a panel and place art + text.
const canvas = p.getByRole('application')
const panelButtons = canvas.getByRole('button', { name: /^Panel / })
await panelButtons.first().click()
await p.waitForTimeout(700)

await p.getByLabel('Add an image to this panel').selectOption({ index: 1 })
await p.waitForTimeout(900)
await p.getByRole('button', { name: 'Caption', exact: true }).click()
await p.waitForTimeout(600)
await p.getByLabel('Text 1 content').fill('Four hundred years, and not one dark night.')
await p.waitForTimeout(900)
await shot('93-composer-caption')

await panelButtons.nth(1).click()
await p.waitForTimeout(600)
await p.getByRole('button', { name: 'Speech', exact: true }).click()
await p.waitForTimeout(600)
await p.getByLabel('Text 1 content').fill('You are telling me the ledger walked out on its own.')
await p.waitForTimeout(900)
await p.getByRole('button', { name: 'SFX', exact: true }).click()
await p.waitForTimeout(500)
await p.getByLabel('Text 2 content').fill('TSSK')
await p.waitForTimeout(900)
await shot('94-composer-balloons')

// Text must actually wrap into multiple tspans — the hand-rolled layout.
const tspanCount = await p.locator('svg text tspan').count()
console.log('tspans rendered (wrapped lines):', tspanCount)
if (tspanCount < 2) problems.push('[composer] balloon text did not wrap into multiple lines')

// Drag a panel and confirm it commits once, snapped.
const before = await readPage()
const firstPanelBefore = before.panels[0]
// Filling the inspector fields above scrolled the canvas out of view; a
// boundingBox measured now has a negative y and the drag would land outside
// the document entirely. Scroll it back before measuring.
await panelButtons.first().scrollIntoViewIfNeeded()
await p.waitForTimeout(300)
const box = await panelButtons.first().boundingBox()
if (box.y < 0 || box.x < 0) problems.push(`[harness] panel is off-screen at ${box.x},${box.y}; the drag would miss`)
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await p.mouse.down()
await p.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 12 })
await p.mouse.up()
await p.waitForTimeout(900)

const after = await readPage()
const firstPanelAfter = after.panels.find((pl) => pl.id === firstPanelBefore.id)
console.log('panel moved:', firstPanelBefore.rect.x, '->', firstPanelAfter.rect.x)
if (firstPanelAfter.rect.x === firstPanelBefore.rect.x && firstPanelAfter.rect.y === firstPanelBefore.rect.y) {
  problems.push('[composer] drag did not move the panel')
}
if (firstPanelAfter.rect.width !== firstPanelBefore.rect.width) {
  problems.push('[composer] drag changed the panel size')
}

// A panel is a container: its art and lettering have to travel with it.
const dx = firstPanelAfter.rect.x - firstPanelBefore.rect.x
const dy = firstPanelAfter.rect.y - firstPanelBefore.rect.y
const carried = (kind, before, after) => {
  if (before.length === 0) {
    problems.push(`[harness] panel 1 had no ${kind}, so nothing was checked`)
    return
  }
  const stranded = before.filter((item, i) =>
    after[i].rect.x !== item.rect.x + dx || after[i].rect.y !== item.rect.y + dy)
  console.log(`${kind} carried with the panel:`, stranded.length === 0)
  if (stranded.length) problems.push(`[composer] ${stranded.length} ${kind} stayed behind when the panel moved`)
}
carried('placements', firstPanelBefore.placements, firstPanelAfter.placements)
carried('balloons', firstPanelBefore.balloons, firstPanelAfter.balloons)
await shot('95-composer-dragged')

// Undo must put it back exactly.
await p.getByRole('button', { name: 'Undo' }).click()
await p.waitForTimeout(900)
const undone = await readPage()
const firstPanelUndone = undone.panels.find((pl) => pl.id === firstPanelBefore.id)
const restored = firstPanelUndone.rect.x === firstPanelBefore.rect.x && firstPanelUndone.rect.y === firstPanelBefore.rect.y
console.log('undo restored the exact position:', restored)
if (!restored) problems.push('[composer] undo did not restore the panel position')

await p.getByRole('button', { name: 'Redo' }).click()
await p.waitForTimeout(800)
const redone = await readPage()
console.log('redo reapplied:', redone.panels.find((pl) => pl.id === firstPanelBefore.id).rect.x === firstPanelAfter.rect.x)

// Keyboard: Tab cycles, Ctrl+D duplicates, Delete removes.
await p.locator('body').click({ position: { x: 5, y: 5 } })
await p.waitForTimeout(300)
await panelButtons.first().click()
await p.waitForTimeout(400)
const countBeforeDup = (await readPage()).panels.length
await p.keyboard.press('Control+d')
await p.waitForTimeout(800)
const countAfterDup = (await readPage()).panels.length
console.log('Ctrl+D duplicated:', countBeforeDup, '->', countAfterDup)
if (countAfterDup !== countBeforeDup + 1) problems.push('[composer] Ctrl+D did not duplicate')

await p.keyboard.press('Delete')
await p.waitForTimeout(800)
console.log('Delete removed:', (await readPage()).panels.length === countBeforeDup)

// Second page + thumbnail rail.
await p.getByRole('button', { name: 'Add page' }).click()
await p.waitForTimeout(900)
await p.getByLabel('Apply a page template').selectOption('grid-4')
await p.waitForTimeout(1000)
await shot('96-composer-two-pages')
const railCount = await p.getByRole('button', { name: /^Page \d+$/ }).count()
console.log('thumbnails in rail:', railCount)
if (railCount < 2) problems.push('[composer] page rail did not show both pages')

// Zoom.
await p.getByRole('button', { name: 'Zoom in' }).click()
await p.waitForTimeout(600)
await shot('97-composer-zoomed')

// Mobile.
const m = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const mp = await m.newPage()
mp.on('pageerror', (e) => problems.push(`[mobile] ${e.message}`))
await mp.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await mp.waitForTimeout(700)
await mp.getByRole('button', { name: 'Load the sample project' }).click()
await mp.waitForTimeout(1000)
await mp.goto(`${BASE}/composer`, { waitUntil: 'networkidle' })
await mp.waitForTimeout(700)
await mp.getByRole('button', { name: 'Create the first page' }).click()
await mp.waitForTimeout(900)
await mp.getByLabel('Apply a page template').selectOption('grid-4')
await mp.waitForTimeout(900)
await mp.screenshot({ path: '.screenshots/98-mobile-composer.png' })
console.log('captured 98-mobile-composer')
// Responsive display classes are a known hazard here: without tailwind-merge
// a `md:hidden` on a component that sets its own `inline-flex` loses, and both
// variants render. Only a real browser evaluates the media query, so it is
// asserted here rather than in jsdom.
// `getComputedStyle(el).display` is the element's own value and stays `flex`
// inside a hidden parent, so it answers the wrong question. A zero client
// rect is what "not on the screen" actually means.
const visibleMenus = await mp.locator('header button').evaluateAll((els) =>
  els
    .filter((el) => el.getClientRects().length > 0 && el.getAttribute('aria-label'))
    .map((el) => el.getAttribute('aria-label')),
)
console.log('visible header buttons on mobile:', visibleMenus.join(', '))
if (visibleMenus.includes('Toggle sidebar')) {
  problems.push('[responsive] the desktop sidebar toggle is visible on mobile, where it does nothing')
}

const ov = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
console.log('mobile composer horizontal overflow:', ov, 'px')
if (ov > 1) problems.push(`[responsive] composer scrolls horizontally by ${ov}px`)

await b.close()
console.log('\n=== PROBLEMS ===')
console.log(problems.length ? problems.join('\n') : 'none')
