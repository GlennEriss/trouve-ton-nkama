import crypto from 'node:crypto'

import { expect, test } from '@playwright/test'

import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
import { deleteNotifications, getNotification, seedNotification } from './helpers/firebase-admin'

/**
 * Couvre bout en bout la cloche de notifications (navbar) — demande explicite après une
 * régression réelle : NotificationButton ne répercutait plus les props injectées par
 * <PopoverTrigger asChild> (onClick, aria-expanded...), le clic ne faisait plus rien
 * (NotificationComponents.tsx). Aucun test n'existait pour cette zone avant ce fichier — d'où
 * la régression passée inaperçue. Vrai lecture Firestore (onSnapshot filtré createdFor == uid,
 * voir NotificationProvider.tsx) : nécessite le vrai pont Firebase (mockFirebaseToken: false),
 * pas de mock de la lecture elle-même.
 *
 * RUN_ID unique par worker (fullyParallel peut répartir les tests sur des workers séparés).
 */
const RUN_ID = crypto.randomUUID()
const OWNER_UID = `e2e-notifications-bell-${RUN_ID}`
const NOTIF_ID = `e2e-notif-${RUN_ID}`
const NOTIF_TITLE = 'Notification de test e2e'
const NOTIF_MESSAGE = 'Cliquez pour vérifier le lien de cette notification.'
const NOTIF_ACTION_URL = '/suivez-nous'

test.describe('Cloche de notifications (navbar)', () => {
  test.afterEach(async () => {
    await deleteNotifications([NOTIF_ID])
  })

  test('ouvre le panneau au clic sur la cloche et affiche une notification sans lien', async ({ page, baseURL }) => {
    await signInAsAnnouncer(page.context(), baseURL ?? 'http://localhost:3001', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await seedNotification({
      id: NOTIF_ID,
      createdFor: OWNER_UID,
      title: NOTIF_TITLE,
      message: NOTIF_MESSAGE,
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bell = page.getByRole('button', { name: 'Ouvrir les notifications' })
    await expect(bell).toBeVisible({ timeout: 20000 })

    // Régression réelle : le clic ne faisait plus rien (props Radix perdues). Preuve directe
    // via data-state, pas seulement "le contenu apparaît" (pourrait masquer un faux positif si
    // le panneau était par erreur toujours monté/visible).
    await expect(bell).toHaveAttribute('data-state', 'closed')
    await bell.click()
    await expect(bell).toHaveAttribute('data-state', 'open')

    await expect(page.getByText('Notifications', { exact: true })).toBeVisible()
    await expect(page.getByText(NOTIF_TITLE)).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(NOTIF_MESSAGE)).toBeVisible()
  })

  test('cliquer une notification avec actionUrl redirige vers ce lien et la marque comme lue', async ({
    page,
    baseURL,
  }) => {
    await signInAsAnnouncer(page.context(), baseURL ?? 'http://localhost:3001', { ...E2E_ANNOUNCER, uid: OWNER_UID })
    await mockCommonAppNoise(page, { mockFirebaseToken: false })
    await seedNotification({
      id: NOTIF_ID,
      createdFor: OWNER_UID,
      title: NOTIF_TITLE,
      message: NOTIF_MESSAGE,
      actionUrl: NOTIF_ACTION_URL,
    })

    await page.goto('/', { waitUntil: 'domcontentloaded' })

    await page.getByRole('button', { name: 'Ouvrir les notifications' }).click()
    await expect(page.getByText(NOTIF_MESSAGE)).toBeVisible({ timeout: 20000 })

    await page.getByRole('link', { name: NOTIF_MESSAGE }).click()

    // Pas juste "un lien avec le bon href existe" : la vraie navigation aboutit bien sur la
    // page liée (preuve que actionUrl est un vrai chemin de l'app, pas une valeur de test qui
    // 404 silencieusement).
    await expect(page).toHaveURL(new RegExp(`${NOTIF_ACTION_URL.replace('/', '\\/')}$`), { timeout: 20000 })
    await expect(page.getByRole('heading', { name: /Donnez de la force/ })).toBeVisible()

    // Le clic appelle markAsRead (NotificationContent.tsx) : vérifie la vraie persistance
    // Firestore, pas seulement l'état React local disparu de l'écran après navigation.
    await expect
      .poll(async () => (await getNotification(NOTIF_ID))?.isRead, { timeout: 20000 })
      .toBe(true)
  })
})
