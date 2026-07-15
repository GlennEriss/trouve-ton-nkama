import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Users/glenneriss/Library/Caches/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const errors = []
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (err) => errors.push(err.message))

await page.goto('http://localhost:3000/reels', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.locator('video').first().waitFor({ timeout: 30000 })
await page.waitForTimeout(2000)

// Naviguer jusqu'à trouver la diapositive pub (badge "Publicité")
const nextBtn = page.locator('button[aria-label="Réel suivant"]')
let foundAdSlide = false
for (let i = 0; i < 6; i++) {
  const hasAdBadge = await page.locator('text=Publicité').isVisible().catch(() => false)
  if (hasAdBadge) { foundAdSlide = true; break }
  await nextBtn.click().catch(() => {})
  await page.waitForTimeout(700)
}
console.log(`diapositive pub trouvée après navigation: ${foundAdSlide}`)

if (foundAdSlide) {
  const structure = await page.evaluate(() => {
    const section = document.querySelector('section[aria-label="carousel"]')
    const track = section?.querySelector(':scope > div > div')
    const active = Array.from(track?.children ?? []).find((c) => c.textContent?.includes('Publicité'))
    return {
      hasBlackBg: !!active?.querySelector('.bg-neutral-950'),
      hasVideo: !!active?.querySelector('video'),
      hasImg: !!active?.querySelector('img'),
      videoSrc: active?.querySelector('video')?.getAttribute('src')?.slice(0, 60),
      cardWidthClass: active?.querySelector('.w-\\[85\\%\\]') ? 'w-[85%] présent' : 'absent',
    }
  })
  console.log('structure diapositive pub:', JSON.stringify(structure, null, 1))
}

await context.close()
await browser.close()
console.log('--- pageerrors ---')
console.log(errors.length ? errors.join('\n') : '(aucune)')
