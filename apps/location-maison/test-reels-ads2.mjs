import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Users/glenneriss/Library/Caches/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const consoleErrs = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text().slice(0, 150)) })
page.on('pageerror', (e) => consoleErrs.push('PAGEERROR ' + e.message.slice(0, 150)))

await page.goto('http://localhost:3000/reels', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.locator('video').first().waitFor({ timeout: 30000 })
await page.waitForTimeout(2000)

function readState() {
  return page.evaluate(() => {
    const section = document.querySelector('section[aria-label="carousel"]')
    const viewport = section?.querySelector(':scope > div')
    const track = viewport?.querySelector(':scope > div')
    const m = new DOMMatrix(getComputedStyle(track).transform)
    const h = viewport.getBoundingClientRect().height
    return { ty: m.m42, idx: Math.round(Math.abs(m.m42) / h), slides: track.children.length }
  })
}

const nextBtn = page.locator('button[aria-label="Réel suivant"]')
console.log('état initial:', JSON.stringify(await readState()))
console.log('bouton suivant désactivé ?', await nextBtn.isDisabled())

for (let i = 1; i <= 5; i++) {
  await nextBtn.click()
  await page.waitForTimeout(900)
  const s = await readState()
  console.log(`après clic ${i}:`, JSON.stringify(s))
}

// à idx 4 on devrait être sur la pub AdSense (rail cadeau masqué)
const giftVisible = await page.locator('button[aria-label="Offrir un cadeau"]:visible').count()
console.log('boutons cadeau visibles à cet index:', giftVisible)

await context.close()
await browser.close()
console.log('--- console errors ---')
console.log(consoleErrs.length ? consoleErrs.join('\n') : '(aucune)')
