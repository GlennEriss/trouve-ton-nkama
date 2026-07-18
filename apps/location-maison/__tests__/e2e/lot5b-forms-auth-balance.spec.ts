import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

import { mockBalanceApi } from './helpers/balance'
import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'
import {
  expectKeyboardReachable,
  expectLastActionAboveBottomNavigation,
  expectNoBlockingAccessibilityViolations,
  expectNoSmallTouchTargets,
} from './helpers/ux-audit'

type Scenario = {
  name: string
  path: string
  heading: RegExp
  authenticated: boolean
  setup?: (page: Page) => Promise<void>
  ready?: (page: Page) => Locator
  keyboardTarget: (page: Page) => Locator
}

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
] as const

const THEMES = ['light', 'dark'] as const

const SCENARIOS: Scenario[] = [
  {
    name: 'formulaire-studio',
    path: '/property/add/studio',
    heading: /Ajout d'un studio/i,
    authenticated: true,
    setup: async (page) => {
      await page.route('**/api/tags', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, tags: ['Calme', 'Parking', 'Sécurisé'] }),
        })
      })
    },
    keyboardTarget: (page) => page.getByRole('button', { name: /^Suivant$/i }),
  },
  {
    name: 'profil',
    path: '/profil',
    heading: /^Mon profil$/i,
    authenticated: true,
    keyboardTarget: (page) => page.getByRole('link', { name: /Mon solde/i }),
  },
  {
    name: 'informations-profil',
    path: '/profil/informations',
    heading: /Modifier mes informations/i,
    authenticated: true,
    ready: (page) => page.getByRole('button', { name: /Enregistrer les modifications/i }),
    keyboardTarget: (page) => page.getByRole('button', { name: /Enregistrer les modifications/i }),
  },
  {
    name: 'historique-solde',
    path: '/my-balance/history',
    heading: /Historique de crédits/i,
    authenticated: true,
    setup: mockBalanceApi,
    ready: (page) => page.getByText(/169\s+crédits/i).first(),
    keyboardTarget: (page) => page.getByRole('link', { name: /Recharge & packs/i }),
  },
  {
    name: 'recharge-solde',
    path: '/my-balance/recharge',
    heading: /Recharge & packs/i,
    authenticated: true,
    setup: mockBalanceApi,
    ready: (page) => page.getByRole('button', { name: /Choisir le pack Starter/i }),
    keyboardTarget: (page) => page.getByRole('button', { name: /Choisir le pack Starter/i }),
  },
  {
    name: 'connexion',
    path: '/signin',
    heading: /Bienvenue sur Trouve Ton Nkama|Connexion/i,
    authenticated: false,
    keyboardTarget: (page) => page.getByRole('button', { name: /^(Connexion|Se connecter)$/i }),
  },
  {
    name: 'inscription',
    path: '/signup',
    heading: /Explorons ensemble|Qui êtes-vous/i,
    authenticated: false,
    keyboardTarget: (page) => page.getByRole('button', { name: /Annonceur/i }).first(),
  },
]

async function captureScreenshot(
  page: Page,
  scenarioName: string,
  viewportName: string,
  theme: string,
) {
  if (process.env.LOT5B_SCREENSHOTS !== '1') return

  const directory = path.join(
    process.cwd(),
    '..',
    '..',
    'docs',
    'location-maison',
    'testing',
    'screenshots',
    'lot5b',
  )
  await fs.mkdir(directory, { recursive: true })
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.waitForTimeout(100)
  await page.screenshot({
    path: path.join(directory, `${scenarioName}-${viewportName}-${theme}.png`),
    fullPage: true,
    animations: 'disabled',
  })
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`Lot 5B ${viewport.name} ${theme}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      for (const scenario of SCENARIOS) {
        test(`${scenario.name} reste utilisable`, async ({ page, context }) => {
          if (scenario.authenticated) await signInAsAnnouncer(context)
          await mockCommonAppNoise(page)
          await scenario.setup?.(page)
          await page.addInitScript((selectedTheme) => {
            window.localStorage.setItem('theme', selectedTheme)
          }, theme)
          await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme })

          await page.goto(scenario.path, { waitUntil: 'domcontentloaded', timeout: 30_000 })

          await expect(page.getByRole('heading', { name: scenario.heading }).first()).toBeVisible({ timeout: 15_000 })
          if (scenario.ready) await expect(scenario.ready(page)).toBeVisible({ timeout: 15_000 })
          if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)

          await expectNoHorizontalOverflow(page)
          await expectNoBlockingAccessibilityViolations(page)
          await expectKeyboardReachable(page, scenario.keyboardTarget(page))

          if (viewport.name === 'mobile') {
            await expectNoSmallTouchTargets(page)
            await expectLastActionAboveBottomNavigation(page)
          }

          await captureScreenshot(page, scenario.name, viewport.name, theme)
        })
      }
    })
  }
}
