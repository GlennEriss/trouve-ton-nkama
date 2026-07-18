import { expect, test, type Locator, type Page } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'
import { mockDiscoverySurfaces, mockReelsSurface } from './helpers/transversal-surfaces'
import {
  expectKeyboardReachable,
  expectLastActionAboveBottomNavigation,
  expectNoBlockingAccessibilityViolations,
  expectNoSmallTouchTargets,
} from './helpers/ux-audit'

type Scenario = {
  name: string
  path: string
  heading?: RegExp
  authenticated: boolean
  setup?: (page: Page) => Promise<void>
  ready?: (page: Page) => Locator
  keyboardTarget: (page: Page) => Locator
  fullScreen?: boolean
}

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1440, height: 960 },
] as const

const THEMES = ['light', 'dark'] as const

const SCENARIOS: Scenario[] = [
  {
    name: 'accueil',
    path: '/',
    heading: /Rechercher sur Trouve Ton Nkama|Trouvez le logement idéal/i,
    authenticated: false,
    setup: mockDiscoverySurfaces,
    keyboardTarget: (page) => page.getByRole('link', { name: /^Rechercher une annonce$/i }).first(),
  },
  {
    name: 'recherche',
    path: '/search',
    heading: /Rechercher sur Trouve Ton Nkama|Filtres de recherches/i,
    authenticated: false,
    setup: mockDiscoverySurfaces,
    ready: (page) => page.getByText(/Aucun résultat trouvé|Aucun bien ne correspond/i).first(),
    keyboardTarget: (page) => page.getByRole('link', { name: /Rechercher avec IA|recherche IA/i }).first(),
  },
  {
    name: 'choix-type-annonce',
    path: '/property/add',
    heading: /Ajouter un logement/i,
    authenticated: true,
    keyboardTarget: (page) => page.getByRole('link', { name: /^Maison$/i }),
  },
  {
    name: 'publier',
    path: '/publish',
    heading: /^Publier$/i,
    authenticated: true,
    keyboardTarget: (page) => page.getByRole('link', { name: /Publier une annonce/i }),
  },
  {
    name: 'favoris',
    path: '/favoris',
    heading: /Mes favoris/i,
    authenticated: true,
    ready: (page) => page.getByText(/Aucun favori pour le moment/i),
    keyboardTarget: (page) => page.getByRole('link', { name: /Rechercher des annonces/i }),
  },
  {
    name: 'notifications',
    path: '/list-notifications',
    heading: /Mes notifications/i,
    authenticated: true,
    ready: (page) => page.getByText(/aucune notification pour le moment/i),
    keyboardTarget: (page) => page.getByRole('link', { name: /Gérer mes préférences/i }),
  },
  {
    name: 'connexion-securite',
    path: '/login-and-security',
    heading: /Connexion et sécurité/i,
    authenticated: true,
    ready: (page) => page.getByRole('heading', { name: /Méthodes de connexion/i }),
    keyboardTarget: (page) => page.getByRole('button', { name: /Associer/i }),
  },
  {
    name: 'parametres',
    path: '/settings',
    heading: /^Paramètres$/i,
    authenticated: true,
    ready: (page) => page.getByRole('heading', { name: /Notifications/i }),
    keyboardTarget: (page) => page.getByRole('switch', { name: /Activer le mode sombre/i }),
  },
  {
    name: 'mes-reels',
    path: '/reels/mine',
    heading: /Mes réels/i,
    authenticated: true,
    ready: (page) => page.getByRole('heading', { name: /Vous n'avez encore créé aucun réel|Aucun réel sur cette période/i }),
    keyboardTarget: (page) => page.getByRole('link', { name: /Nouveau réel/i }),
  },
  {
    name: 'fil-reels',
    path: '/reels',
    authenticated: false,
    setup: async (page) => {
      await mockDiscoverySurfaces(page)
      await mockReelsSurface(page)
    },
    ready: (page) => page.getByRole('button', { name: /J'aime ce réel/i }),
    keyboardTarget: (page) => page.viewportSize()?.width && page.viewportSize()!.width > 768
      ? page.getByRole('button', { name: /Réel précédent/i })
      : page.getByRole('button', { name: /J'aime ce réel/i }),
    fullScreen: true,
  },
]

async function captureScreenshot(
  page: Page,
  scenario: Scenario,
  viewportName: string,
  theme: string,
) {
  if (process.env.LOT5C_SCREENSHOTS !== '1') return

  const directory = path.join(
    process.cwd(),
    '..',
    '..',
    'docs',
    'location-maison',
    'testing',
    'screenshots',
    'lot5c',
  )
  await fs.mkdir(directory, { recursive: true })
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  await page.waitForTimeout(100)
  await page.screenshot({
    path: path.join(directory, `${scenario.name}-${viewportName}-${theme}.png`),
    fullPage: !scenario.fullScreen,
    animations: 'disabled',
  })
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`Lot 5C ${viewport.name} ${theme}`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      for (const scenario of SCENARIOS) {
        test(`${scenario.name} reste cohérent et accessible`, async ({ page, context }) => {
          if (scenario.authenticated) await signInAsAnnouncer(context)
          await mockCommonAppNoise(page)
          await scenario.setup?.(page)
          await page.addInitScript((selectedTheme) => {
            window.localStorage.setItem('theme', selectedTheme)
          }, theme)
          await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme })

          await page.goto(scenario.path, { waitUntil: 'domcontentloaded', timeout: 30_000 })

          if (scenario.heading) {
            await expect(page.getByRole('heading', { name: scenario.heading }).first()).toBeVisible({ timeout: 15_000 })
          }
          if (scenario.ready) await expect(scenario.ready(page)).toBeVisible({ timeout: 15_000 })
          if (theme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/)

          await expectNoHorizontalOverflow(page)
          await expectNoBlockingAccessibilityViolations(page)
          await expectKeyboardReachable(page, scenario.keyboardTarget(page))

          if (viewport.name === 'mobile') {
            await expectNoSmallTouchTargets(page)
            if (!scenario.fullScreen) await expectLastActionAboveBottomNavigation(page)
          }

          await captureScreenshot(page, scenario, viewport.name, theme)
        })
      }
    })
  }
}
