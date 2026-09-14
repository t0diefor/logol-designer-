/**
 * Browser verification for the manual-inspection step of each phase.
 *
 * Drives a real Chromium through the core flows, screenshots every theme and
 * viewport, and asserts the things that are easy to break and hard to notice:
 * console errors, persistence round-trips, keyboard focus order and mobile
 * horizontal overflow.
 *
 * It exists because unit tests cannot catch a bad store subscription -- the
 * render loop fixed in phase 1 passed every unit test and only appeared in a
 * browser.
 *
 * Usage:
 *   npm run dev          # in one terminal
 *   npm run verify:ui    # in another
 *
 * Screenshots are written to .screenshots/ (git-ignored).
 */
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.PF_BASE_URL ?? 'http://127.0.0.1:5173'
const OUT = '.screenshots'
const problems = []

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (msg) => {
  const type = msg.type()
  if (type === 'error' || type === 'warning') {
    const text = msg.text()
    // Webfonts are blocked in some sandboxes; every theme declares a full
    // fallback stack, so a font that fails to load is not an app error.
    if (text.includes('fonts.googleapis') || text.includes('fonts.gstatic')) return
    if (text.includes('ERR_CONNECTION_RESET') || text.includes('ERR_BLOCKED')) return
    problems.push(`[console.${type}] ${text}`)
  }
})
page.on('pageerror', (err) => problems.push(`[pageerror] ${err.message}`))

async function shot(name) {
  await page.waitForTimeout(450)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log('captured', name)
}

// 1. First run: empty state.
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForSelector('h1')
console.log('H1 on load:', await page.locator('h1').first().innerText())
await shot('01-empty-dashboard')

// 2. Create a project through the real UI.
await page.getByRole('button', { name: 'Create a project' }).click()
await page.waitForURL('**/projects')
await page.getByRole('button', { name: 'Create your first project' }).click()
await page.getByLabel('Title').fill('The Lantern Wars')
await page.getByLabel('Logline').fill("A lamplighter discovers the city's lights are keeping something asleep.")
await page.getByLabel('Genre').fill('Gothic fantasy')
await page.getByRole('button', { name: 'Create project' }).click()
await page.waitForTimeout(600)
await shot('02-projects-with-one')

