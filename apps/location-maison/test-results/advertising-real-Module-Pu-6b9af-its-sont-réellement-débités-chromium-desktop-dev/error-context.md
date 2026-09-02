# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: advertising-real.spec.ts >> Module Publicité (/advertising) — vraie création de campagne, Firestore + Storage réels >> parcours complet : paie en crédits, la campagne part réellement en ligne, les crédits sont réellement débités
- Location: __tests__/e2e/advertising-real.spec.ts:88:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/5\/5 emplacements prêts/i)
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for getByText(/5\/5 emplacements prêts/i)

```

```yaml
- navigation:
  - button "Ouvrir le menu":
    - img
  - link "Trouve Ton Nkama":
    - /url: /
    - img
    - text: Trouve Ton Nkama
  - button "Ouvrir les notifications"
  - button "Ouvrir le menu du profil": G
- main:
  - link "Publicités":
    - /url: /advertising
    - img
    - text: Publicités
  - img
  - heading "Créer une publicité" [level=1]
  - paragraph: Construisez la campagne étape par étape.
  - img
  - text: 169 crédits 1 crédit ≈ 250 FCFA à 400 FCFA selon le pack
  - list:
    - listitem:
      - img
      - text: Forfait
    - listitem: 2 Visuels
    - listitem: 3 Message
    - listitem: 4 Aperçu
  - heading "Ajouter les visuels" [level=2]
  - paragraph: Choisissez le format, puis touchez la zone pub pour importer le visuel.
  - paragraph: 0/5 emplacements prêts
  - text: 0%
  - tablist "Formats publicitaires":
    - tab "Bannière accueil 1200×400"
    - tab "Bannière in-feed (recherche / immobilier) 1200×375" [selected]
    - tab "Bannière détail annonce 1200×300"
    - tab "Réels (image ou vidéo) Format à vérifier"
  - heading "Bannière in-feed (recherche / immobilier)" [level=3]
  - paragraph: large ~16:5 · 1200×375
  - button "Sponsorisé Publicité En savoir plus Changer le visuel"
  - paragraph: Sponsorisé
  - img "Publicité"
  - text: En savoir plus
  - img
  - text: Changer le visuel Recherche Immobilier
  - complementary:
    - text: Visuel par défaut
    - paragraph: Couvre les emplacements sans visuel dédié.
    - button "Visuel par défaut Changer"
    - img
    - text: Changer
    - button "Retirer":
      - img
      - text: Retirer
    - img
    - paragraph: Format vertical recommandé pour Réels (1080×1920). Votre fichier 1200×630 sera affiché avec des bandes noires.
    - img
    - text: Progression visuelle Recherche Manquant Détail Manquant Accueil Manquant Immobilier Manquant Réels Manquant
    - paragraph: Ajoutez un visuel par défaut ou un visuel dédié pour chaque emplacement du forfait.
  - progressbar "Progression de la création de publicité"
  - button "Retour à l’étape précédente":
    - img
  - button "Continuer vers l’étape 3" [disabled]:
    - text: Continuer
    - img
