import { expect, test } from '@playwright/test'

import { signInAsAnnouncer } from './helpers/auth'

/**
 * Raccourci "Mes publicités" dans la barre d'actions de /property (Gestion des annonces) —
 * demande explicite de l'utilisateur. Les autres raccourcis de cette barre (réels, cadeaux,
 * publier) n'avaient pas d'équivalent vers l'espace Publicités, alors que la page de profil en
 * proposait déjà un.
 */
test.describe('/property — raccourci vers l\'espace Publicités', () => {
  test('le bouton "Mes publicités" est présent et mène à /advertising', async ({ page, baseURL }) => {
    await signInAsAnnouncer(page.context(), baseURL ?? 'http://localhost:3001')
    await page.goto('/property', { waitUntil: 'domcontentloaded' })

    // Scopé au contenu principal : la navbar propose déjà ses propres liens "Mes réels" et
    // "Publicité" (home-page/Navbar.tsx), qui collisionneraient en strict mode.
    const main = page.getByRole('main')

    const shortcut = main.getByRole('link', { name: /Mes publicités/ })
    await expect(shortcut).toBeVisible({ timeout: 20000 })
    await expect(shortcut).toHaveAttribute('href', '/advertising')

    // Les raccourcis voisins restent en place (pas de régression de la barre d'actions).
    await expect(main.getByRole('link', { name: /Mes réels/ })).toBeVisible()
    await expect(main.getByRole('link', { name: /Mes cadeaux/ })).toBeVisible()
    await expect(main.getByRole('link', { name: /Publier une annonce/ }).first()).toBeVisible()

    await shortcut.click()
    await expect(page).toHaveURL(/\/advertising$/, { timeout: 20000 })
  })
})
