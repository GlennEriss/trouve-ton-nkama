import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

import { mockAdvertisingApi } from './helpers/advertising'
import { mockAnnouncerAds } from './helpers/announcer-ads'
import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { mockGiftsApi } from './helpers/gifts'
import { expectNoHorizontalOverflow } from './helpers/layout'
import {
  expectLastActionAboveBottomNavigation,
  expectNoBlockingAccessibilityViolations,
  expectNoSmallTouchTargets,
} from './helpers/ux-audit'

type Scenario = {
  name: string
  path: string
  heading: RegExp
  setup?: (page: Page) => Promise<void>
  prepareAudit?: (page: Page) => Promise<void>
}

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
] as const

const SCENARIOS: Scenario[] = [
  {
    name: 'creation-reel',
    path: '/reels/add?returnTo=%2Freels%2Fmine',
    heading: /Créer un réel/i,
  },
  {
    name: 'gestion-annonces',
    path: '/property',
    heading: /Gestion des annonces/i,
    setup: mockAnnouncerAds,
  },
  {
    name: 'creation-publicite',
    path: '/advertising/create',
    heading: /Créer une publicité/i,
    setup: mockAdvertisingApi,
  },
  {
    name: 'cadeaux',
    path: '/gifts',
    heading: /Mes cadeaux/i,
    setup: mockGiftsApi,
    prepareAudit: async (page) => {
      await page.getByRole('button', { name: /Retirer 32.?500 FCFA/i }).click()
    },
  },
]

async function captureAuditScreenshot(page: Page, scenarioName: string, viewportName: string) {
  const phase = process.env.LOT5_SCREENSHOT_PHASE
  if (phase !== 'before' && phase !== 'after') return

  const directory = path.join(process.cwd(), '..', '..', 'docs', 'location-maison', 'testing', 'screenshots', 'lot5', phase)
  await fs.mkdir(directory, { recursive: true })
  await page.screenshot({
    path: path.join(directory, `${scenarioName}-${viewportName}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}

for (const viewport of VIEWPORTS) {
  test.describe(`Lot 5 UX et accessibilité ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test.beforeEach(async ({ page }) => {
      await signInAsAnnouncer(page.context())
      await mockCommonAppNoise(page)
      await page.emulateMedia({ reducedMotion: 'reduce' })
    })

    for (const scenario of SCENARIOS) {
      test(`${scenario.name} reste cohérent et accessible`, async ({ page }) => {
        await scenario.setup?.(page)
        await page.goto(scenario.path, { waitUntil: 'domcontentloaded', timeout: 30_000 })

        await expect(page.getByRole('heading', { name: scenario.heading }).first()).toBeVisible({ timeout: 15_000 })
        await scenario.prepareAudit?.(page)
        await expectNoHorizontalOverflow(page)
        await captureAuditScreenshot(page, scenario.name, viewport.name)

        await expectNoBlockingAccessibilityViolations(page)

        if (viewport.name === 'mobile') {
          await expectNoSmallTouchTargets(page)
          await expectLastActionAboveBottomNavigation(page)
        }
      })
    }
  })
}