- navigation "Navigation mobile":
  - link "Annonces":
    - /url: /property
    - img
    - text: Annonces
  - link "Recherche":
    - /url: /search
    - img
    - text: Recherche
  - link "Publier":
    - /url: /publish
    - img
    - text: Publier
  - link "Réels":
    - /url: /reels
    - img
    - text: Réels
  - link "Profil":
    - /url: /profil
    - img
    - text: Profil
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  1   | import crypto from 'node:crypto'
  2   | import path from 'node:path'
  3   | 
  4   | import { expect, test } from '@playwright/test'
  5   | 
  6   | import { E2E_ANNOUNCER, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
  7   | import {
  8   |   deleteAdCampaigns,
  9   |   findAdCampaignByOwner,
  10  |   getUserCredits,
  11  |   seedAnnouncerUser,
  12  | } from './helpers/firebase-admin'
  13  | 
  14  | /**
  15  |  * Preuve de bout en bout, vraie écriture Firestore + Storage, pour le module Publicité
  16  |  * (self-serve, /advertising) — demande explicite de l'utilisateur avant d'en faire la
  17  |  * promotion publique : il veut la certitude que le parcours "un business paie en crédits
  18  |  * et sa pub part en ligne" fonctionne réellement, pas seulement que l'UI s'affiche.
  19  |  *
  20  |  * Contrairement aux réels/annonces (SDK client Firebase, session Firebase réelle requise), le
  21  |  * module Publicité authentifie uniquement via la session NextAuth (`auth()`, voir
  22  |  * /api/advertising/campaigns/route.ts et /api/advertising/upload/route.ts) — l'upload et la
  23  |  * création de campagne passent tous les deux par l'Admin SDK côté serveur, jamais par le SDK
  24  |  * client. Le cookie NextAuth forgé de signInAsAnnouncer() suffit donc seul ; pas besoin de
  25  |  * mockCommonAppNoise(page, { mockFirebaseToken: false }) ni du pont /api/generate-token.
  26  |  *
  27  |  * RUN_ID unique par worker (crypto.randomUUID()) : fullyParallel peut répartir les tests sur
  28  |  * des workers séparés (même raison que les autres specs de ce dossier).
  29  |  */
  30  | const RUN_ID = crypto.randomUUID()
  31  | const AD_IMAGE_PATH = path.join(process.cwd(), 'public', 'og-image.png')
  32  | // Même viewport que lot4-mobile-advertising.spec.ts (existant, mocké) : le bouton "suivant" du
  33  | // wizard n'a le libellé accessible "Continuer vers l'étape N" (aria-label) que sur son rendu
  34  | // mobile — le pied de page desktop est un `<Button>` texte "Suivant" séparé, sans cet
  35  | // aria-label (voir AdvertisingCreateWizard.tsx, les deux <footer> distincts).
  36  | const MOBILE_SIZE = { width: 390, height: 844 }
  37  | 
  38  | async function goToMessageStep(page: import('@playwright/test').Page) {
  39  |   await page.goto('/advertising/create', { waitUntil: 'domcontentloaded' })
  40  |   await expect(page.getByRole('heading', { name: /Créer une publicité/i })).toBeVisible()
  41  |   // Le forfait "Marque" (70 crédits, tous les emplacements) est présélectionné par défaut —
  42  |   // aucun clic de sélection nécessaire, seule sa présence confirme l'étape chargée.
  43  |   await expect(page.getByRole('button', { name: /Marque.*70 crédits.*17\s?500/i })).toBeVisible()
  44  | 
  45  |   await page.getByRole('button', { name: /Continuer vers l’étape 2/i }).click()
  46  |   await expect(page.getByRole('heading', { name: /Ajouter les visuels/i })).toBeVisible()
  47  | 
  48  |   // Upload réel : passe par POST /api/advertising/upload (Admin SDK), écrit vraiment dans
  49  |   // Firebase Storage — aucun mock de route ici, contrairement à lot4-mobile-advertising.spec.ts.
  50  |   await page.locator('#default-ad-image').setInputFiles(AD_IMAGE_PATH)
> 51  |   await expect(page.getByText(/5\/5 emplacements prêts/i)).toBeVisible({ timeout: 20_000 })
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  52  | 
  53  |   await page.getByRole('button', { name: /Continuer vers l’étape 3/i }).click()
  54  |   await expect(page.getByRole('heading', { name: /Préparer le message/i })).toBeVisible()
  55  | }
  56  | 
  57  | async function fillMessageAndPreview(page: import('@playwright/test').Page, headline: string) {
  58  |   await page.getByLabel(/Accroche/i).fill(headline)
  59  |   await page.getByLabel(/Description courte/i).fill('Visuel de test e2e réel, pas un mock.')
  60  |   await page.getByLabel(/Lien au clic/i).fill('wa.me/24166545430')
  61  |   await page.getByLabel(/Lien au clic/i).blur()
  62  | 
  63  |   await page.getByRole('button', { name: /Continuer vers l’étape 4/i }).click()
  64  |   await expect(page.getByRole('heading', { name: /Vérifier avant publication/i })).toBeVisible()
  65  | }
  66  | 
  67  | test.describe('Module Publicité (/advertising) — vraie création de campagne, Firestore + Storage réels', () => {
  68  |   test.describe.configure({ mode: 'serial' })
  69  |   test.use({ viewport: MOBILE_SIZE })
  70  | 
  71  |   const SOLVENT_UID = `e2e-ad-solvent-${RUN_ID}`
  72  |   const INSOLVENT_UID = `e2e-ad-insolvent-${RUN_ID}`
  73  |   let createdCampaignId = ''
  74  | 
  75  |   test.beforeAll(async () => {
  76  |     // "brand" coûte 70 crédits (src/constantes/ad-packages.ts) — 100 est confortablement
  77  |     // suffisant, 50 est volontairement insuffisant pour le second test.
  78  |     await seedAnnouncerUser(SOLVENT_UID, 100)
  79  |     await seedAnnouncerUser(INSOLVENT_UID, 50)
  80  |   })
  81  | 
  82  |   test.afterAll(async () => {
  83  |     if (createdCampaignId) {
  84  |       await deleteAdCampaigns([createdCampaignId])
  85  |     }
  86  |   })
  87  | 
  88  |   test('parcours complet : paie en crédits, la campagne part réellement en ligne, les crédits sont réellement débités', async ({
  89  |     page,
  90  |   }) => {
  91  |     test.setTimeout(90_000)
  92  |     await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: SOLVENT_UID })
  93  |     await mockCommonAppNoise(page)
  94  | 
  95  |     await goToMessageStep(page)
  96  |     await fillMessageAndPreview(page, 'Promo e2e réelle Akanda')
  97  | 
  98  |     await expect(page.getByText(/70 crédits/i).first()).toBeVisible()
  99  |     const publishButton = page.getByRole('button', { name: /Payer.*publier/i })
  100 |     await expect(publishButton).toBeEnabled()
  101 |     await publishButton.click()
  102 | 
  103 |     // Vraie redirection après un vrai 201 de POST /api/advertising/campaigns (pas un mock).
  104 |     await expect(page).toHaveURL(/\/advertising$/, { timeout: 30_000 })
  105 | 
  106 |     // Preuve définitive côté données : la campagne existe réellement en base, avec le bon
  107 |     // débit de crédits — pas juste l'apparence du toast/de la redirection côté UI. Le client
  108 |     // ne renvoie l'id de campagne que dans la réponse JSON de la mutation, jamais dans l'URL :
  109 |     // on ne peut le retrouver qu'en interrogeant par `createdBy`.
  110 |     await expect.poll(async () => (await findAdCampaignByOwner(SOLVENT_UID))?.id, { timeout: 15000 }).not.toBeUndefined()
  111 | 
  112 |     const found = await findAdCampaignByOwner(SOLVENT_UID)
  113 |     createdCampaignId = found!.id
  114 |     const campaign = found!.data as any
  115 | 
  116 |     expect(campaign.status).toBe('active')
  117 |     expect(campaign.billing?.mode).toBe('user_credits')
  118 |     expect(campaign.billing?.paymentStatus).toBe('paid')
  119 |     expect(campaign.billing?.creditsUsed).toBe(70)
  120 |     expect(campaign.creative?.ctaUrl).toBe('https://wa.me/24166545430')
  121 |     expect(campaign.creative?.headline).toBe('Promo e2e réelle Akanda')
  122 |     expect(campaign.placements).toEqual(
  123 |       expect.arrayContaining(['search_infeed', 'property_detail', 'home', 'immobilier_infeed', 'reels_infeed']),
  124 |     )
  125 | 
  126 |     // Le vrai compte de l'utilisateur a bien été débité (100 - 70 = 30), pas seulement le
  127 |     // `creditsRemaining` renvoyé dans la réponse JSON.
  128 |     await expect.poll(() => getUserCredits(SOLVENT_UID), { timeout: 15000 }).toBe(30)
  129 | 
  130 |     // Apparaît réellement sur le dashboard après la redirection, pas juste en base.
  131 |     await expect(page.getByRole('heading', { name: 'Promo e2e réelle Akanda' })).toBeVisible({ timeout: 15000 })
  132 |   })
  133 | 
  134 |   test('crédits insuffisants : la campagne n est pas créée et aucun crédit n est débité', async ({ page }) => {
  135 |     test.setTimeout(90_000)
  136 |     await signInAsAnnouncer(page.context(), 'http://localhost:3000', { ...E2E_ANNOUNCER, uid: INSOLVENT_UID })
  137 |     await mockCommonAppNoise(page)
  138 | 
  139 |     await goToMessageStep(page)
  140 |     await fillMessageAndPreview(page, 'Ne devrait jamais être publiée')
  141 | 
  142 |     const publishButton = page.getByRole('button', { name: /Payer.*publier/i })
  143 |     await publishButton.click()
  144 | 
  145 |     // Vrai 402 de POST /api/advertising/campaigns (50 < 70 crédits requis) — reste sur l'étape
  146 |     // de récapitulatif, affiche le toast d'erreur, n'est jamais redirigé vers /advertising.
  147 |     await expect(page.getByText(/Crédits insuffisants/i)).toBeVisible({ timeout: 15000 })
  148 |     await expect(page).toHaveURL(/\/advertising\/create$/)
  149 | 
  150 |     // Preuve définitive côté données : aucune campagne créée, crédits inchangés — le rejet
  151 |     // n'est pas qu'un message UI qui masquerait une écriture partielle en base.
```