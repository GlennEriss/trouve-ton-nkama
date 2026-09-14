import { test } from '@playwright/test';

test('verify detail page fix', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  const response = await page.goto('http://localhost:3000/annonce/e2e-visual-villa-7805bfde-a6b2-42d6-ae42-5263339df3a0', { waitUntil: 'load', timeout: 40000 });
  console.log('STATUS', response?.status());
  await page.waitForTimeout(3000);
  console.log('ERRORS_COUNT', errors.length);
  if (errors.length) console.log(errors.join('\n---\n'));
  const bodyText = await page.locator('body').innerText().catch(() => 'FAILED');
  console.log('HAS_ERROR_UI', bodyText.includes('Un problème est survenu'));
  console.log('BODY_SNIPPET', bodyText.slice(0, 300));
});
