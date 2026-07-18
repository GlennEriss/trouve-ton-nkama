import { expect, test, type Page } from '@playwright/test'
import { mockAnnouncerAds } from './helpers/announcer-ads'
import { mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { expectNoHorizontalOverflow } from './helpers/layout'

const MOBILE_SIZE = { width: 390, height: 844 }

async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30_000 })
}

test.describe('Lot 4B mobile annonceur', () => {
  test.use({ viewport: MOBILE_SIZE })

  test.beforeEach(async ({ page }) => {
    await signInAsAnnouncer(page.context())
    await mockCommonAppNoise(page)
  })

  test('la page publier affiche les choix connectes et la bottom navigation annonceur', async ({ page }) => {
    await mockAnnouncerAds(page)
    await gotoApp(page, '/publish')

    await expect(page.getByRole('heading', { name: /^Publier$/i })).toBeVisible()

    const bottomNav = page.getByRole('navigation', { name: /Navigation mobile/i })
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Annonces/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Recherche/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /^Publier$/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Réels/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Profil/i })).toBeVisible()
    await expect(bottomNav.getByRole('link', { name: /Connexion/i })).toHaveCount(0)

    await expect(page.getByRole('link', { name: /Publier une annonce/i })).toHaveAttribute('href', '/property/add')
    await expect(page.getByRole('link', { name: /Créer un réel/i })).toHaveAttribute('href', '/reels/select-property')
    await expectNoHorizontalOverflow(page)

    await bottomNav.getByRole('link', { name: /Annonces/i }).click()
    await expect(page).toHaveURL(/\/property$/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /Gestion des annonces/i })).toBeVisible()
  })

  test('la gestion des annonces rend les stats, filtres et actions principales', async ({ page }) => {
    await mockAnnouncerAds(page)
    await gotoApp(page, '/property')

    await expect(page).not.toHaveURL(/\/signin/)
    await expect(page.getByRole('heading', { name: /Gestion des annonces/i })).toBeVisible()
    await expect(page.getByText(/Espace annonceur/i)).toBeVisible()
    await expect(page.getByText(/Total annonces/i)).toBeVisible()
    await expect(page.getByText('Actives', { exact: true }).first()).toBeVisible()
    await expect(page.getByPlaceholder(/Titre, description, ville, quartier/i)).toBeVisible()
    await expect(page.getByText(/1 annonce\(s\) affichée\(s\) sur 1 au total/i)).toBeVisible()

    await expect(page.getByRole('link', { name: /Mes réels/i })).toHaveAttribute('href', '/reels/mine')
    await expect(page.getByRole('link', { name: /Mes cadeaux/i })).toHaveAttribute('href', '/gifts')
    await expect(page.getByRole('link', { name: /Publier une annonce/i }).first()).toHaveAttribute('href', '/property/add')

    await expect(page.getByRole('heading', { name: /Appartement moderne a Akanda/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^Voir$/i })).toHaveAttribute('href', '/property/property-e2e-1')
    await expect(page.getByRole('link', { name: /Modifier/i })).toHaveAttribute('href', '/property/modify/property-e2e-1')
    await expect(page.getByRole('link', { name: /Ajouter un réel/i })).toHaveAttribute('href', '/property/property-e2e-1/reels/add')
    await expectNoHorizontalOverflow(page)
  })

  test('mes reels garde le retour vers la liste apres nouveau reel', async ({ page }) => {
    await gotoApp(page, '/reels/mine')

    await expect(page).not.toHaveURL(/\/signin/)
    await expect(page.getByRole('heading', { name: /Mes réels/i })).toBeVisible()

    const newReelLink = page.getByRole('link', { name: /Nouveau réel/i })
    await expect(newReelLink).toHaveAttribute('href', '/reels/add?returnTo=%2Freels%2Fmine')
    await newReelLink.click()

    await expect(page).toHaveURL(/\/reels\/add\?returnTo=%2Freels%2Fmine/, { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /Créer un réel/i })).toBeVisible()
    await expect(page.getByRole('navigation', { name: /Navigation mobile/i })).toHaveCount(0)

    await page.getByRole('link', { name: /Retour/i }).click()
    await expect(page).toHaveURL(/\/reels\/mine$/, { timeout: 20_000 })
  })
})
