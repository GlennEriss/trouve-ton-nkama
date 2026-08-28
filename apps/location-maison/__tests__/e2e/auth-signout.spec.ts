import { expect, test } from '@playwright/test'

import { AUTH_COOKIE_NAME, signInAsAnnouncer } from './helpers/auth'

/**
 * Reproduit le bug signalé : un utilisateur cliquait sur "Se déconnecter"
 * (parfois plusieurs fois de suite) et rien ne se passait — signOut() de
 * next-auth/react rechargeait la même page au lieu de rediriger (voir
 * useSignOut.ts). Ces tests prouvent, dans un vrai navigateur, qu'UN SEUL
 * clic suffit désormais à fermer la session — sur les deux implémentations
 * qui portaient la même logique dupliquée (navbar desktop + page /profil
 * mobile).
 */

test.describe('Déconnexion — flux réel, sans mock', () => {
  test('un seul clic sur "Se déconnecter" (menu navbar desktop) déconnecte réellement', async ({
    page,
    context,
  }) => {
    await signInAsAnnouncer(context)
    await page.goto('/')

    await page.getByRole('button', { name: 'Ouvrir le menu du profil' }).click()
    await page.getByRole('button', { name: 'Se déconnecter' }).click()

    await expect(page).not.toHaveURL(/\/profil|\/my-balance/, { timeout: 5000 })
    await expect
      .poll(
        async () => {
          const cookies = await context.cookies()
          return cookies.some((c) => c.name === AUTH_COOKIE_NAME)
        },
        { timeout: 5000 },
      )
      .toBe(false)
  })

  test('un seul clic sur "Se déconnecter" (page /profil mobile) déconnecte réellement', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signInAsAnnouncer(context)
    await page.goto('/profil')

    await page.getByRole('button', { name: 'Se déconnecter' }).click()

    await expect(page).not.toHaveURL(/\/profil/, { timeout: 5000 })
    await expect
      .poll(
        async () => {
          const cookies = await context.cookies()
          return cookies.some((c) => c.name === AUTH_COOKIE_NAME)
        },
        { timeout: 5000 },
      )
      .toBe(false)
  })
})
