import { expect, test } from '@playwright/test'

/**
 * Landing publique /publicite — voir
 * docs/location-maison/feature/publicite/LANDING-PUBLICITE.md. Page entièrement publique,
 * pas de session requise ; vraie lecture Firestore (credit_packs) côté serveur pour les tarifs,
 * pas mockée.
 */
test.describe('/publicite — landing publique', () => {
  test('charge sans session, H1 unique, prix, CTA et sections attendues', async ({ page }) => {
    const response = await page.goto('/publicite', { waitUntil: 'domcontentloaded' })
    expect(response?.ok()).toBe(true)

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Faites connaître votre activité au public gabonais',
    )
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)

    await expect(page.getByText(/À partir de .*FCFA pour 7 jours/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Créer ma publicité' }).first()).toHaveAttribute(
      'href',
      '/advertising/create',
    )

    // Sections clés présentes (ancres du §3.1).
    await expect(page.locator('#emplacements')).toBeVisible()
    await expect(page.locator('#tarifs')).toBeVisible()
    await expect(page.locator('#faq')).toBeVisible()
    await expect(page.getByText('Où votre publicité apparaît')).toBeVisible()
    // "Comment ça marche" apparaît aussi dans le lien d'ancre du sous-menu (même texte) — on
    // vise ici précisément le H2 de la section pour éviter une collision de strict mode.
    await expect(page.getByRole('heading', { name: 'Comment ça marche' })).toBeVisible()
    await expect(page.getByText('Découverte')).toBeVisible()
    await expect(page.getByText('Questions fréquentes')).toBeVisible()
  })

  test('la FAQ répond au clic', async ({ page }) => {
    await page.goto('/publicite', { waitUntil: 'domcontentloaded' })
    const question = page.getByRole('button', { name: /Dois-je avoir un compte/ })
    await question.scrollIntoViewIfNeeded()
    await expect(page.getByText(/Non pour consulter cette page/)).not.toBeVisible()
    await question.click()
    await expect(page.getByText(/Non pour consulter cette page/)).toBeVisible()
  })

  test('les données structurées JSON-LD (Service + FAQPage + BreadcrumbList) sont présentes', async ({ page }) => {
    await page.goto('/publicite', { waitUntil: 'domcontentloaded' })
    const scripts = await page.locator('script[type="application/ld+json"]').allTextContents()
    const parsed = scripts.map((s) => JSON.parse(s))
    const types = parsed.map((p) => p['@type'])
    expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'Service', 'FAQPage']))
  })

  test('métadonnées SEO : title, canonical, robots indexable', async ({ page }) => {
    await page.goto('/publicite', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveTitle('Publicité au Gabon dès 3 750 FCFA | Trouve Ton Nkama')
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toContain('/publicite')
    const robotsMeta = await page.locator('meta[name="robots"]').count()
    // Aucune balise robots explicite = indexable par défaut (pas de noindex ajouté).
    if (robotsMeta > 0) {
      const content = await page.locator('meta[name="robots"]').getAttribute('content')
      expect(content).not.toContain('noindex')
    }
  })

  test('le CTA "Créer ma publicité" mène bien à une connexion utilisable pour un visiteur non connecté', async ({
    page,
  }) => {
    // Preuve de bout en bout du parcours décrit en §2 de LANDING-PUBLICITE.md : "le même bouton
    // ouvre la connexion... avec un paramètre de retour vers /advertising/create". Ne vérifie
    // pas qu'un simple lien href pointe au bon endroit (déjà fait par le premier test) mais que
    // la navigation réelle aboutit à une page de connexion qui charge effectivement.
    await page.goto('/publicite', { waitUntil: 'domcontentloaded' })
    await page.getByRole('link', { name: 'Créer ma publicité' }).first().click()
    await expect(page).toHaveURL(/\/signin\?callbackUrl=%2Fadvertising%2Fcreate/, { timeout: 15000 })
    // La page de connexion doit réellement se charger (pas un 500) — un vrai formulaire de
    // connexion visible. Le composant diffère entre desktop et mobile (heading/bouton différents
    // selon le breakpoint, vu en comparant les deux) — le champ mot de passe est le point commun
    // fiable aux deux variantes.
    await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('/faire-de-la-pub redirige en 308 vers /publicite (ancienne landing concierge)', async ({ request }) => {
    const response = await request.get('/faire-de-la-pub', { maxRedirects: 0 })
    expect(response.status()).toBe(308)
    expect(response.headers()['location']).toContain('/publicite')
  })

  test('/publicite figure dans le sitemap', async ({ request }) => {
    const response = await request.get('/sitemap.xml')
    expect(response.ok()).toBe(true)
    const body = await response.text()
    expect(body).toContain('/publicite</loc>')
  })
})
