# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: _tmp-visual-check.spec.ts >> visual check gift section + skeleton
- Location: __tests__/e2e/_tmp-visual-check.spec.ts:25:5

# Error details

```
TimeoutError: page.screenshot: Timeout 10000ms exceeded.
Call log:
  - taking page screenshot
  - waiting for fonts to load...

```

# Test source

```ts
  1  | import crypto from 'node:crypto'
  2  | import { expect, test } from '@playwright/test'
  3  | import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
  4  | import { deleteProperties, seedProperties, type SeedProperty } from './helpers/firebase-admin'
  5  | 
  6  | const RUN_ID = crypto.randomUUID()
  7  | const OWNER_UID = `e2e-visual-check-${RUN_ID}`
  8  | const VILLA: SeedProperty = {
  9  |   id: `e2e-visual-villa-${RUN_ID}`,
  10 |   title: 'à louer - Akébé Frontière',
  11 |   description: 'Test visuel de la section Cadeau et du skeleton.',
  12 |   typeProperty: 'Villa',
  13 |   status: 'FOR_RENT',
  14 |   state: 'IN_PROGRESS',
  15 |   moderationStatus: 'APPROVED',
  16 |   price: 300000,
  17 |   area: 150,
  18 |   province: 'Estuaire',
  19 |   city: 'Libreville',
  20 |   street: 'Rue de test',
  21 |   latitude: 0.4162,
  22 |   longitude: 9.4673,
  23 | }
  24 | 
  25 | test('visual check gift section + skeleton', async ({ page }) => {
  26 |   await seedProperties(OWNER_UID, [VILLA])
  27 |   await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })
  28 | 
  29 |   // Skeleton : throttle le réseau pour avoir le temps de capturer l'état loading.
  30 |   const client = await page.context().newCDPSession(page)
  31 |   await client.send('Network.emulateNetworkConditions', {
  32 |     offline: false,
  33 |     downloadThroughput: (30 * 1024) / 8,
  34 |     uploadThroughput: (30 * 1024) / 8,
  35 |     latency: 200,
  36 |   })
  37 |   page.goto(`/property/${VILLA.id}`, { waitUntil: 'domcontentloaded' }).catch(() => undefined)
  38 |   await page.waitForTimeout(1000)
> 39 |   await page.screenshot({ path: 'test-results/visual-skeleton.png' })
     |              ^ TimeoutError: page.screenshot: Timeout 10000ms exceeded.
  40 |   await client.send('Network.emulateNetworkConditions', {
  41 |     offline: false,
  42 |     downloadThroughput: -1,
  43 |     uploadThroughput: -1,
  44 |     latency: 0,
  45 |   })
  46 |   await page.goto(`/property/${VILLA.id}`, { waitUntil: 'domcontentloaded' })
  47 | 
  48 |   await expect(page.getByRole('heading', { name: VILLA.title })).toBeVisible()
  49 |   await page.getByText('Envoyer un cadeau').scrollIntoViewIfNeeded()
  50 |   await page.screenshot({ path: 'test-results/visual-gift-section.png' })
  51 | 
  52 |   await deleteProperties([VILLA.id])
  53 | })
  54 | 
```