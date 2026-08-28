import { expect, test } from '@playwright/test'

import { deleteAccountByEmail } from './helpers/firebase-admin'

/**
 * Signup "classique" email + mot de passe — vrai Firebase Auth client SDK
 * (createUserWithEmailAndPassword), pas de mock, pas d'OAuth externe, pas de
 * reCAPTCHA. Email/téléphone uniques par run pour ne jamais collisionner
 * avec un run précédent, nettoyés après coup.
 */
const runId = Date.now()
const TEST_EMAIL = `e2e-signup-${runId}@example.com`
const TEST_PHONE_LOCAL_DIGITS = `67${String(runId).slice(-6)}`
const TEST_PASSWORD = 'TestE2e12345'

test.describe('Signup email/mot de passe — flux réel, sans mock', () => {
  test.afterAll(async () => {
    await deleteAccountByEmail(TEST_EMAIL)
  })

  test('un compte utilisateur classique se crée de bout en bout', async ({ page }) => {
    await page.goto('/signup')

    // Étape 1 — Identité
    await expect(page.getByRole('heading', { name: 'Qui êtes-vous ?' })).toBeVisible()
    await page.getByRole('button', { name: /Utilisateur/ }).click()
    await page.getByLabel('Prénom', { exact: true }).fill('Test')
    await page.getByLabel('Nom', { exact: true }).fill('E2E Signup')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()

    // Étape 2 — Contact
    await expect(page.getByRole('heading', { name: 'Comment vous joindre ?' })).toBeVisible()
    await page.getByLabel('Adresse email', { exact: true }).fill(TEST_EMAIL)
    await page
      .getByLabel('Numéro de téléphone national')
      .first()
      .fill(TEST_PHONE_LOCAL_DIGITS)
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()

    // Étape 3 — Date de naissance
    await expect(page.getByRole('heading', { name: 'Votre date de naissance' })).toBeVisible()
    await page.getByRole('combobox', { name: 'Jour de naissance' }).click()
    await page.getByRole('option', { name: '15', exact: true }).click()
    await page.getByRole('combobox', { name: 'Mois de naissance' }).click()
    await page.getByRole('option', { name: 'Juin', exact: true }).click()
    await page.getByRole('combobox', { name: 'Année de naissance' }).click()
    await page.getByRole('option', { name: '1990', exact: true }).click()
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()

    // Étape 4 — Sécurité
    await expect(page.getByRole('heading', { name: 'Sécurisez votre compte' })).toBeVisible()
    await page.getByLabel('Mot de passe', { exact: true }).fill(TEST_PASSWORD)
    await page.getByLabel('Confirmez le mot de passe', { exact: true }).fill(TEST_PASSWORD)

    const checkboxes = page.getByRole('checkbox')
    await expect(checkboxes).toHaveCount(1, { timeout: 5000 })
    await checkboxes.first().check()
    await expect(checkboxes.first()).toBeChecked()

    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    // Preuve d'un vrai createUserWithEmailAndPassword() abouti : redirection
    // vers la page de succès avec le uid Firebase réel généré côté client.
    await expect(page).toHaveURL(/\/signup\/success\?uid=/, { timeout: 15000 })
  })
})
