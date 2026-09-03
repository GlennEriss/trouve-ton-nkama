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
