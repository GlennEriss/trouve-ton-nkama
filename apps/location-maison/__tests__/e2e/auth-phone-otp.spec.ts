import { expect, test } from '@playwright/test'

import { AUTH_COOKIE_NAME } from './helpers/auth'
import { deleteAccountByPhoneNumber } from './helpers/firebase-admin'

/**
 * Numéro de test Firebase (Authentication > Sign-in method > Phone >
 * "Phone numbers for testing"), enregistré uniquement sur le projet
 * location-maison-dev. Firebase court-circuite le reCAPTCHA et l'envoi
 * du vrai SMS pour ce numéro et accepte directement le code fixé ici —
 * ce test exerce donc le vrai SDK Firebase Phone Auth, sans mock.
 */
const TEST_PHONE_LOCAL_DIGITS = '66000000'
const TEST_PHONE_E164 = '+24166000000'
const TEST_OTP_CODE = '123456'

test.describe('Auth téléphone (OTP) — parcours complet réel, sans mock', () => {
  test.beforeAll(async () => {
    // Firebase réutilise le même uid pour ce numéro de test d'un run à l'autre :
    // sans ce nettoyage, seul le tout premier run exercerait vraiment le chemin
    // "nouveau compte → /complete-profile".
    await deleteAccountByPhoneNumber(TEST_PHONE_E164)
  })

  test.afterAll(async () => {
    await deleteAccountByPhoneNumber(TEST_PHONE_E164)
  })

  test('un numéro de test Firebase signup, complète son profil et arrive connecté', async ({
    page,
    context,
  }) => {
    await page.goto('/signin')
    await page
      .getByRole('button', { name: 'Continuer avec Numéro de téléphone' })
      .click()

    await page
      .getByLabel('Numéro de téléphone national')
      .fill(TEST_PHONE_LOCAL_DIGITS)
    await page.getByRole('button', { name: 'Recevoir le code' }).click()

    // Preuve d'un vrai aller-retour réseau avec Firebase : le SDK a accepté
    // le numéro et est passé à l'étape code (pas de mock signInWithPhoneNumber ici).
    await expect(
      page.getByRole('heading', { name: 'Vérification du code' }),
    ).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(`Code envoyé au ${TEST_PHONE_E164}`)).toBeVisible()

    await page.locator('input[inputmode="numeric"]').fill(TEST_OTP_CODE)
    await page.getByRole('button', { name: 'Vérifier et continuer' }).click()

    // Compte flambant neuf → le middleware redirige vers la complétion de profil,
    // une fois que confirm()/signIn('phone') (async) ont vraiment abouti.
    await expect(page).toHaveURL(/\/complete-profile/, { timeout: 15000 })
    await expect(
      page.getByRole('heading', { name: 'Compléter le profil' }),
    ).toBeVisible()

    // Le code de test est accepté par Firebase, l'ID token est échangé contre
    // une vraie session NextAuth.
    const cookies = await context.cookies()
    expect(cookies.some((c) => c.name === AUTH_COOKIE_NAME)).toBe(true)

    await page.getByLabel('Prénom', { exact: true }).fill('Test')
    await page.getByLabel('Nom', { exact: true }).fill('E2E')

    await page.getByRole('combobox', { name: 'Jour de naissance' }).click()
    await page.getByRole('option', { name: '15', exact: true }).click()
    await page.getByRole('combobox', { name: 'Mois de naissance' }).click()
    await page.getByRole('option', { name: 'Juin', exact: true }).click()
    await page.getByRole('combobox', { name: 'Année de naissance' }).click()
    await page.getByRole('option', { name: '1990', exact: true }).click()

    // Un signup téléphone est auto-attribué Annonceur (voir phone-auth.service.ts) :
    // la case "conditions annonceur" existe en plus de la politique de confidentialité.
    // `accountType` démarre à 'User' (default du formulaire) puis passe à 'Announcer'
    // un tick de rendu après le montage, une fois l'effet d'hydratation de session
    // appliqué — la 2e checkbox n'existe donc pas encore au tout premier rendu. On
    // attend qu'elle soit bien montée avant d'interagir (cf. BUGS-AUTH-E2E-2026-08.md).
    const checkboxes = page.getByRole('checkbox')
    await expect(checkboxes).toHaveCount(2, { timeout: 5000 })
    const checkboxCount = await checkboxes.count()
    for (let i = 0; i < checkboxCount; i += 1) {
      await checkboxes.nth(i).check()
      await expect(checkboxes.nth(i)).toBeChecked()
    }

    await page.getByRole('button', { name: 'Finaliser mon compte' }).click()

    await expect(page.getByText('Profil finalisé', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page).not.toHaveURL(/\/complete-profile/, { timeout: 15000 })
  })
})
