import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import { deleteProperties, seedProperties, type SeedProperty } from './helpers/firebase-admin'

/**
 * Suppression d'une annonce sur /property. `deleteProperty()` (src/db/property.db.ts)
 * passait par le SDK Firestore CLIENT (deleteDoc), qui exige une vraie session Firebase
 * Auth côté NAVIGATEUR (firestore.rules : `allow delete: if isAnnouncer() && ...`) — pas
 * seulement une session NextAuth. Or ni Google (credential échangé côté serveur) ni la
 * connexion email/mot de passe (Credentials provider de NextAuth, dont `authorize()`
 * s'exécute lui aussi côté serveur) ne laissent jamais le navigateur avec une vraie session
 * Firebase Auth cliente — `signInAsAnnouncer` (cookie NextAuth forgé) reproduit exactement
 * cette session "normale" de la quasi-totalité des utilisateurs réels.
 *
 * BUG TROUVÉ ET CORRIGÉ (2026-08-29) : avec cette session normale, le bouton "Supprimer"
 * restait bloqué 30 à 60 secondes avant d'afficher "Impossible de supprimer l'annonce.",
 * sans jamais supprimer l'annonce. Corrigé en passant par une route serveur Admin SDK
 * (/api/property/[id], DELETE) — voir BUGS-PROPERTY-E2E-2026-08.md. Ce test vérifie le
 * comportement correct désormais attendu : suppression rapide et réelle.
 */
// RUN_ID/OWNER_UID uniques par worker (crypto.randomUUID(), pas de littéral statique) : même
// raison que property-edit.spec.ts/property-archive.spec.ts — un id statique réutilisé par un
// run précédent (si son afterAll n'a pas pu s'exécuter, ex. crash) polluerait ce run-ci.
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-property-delete-owner-${RUN_ID}`
const PROPERTY: SeedProperty = {
  id: `e2e-prop-delete-${RUN_ID}`,
  title: 'Annonce test suppression E2E',
  description: 'Annonce de test pour la suppression.',
  typeProperty: 'Studio',
  status: 'FOR_RENT',
  state: 'IN_PROGRESS',
  moderationStatus: 'APPROVED',
  price: 100000,
  area: 30,
  province: 'Estuaire',
  city: 'Libreville',
  street: 'Rue de test',
}

test.describe('Suppression d\'une annonce /property — vrai Firestore', () => {
  test.afterAll(async () => {
    // Filet de sécurité si le test échoue avant la suppression réelle.
    await deleteProperties([PROPERTY.id])
  })

  test('avec une session normale (sans Firebase Auth client), la suppression aboutit rapidement', async ({
    page,
  }) => {
    await seedProperties(OWNER_UID, [PROPERTY])
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', {
      ...E2E_ANNOUNCER,
      uid: OWNER_UID,
    })
    await page.goto('/property', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Gestion des annonces' })).toBeVisible()
    await expect(page.getByText(PROPERTY.title)).toBeVisible()

    const card = page
      .locator('h3', { hasText: PROPERTY.title })
      .locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]')
    await card.getByRole('button', { name: 'Supprimer' }).click()

    await expect(page.getByRole('heading', { name: 'Supprimer cette annonce ?' })).toBeVisible()
    await page.getByRole('button', { name: 'Supprimer' }).last().click()

    // Doit aboutir en quelques secondes, pas en 30-60s (régression du bug corrigé) : toast
    // de succès, disparition de la carte, plus aucune trace dans la liste.
    await expect(page.getByText('Annonce supprimée', { exact: true })).toBeVisible({ timeout: 8000 })
    await expect(page.getByText(PROPERTY.title)).not.toBeVisible({ timeout: 5000 })

    // Preuve définitive côté données : le document n'existe plus réellement dans Firestore.
    const stillExists = await page.evaluate(async (propertyId) => {
      const res = await fetch('/api/announcer/ads?scope=immobilier', { credentials: 'include' })
      const data = await res.json()
      return (data.items ?? []).some((item: { id: string }) => item.id === propertyId)
    }, PROPERTY.id)
    expect(stillExists).toBe(false)
  })
})
