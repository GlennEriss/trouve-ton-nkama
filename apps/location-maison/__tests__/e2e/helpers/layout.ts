import { expect, type Page } from '@playwright/test'

export async function expectNoHorizontalOverflow(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }))

  expect(metrics.scrollWidth, `document overflow: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.clientWidth + 1)
  expect(metrics.bodyScrollWidth, `body overflow: ${JSON.stringify(metrics)}`).toBeLessThanOrEqual(metrics.clientWidth + 1)
}
