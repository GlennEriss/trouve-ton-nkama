import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, signInAsAnnouncer } from './helpers/auth'
import { deleteUserDoc, seedAnnouncerUser } from './helpers/firebase-admin'

/**
 * Contrairement à property-create-ai-contact.spec.ts (qui intercepte /api/ai/property-draft
 * avec une réponse scriptée pour tester déterministement la fusion des champs de contact), ce
 * fichier appelle le VRAI Gemini — demande explicite du client : un scripté ne prouve que notre
 * code de fusion, pas que le prompt (`getAutoFillPromptWithTypeDetection`, règle 24) obtient
 * réellement le comportement voulu de l'IA elle-même. Même principe que le scénario "Mode" de
 * property-and-mode-creation.spec.ts, seul autre endroit de la suite qui appelle Gemini pour de
 * vrai (voir son commentaire d'en-tête).
 *
 * Appelle directement la route serveur (pas de parcours UI complet — upload photo/localisation
 * ne sont pas nécessaires pour vérifier le comportement de l'IA elle-même) via `page.request`,
 * qui réutilise le cookie de session NextAuth forgé par signInAsAnnouncer.
 *
 * Non-déterminisme assumé : on normalise les numéros (chiffres seuls) avant comparaison plutôt
 * que d'exiger une égalité de chaîne stricte, au cas où Gemini reformate légèrement (espaces,
 * tirets). Le comportement structurel (quel champ contient quoi) est, lui, strict.
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-create-ai-gemini-real-${RUN_ID}`

function digitsOnly(value: string | undefined | null): string {
  return (value ?? '').replace(/\D/g, '')
}

test.describe('Création IA (/property/create) — comportement RÉEL de Gemini sur les numéros de contact', () => {
  test.beforeAll(async () => {
    await seedAnnouncerUser(OWNER_UID, 20, { phoneNumbers: ['+24166545430'] })
  })

  test.afterAll(async () => {
    await deleteUserDoc(OWNER_UID)
  })

  test('un seul numéro dans la description -> Gemini le met dans `contact` et laisse whatsappContact/callContact vides', async ({ page }) => {
    test.setTimeout(60_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })

    const response = await page.request.post('/api/ai/property-draft', {
      data: {
        description:
          'Studio meublé à louer à Akébé Poteau, une chambre, salon, cuisine équipée, sécurisé, ' +
          `proche des commerces. Loyer 120000 FCFA par mois. Contact : 077123456. Référence ${RUN_ID}.`,
      },
      timeout: 55_000,
    })

    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.success).toBe(true)

    expect(digitsOnly(body.data.contact)).toContain('77123456')
    // Coeur du bug corrigé : un seul numéro dans la description -> ces deux champs doivent rester
    // vides (l'IA ne doit ni les dupliquer ni y mettre autre chose), jamais un numéro différent.
    expect(body.data.whatsappContact ?? '').toBeFalsy()
    expect(body.data.callContact ?? '').toBeFalsy()
    expect(body.data.additionalContacts ?? []).toEqual([])
  })

  test('deux numéros avec rôles explicites (WhatsApp / Appel) -> Gemini les sépare correctement', async ({ page }) => {
    test.setTimeout(60_000)
    await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: OWNER_UID })

    const response = await page.request.post('/api/ai/property-draft', {
      data: {
        description:
          'Appartement 2 chambres à louer à Nzeng-Ayong, salon, cuisine, eau et électricité inclus. ' +
          `Loyer 200000 FCFA/mois. WhatsApp : 077111222. Appel : 066333444. Référence ${RUN_ID}.`,
      },
      timeout: 55_000,
    })

    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body.success).toBe(true)

    expect(digitsOnly(body.data.whatsappContact)).toContain('77111222')
    expect(digitsOnly(body.data.callContact)).toContain('66333444')
    // Aucun champ ne doit jamais contenir les deux numéros collés ensemble (règle 24, interdiction
    // explicite du prompt) — vérifie qu'aucun champ ne contient les DEUX numéros à la fois.
    for (const field of [body.data.contact, body.data.whatsappContact, body.data.callContact]) {
      const digits = digitsOnly(field)
      const hasBoth = digits.includes('77111222') && digits.includes('66333444')
      expect(hasBoth).toBe(false)
    }
  })
})
