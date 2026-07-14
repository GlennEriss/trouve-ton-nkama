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
await page.waitForTimeout(1500)

// Structure du carousel : lister les slides (réels = <video>, pubs = label "Publicité")
const structure = await page.evaluate(() => {
  const section = document.querySelector('section[aria-label="carousel"]')
  const track = section?.querySelector(':scope > div > div')
  return Array.from(track?.children ?? []).map((slide) => {
    if (slide.querySelector('video')) return 'reel'
    const text = slide.textContent ?? ''
    if (text.includes('Publicité') || text.includes('Publicite')) {
      // pub maison si la carte a un CTA/headline maison, sinon AdSense
      return text.includes('Pub maison de test') ? 'ad:house' : 'ad:adsense'
    }
    return 'inconnu'
  })
})
console.log('séquence des slides:', JSON.stringify(structure))
console.log('[attendu : reel×4, ad:adsense, reel×3 (7 seeds + 2 réels — les pubs suivantes arrivent après la pagination), …]')

// Naviguer jusqu'à la 1re pub (index 4) avec le bouton suivant
const nextBtn = page.locator('button[aria-label="Réel suivant"]')
for (let i = 0; i < 4; i++) {
  await nextBtn.click()
  await page.waitForTimeout(600)
}
const transform = await page.evaluate(() => {
  const section = document.querySelector('section[aria-label="carousel"]')
  const track = section?.querySelector(':scope > div > div')
  return track ? getComputedStyle(track).transform : null
})
console.log('transform après 4 clics (sur la diapositive pub):', transform)

// La diapositive pub est-elle visible + le rail cadeau masqué ?
const pubLabel = await page.locator('text=Publicité').first().isVisible().catch(() => false)
const giftVisible = await page.locator('button[aria-label="Offrir un cadeau"]:visible').count()
console.log(`label Publicité visible: ${pubLabel} ; boutons cadeau visibles (rail masqué attendu → 0): ${giftVisible}`)

// Continuer : la pub se scrolle normalement vers le réel suivant
await nextBtn.click()
await page.waitForTimeout(600)
const activeIsVideo = await page.evaluate(() => {
  const section = document.querySelector('section[aria-label="carousel"]')
  const track = section?.querySelector(':scope > div > div')
  const idx = Math.round(Math.abs(new DOMMatrix(getComputedStyle(track).transform).m42) / track.parentElement.getBoundingClientRect().height)
  return Boolean(track?.children[idx]?.querySelector('video'))
})
console.log(`après la pub, slide active = réel: ${activeIsVideo}`)

await context.close()
await browser.close()
console.log('--- pageerrors ---')
console.log(errors.length ? errors.join('\n') : '(aucune)')
