import { test } from '@playwright/test'

test('debug reported url', async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') console.log('CONSOLE:', msg.type(), msg.text())
  })
  page.on('requestfailed', (req) => console.log('FAILED:', req.url(), req.failure()?.errorText))
  page.on('response', (res) => {
    if (res.url().includes('algolia') || res.url().includes('/api/')) {
      console.log('RESP:', res.status(), res.url().slice(0, 200))
    }
  })
  await page.setViewportSize({ width: 1280, height: 1400 })
  await page.goto(
    '/search?province=Estuaire&city=Libreville&street=Angondj%C3%A9&maxPrice=10000&category=Mode',
    { waitUntil: 'domcontentloaded' }
  )
  await page.waitForTimeout(6000)
  await page.screenshot({ path: 'test-results/debug-url.png', fullPage: true })
  const bodyText = await page.locator('body').innerText()
  console.log('CONTAINS annonces trouvees:', /annonce/i.test(bodyText))
  const match = bodyText.match(/(\d+)\s+annonces? trouv/i)
  console.log('match:', match?.[0])
})
