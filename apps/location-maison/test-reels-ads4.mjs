import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Users/glenneriss/Library/Caches/ms-playwright/chromium-1200/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

await page.goto('http://localhost:3000/reels', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.locator('video').first().waitFor({ timeout: 30000 })
await page.waitForTimeout(3000)

const diag = await page.evaluate(() => {
  const section = document.querySelector('section[aria-label="carousel"]')
  const viewport = section?.querySelector(':scope > div')
  const track = viewport?.querySelector(':scope > div')
  const inlineStyles = (el) => el?.getAttribute('style') ?? '(aucun)'
  return {
    sectionStyle: inlineStyles(section),
    viewportStyle: inlineStyles(viewport),
    trackStyle: inlineStyles(track),
    viewportH: viewport?.getBoundingClientRect().height,
    trackH: track?.getBoundingClientRect().height,
    itemHeights: Array.from(track?.children ?? []).map((c) => Math.round(c.getBoundingClientRect().height)),
    insCount: document.querySelectorAll('ins.adsbygoogle').length,
    insParentsWithInline: Array.from(document.querySelectorAll('ins.adsbygoogle')).map((ins) => {
      const chain = []
      let el = ins.parentElement
      while (el && el.tagName !== 'BODY') {
        if (el.getAttribute('style')) chain.push(`${el.tagName}.${String(el.className).slice(0, 40)} → ${el.getAttribute('style')}`)
        el = el.parentElement
      }
      return chain
    }),
  }
})
console.log(JSON.stringify(diag, null, 1))

await context.close()
await browser.close()