// Add two more so filtering has something to do.
for (const [title, logline, genre] of [
  ['Tidewrack', 'Salvagers find a city breathing under the waves.', 'Sea horror'],
  ['Paper Saints', 'A forger starts printing real miracles.', 'Magic realism'],
]) {
  await page.getByRole('button', { name: 'New project' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Logline').fill(logline)
  await page.getByLabel('Genre').fill(genre)
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.waitForTimeout(400)
}
await shot('03-projects-grid')

// 3. Verify persistence actually round-trips through IndexedDB.
await page.reload({ waitUntil: 'networkidle' })
await page.waitForTimeout(900)
const survived = await page.getByText('The Lantern Wars').count()
if (survived === 0) problems.push('[persistence] projects did not survive a reload')
else console.log('persistence: projects survived reload')

// 4. Dashboard with a project selected.
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await shot('04-dashboard-bento')

// 5. Every theme, on the dashboard.
const themes = ['Dark Fantasy', 'Cyberpunk Neon', 'Animated Storybook', 'Brutalist', 'Cozy Pastel', 'Sci-Fi Holographic']
for (const [i, name] of themes.entries()) {
  await page.getByRole('button', { name: /Dark Fantasy|Cyberpunk Neon|Animated Storybook|Brutalist|Cozy Pastel|Sci-Fi Holographic|Theme/ }).first().click()
  await page.waitForTimeout(350)
  await page.getByRole('radio', { name: new RegExp(name) }).check({ force: true })
  await page.waitForTimeout(350)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(450)
  const applied = await page.evaluate(() => document.documentElement.dataset.theme)
  console.log(`theme ${name} -> data-theme=${applied}`)
  await shot(`05-theme-${String(i + 1).padStart(2, '0')}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`)
}

// Back to the default theme for the remaining shots.
await page.getByRole('button', { name: /Sci-Fi Holographic/ }).first().click()
await page.waitForTimeout(300)
await page.getByRole('radio', { name: /Dark Fantasy/ }).check({ force: true })
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// 6. Settings and a roadmap placeholder.
await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await shot('06-settings')

await page.goto(`${BASE}/composer`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await shot('07-roadmap-composer')

// 7. Keyboard accessibility: the skip link must be the first stop.
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.keyboard.press('Tab')
const firstFocus = await page.evaluate(() => document.activeElement?.textContent?.trim())
console.log('first tab stop:', firstFocus)
if (firstFocus !== 'Skip to main content') problems.push(`[a11y] first tab stop was "${firstFocus}", expected the skip link`)
await shot('08-focus-skip-link')

// 8. Mobile layout.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const mpage = await mobile.newPage()
mpage.on('pageerror', (err) => problems.push(`[mobile pageerror] ${err.message}`))
await mpage.goto(`${BASE}/projects`, { waitUntil: 'networkidle' })
await mpage.waitForTimeout(900)
await mpage.screenshot({ path: `${OUT}/09-mobile-projects.png` })
console.log('captured 09-mobile-projects')

// Horizontal overflow is a real layout bug, so check for it rather than eyeballing.
const overflow = await mpage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
console.log('mobile horizontal overflow (px):', overflow)
if (overflow > 1) problems.push(`[responsive] mobile page scrolls horizontally by ${overflow}px`)

await mpage.getByRole('button', { name: 'Open navigation' }).click()
await mpage.waitForTimeout(600)
await mpage.screenshot({ path: `${OUT}/10-mobile-nav.png` })
console.log('captured 10-mobile-nav')


// ===========================================================================
// Phase 2: Character Builder
// ===========================================================================
await page.goto(`${BASE}/characters`, { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await shot('11-characters-empty')

await page.getByRole('button', { name: 'Create your first character' }).click()
await page.getByLabel('Name').fill('Mira Halloway')
await page.getByLabel('Role').fill('Protagonist')
await page.getByRole('button', { name: 'Create character' }).click()
await page.waitForURL('**/characters/*')
await page.waitForTimeout(700)
await shot('12-character-identity')

// Appearance tab, reached with the keyboard rather than a click.
await page.getByRole('tab', { name: /Identity/ }).focus()
await page.keyboard.press('ArrowRight')
await page.waitForTimeout(400)
const appearanceSelected = await page
  .getByRole('tab', { name: /Appearance/ })
  .getAttribute('aria-selected')
console.log('arrow-key tab navigation selected Appearance:', appearanceSelected)
if (appearanceSelected !== 'true') problems.push('[a11y] arrow keys did not move between tabs')
await shot('13-character-appearance')

// Palette: proves the preview plate picks up the colour.
await page.getByRole('tab', { name: /Identity/ }).click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Add colour' }).click()
await page.waitForTimeout(400)

// Wardrobe and expressions.
await page.getByRole('tab', { name: /Wardrobe/ }).click()
await page.getByRole('button', { name: 'Add the first outfit' }).click()
await page.waitForTimeout(400)
await shot('14-character-wardrobe')

await page.getByRole('tab', { name: /Expressions/ }).click()
await page.waitForTimeout(300)
for (const mood of ['Neutral', 'Angry', 'Afraid']) {
  await page.getByRole('button', { name: mood, exact: true }).click()
  await page.waitForTimeout(200)
}
await shot('15-character-expressions')

// Reference image upload, exercising the real IndexedDB blob path.
await page.getByRole('tab', { name: /References/ }).click()
await page.waitForTimeout(300)
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAO0lEQVR42u3OMQEAAAgDoC251a3gL2Qg3RkAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4G8HkQ4AAX0kXqUAAAAASUVORK5CYII=',
  'base64',
)
await page.setInputFiles('input[type="file"]', {
  name: 'mira-face.png',
  mimeType: 'image/png',
  buffer: png,
})
await page.waitForTimeout(1200)
const referenceShown = await page.getByText('mira-face').count()
console.log('reference image stored and listed:', referenceShown > 0)
if (referenceShown === 0) problems.push('[assets] uploaded reference did not appear in the list')
await shot('16-character-references')

// AI assist: disclosure, generate, review, apply.
await page.getByRole('tab', { name: /Assist/ }).click()
await page.waitForTimeout(400)
await shot('17-ai-disclosure')

await page.getByRole('button', { name: 'Suggest content' }).click()
await page.waitForTimeout(1400)
await shot('18-ai-review')

// The record must be untouched until the user accepts something.
const goalsBeforeApply = await page.evaluate(async () => {
  const request = indexedDB.open('panelforge')
  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const raw = await new Promise((resolve) => {
    const tx = db.transaction('kv', 'readonly').objectStore('kv').get('panelforge.workspace')
    tx.onsuccess = () => resolve(tx.result)
    tx.onerror = () => resolve(null)
  })
  if (!raw) return null
  const parsed = JSON.parse(raw)
  const characters = Object.values(parsed.state.characters ?? {})
  return characters[0]?.goals ?? null
})
console.log('goals before applying suggestions:', JSON.stringify(goalsBeforeApply))
if (goalsBeforeApply) problems.push('[ai] a suggestion reached the record before it was accepted')

await page.getByRole('button', { name: 'Accept all' }).click()
await page.waitForTimeout(400)
await page.getByRole('button', { name: /Apply \d+ accepted/ }).click()
await page.waitForTimeout(900)
await shot('19-ai-applied')

// History should now hold the automatic restore point.
await page.getByRole('tab', { name: /History/ }).click()
await page.waitForTimeout(500)
const restorePoint = await page.getByText('Before AI suggestions').count()
console.log('automatic restore point saved:', restorePoint > 0)
if (restorePoint === 0) problems.push('[ai] applying suggestions did not save a restore point')
await shot('20-character-history')

// Consistency checklist should have moved.
await page.getByRole('tab', { name: /Identity/ }).click()
await page.waitForTimeout(500)
await shot('21-character-complete')

// Cast list with a populated character.
await page.goto(`${BASE}/characters`, { waitUntil: 'networkidle' })
await page.waitForTimeout(800)
await shot('22-characters-populated')

await browser.close()

console.log('\n=== CONSOLE / ASSERTION PROBLEMS ===')
if (problems.length === 0) console.log('none')
else problems.forEach((p) => console.log(' -', p))
fs.writeFileSync(`${OUT}/report.txt`, problems.join('\n') || 'none')
