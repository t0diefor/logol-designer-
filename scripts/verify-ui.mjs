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

await browser.close()

console.log('\n=== CONSOLE / ASSERTION PROBLEMS ===')
if (problems.length === 0) console.log('none')
else problems.forEach((p) => console.log(' -', p))
fs.writeFileSync(`${OUT}/report.txt`, problems.join('\n') || 'none')
