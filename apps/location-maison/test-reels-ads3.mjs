import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Users/glenneriss/Library/Caches/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

await page.goto('http://localhost:3000/reels', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.locator('video').first().waitFor({ timeout: 30000 })
await page.waitForTimeout(2000)

const readState = () => page.evaluate(() => {
  const track = document.querySelector('section[aria-label="carousel"] > div > div')
  const m = new DOMMatrix(getComputedStyle(track).transform)
  return { ty: Math.round(m.m42) }
})

// Drag vertical (pointer events gérés par embla directement)
const box = await page.locator('section[aria-label="carousel"]').boundingBox()
const cx = box.x + box.width / 2
await page.mouse.move(cx, box.y + box.height * 0.8)
await page.mouse.down()
for (let i = 1; i <= 12; i++) {
  await page.mouse.move(cx, box.y + box.height * 0.8 - i * 45, { steps: 1 })
  await page.waitForTimeout(16)
}
await page.mouse.up()
await page.waitForTimeout(900)
console.log('après drag:', JSON.stringify(await readState()), '[si ty<0 : embla vivant, api React morte]')

// Puis re-tester le bouton après le drag
await page.locator('button[aria-label="Réel suivant"]').click()
await page.waitForTimeout(900)
console.log('après clic bouton:', JSON.stringify(await readState()))

await context.close()
await browser.close()
