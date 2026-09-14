# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: zzz-bench-point4.spec.ts >> BENCH point 4 — concurrence 3 vs illimitee (reseau throttle) >> mesure la phase image_upload (6 images) sous throttle reseau
- Location: __tests__/e2e/zzz-bench-point4.spec.ts:33:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Propriété ajoutée avec succès!').first()
Expected: visible
Timeout: 220000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 220000ms
  - waiting for getByText('Propriété ajoutée avec succès!').first()

```

```yaml
- banner:
  - link "Accueil - Trouve Ton Nkama":
    - /url: /
    - img
    - text: Trouve Ton Nkama
  - button "Ouvrir les notifications": "1"
  - button "Ouvrir le menu du profil":
    - text: G
    - img
  - link "Poster une annonce":
    - /url: /publish
    - img
    - text: Poster une annonce
  - navigation "Main":
    - list:
      - listitem:
        - link "Mes annonces":
          - /url: /property
        - link "Catalogue":
          - /url: /search
        - link "Demandes":
          - /url: /demandes-recherche
        - link "Réels":
          - /url: /reels
        - link "Mes réels":
          - /url: /reels/mine
        - link "Publicité":
          - /url: /advertising
- navigation "breadcrumb":
  - list:
    - listitem:
      - link "Accueil":
        - /url: /
    - listitem:
      - link "Propriétés":
        - /url: /property
    - listitem:
      - link "Ajouter":
        - /url: /property/add
    - listitem:
      - link "Studio":
        - /url: /property/add/studio
- main:
  - heading "Ajout d'un studio" [level=1]
  - 'button "Aller à l''étape 1: First"':
    - img
  - 'button "Aller à l''étape 2: Second"':
    - img
  - 'button "Aller à l''étape 3: Third" [disabled]': "3"
  - text: Localisation du bien
  - img
  - text: Localisation du bien
  - paragraph: Renseignez la province, la ville et le quartier du bien.
  - text: Province *
  - combobox "Province *": Estuaire
  - text: Ville *
  - img
  - combobox "Ville *": Libreville
  - img
  - text: Quartier *
  - img
  - combobox "Quartier *": Glass
  - img
  - paragraph: Recherchez votre quartier et visualisez la localisation sur la carte
  - text: Informations complémentaires
  - textbox
  - paragraph: "Ex: Terminus Awoungou en face de..."
  - text: Numéro de téléphone Indicatif
  - combobox "Indicatif téléphonique": "+241"
  - text: Numéro
  - textbox "Numéro de téléphone national":
    - /placeholder: 077 12 34 56
    - text: "66545430"
  - paragraph: "Ex: +241 06 97 00 00 00"
  - text: Numéro WhatsApp (si différent) Indicatif
  - combobox "Indicatif téléphonique": "+241"
  - text: Numéro
  - textbox "Numéro de téléphone national":
    - /placeholder: 077 12 34 56
    - text: "66545430"
  - paragraph: Laissez vide pour utiliser le numéro principal ci-dessus.
  - text: Numéro d'appel (si différent) Indicatif
  - combobox "Indicatif téléphonique": "+241"
  - text: Numéro
  - textbox "Numéro de téléphone national":
    - /placeholder: 077 12 34 56
    - text: "66545430"
  - paragraph: Laissez vide pour utiliser le numéro principal ci-dessus.
  - text: Autres numéros à contacter
  - button "Ajouter un numéro":
    - img
    - text: Ajouter un numéro
  - paragraph: Propriétaire, agent, famille... chaque numéro aura ses propres boutons WhatsApp/Appel (5 maximum).
  - button "Ouvrir l'assistant de création d'annonce"
  - button "Réinitialiser":
    - img
    - text: Réinitialiser
  - button "Précédent"
  - button "Enregistrer"
- region "Notifications (F8)":
  - list
- alert
```

# Test source

```ts
  1   | import crypto from 'node:crypto'
  2   | 
  3   | import { expect, test } from '@playwright/test'
  4   | 
  5   | import { E2E_ANNOUNCER, E2E_BASE_URL, mockCommonAppNoise, signInAsAnnouncer } from './helpers/auth'
  6   | import { deleteProperties, deleteUserDoc, findPropertiesByOwner, seedAnnouncerUser } from './helpers/firebase-admin'
  7   | 
  8   | /**
  9   |  * THROWAWAY — mesure ponctuelle du point 4 (concurrence bornée des uploads d'images) sous
  10  |  * réseau throttlé, demandée explicitement par l'utilisateur. Fichier supprimé après usage,
  11  |  * jamais destiné à rester dans le dépôt.
  12  |  */
  13  | const BENCH_PHOTO_PATH =
  14  |   '/private/tmp/claude-501/-Users-glenneriss-Documents-projets/648f97c9-854e-44f3-9ace-ee5fa843652c/scratchpad/bench-photo.jpg'
  15  | const IMAGE_COUNT = 6
  16  | const RUN_ID = crypto.randomUUID()
  17  | const OWNER_UID = `e2e-perf-bench4-${RUN_ID}`
  18  | const PROPERTY_TITLE = `Bench perf point4 ${RUN_ID}`
  19  | 
  20  | test.describe('BENCH point 4 — concurrence 3 vs illimitee (reseau throttle)', () => {
  21  |   test.describe.configure({ mode: 'serial' })
  22  |   let propertyId = ''
  23  | 
  24  |   test.beforeAll(async () => {
  25  |     await seedAnnouncerUser(OWNER_UID, 5, { phoneNumbers: ['+24166545430'] })
  26  |   })
  27  | 
  28  |   test.afterAll(async () => {
  29  |     if (propertyId) await deleteProperties([propertyId])
  30  |     await deleteUserDoc(OWNER_UID)
  31  |   })
  32  | 
  33  |   test('mesure la phase image_upload (6 images) sous throttle reseau', async ({ page, context }) => {
  34  |     test.setTimeout(240_000)
  35  | 
  36  |     const client = await context.newCDPSession(page)
  37  |     await client.send('Network.enable')
  38  | 
  39  |     const phaseLogs: Array<{ phase?: string; durationMs?: number }> = []
  40  |     page.on('console', (msg) => {
  41  |       const text = msg.text()
  42  |       if (!text.includes('"phase"') || !text.includes('Submission phase')) return
  43  |       try {
  44  |         const parsed = JSON.parse(text)
  45  |         if (parsed?.context?.phase) phaseLogs.push(parsed.context)
  46  |       } catch {
  47  |         // ligne non-JSON, ignorée
  48  |       }
  49  |     })
  50  | 
  51  |     await signInAsAnnouncer(page.context(), E2E_BASE_URL, { ...E2E_ANNOUNCER, uid: OWNER_UID })
  52  |     await mockCommonAppNoise(page, { mockFirebaseToken: false })
  53  |     await page.goto('/property/add/studio', { waitUntil: 'domcontentloaded' })
  54  | 
  55  |     await page.getByLabel('Ajouter des images du bien').setInputFiles(
  56  |       Array.from({ length: IMAGE_COUNT }, () => BENCH_PHOTO_PATH),
  57  |     )
  58  |     await expect(page.getByText(`${IMAGE_COUNT}/10 images`)).toBeVisible({ timeout: 90000 })
  59  |     await page.getByLabel("Titre de l'annonce").fill(PROPERTY_TITLE)
  60  |     await page.getByLabel("Description de l'annonce").fill(
  61  |       `Description suffisamment longue pour le bench perf point 4 ${RUN_ID}.`,
  62  |     )
  63  |     await page.getByLabel('Superficie du bien en mètres carrés').fill('28')
  64  |     await page.getByLabel('Prix du bien en FCFA').fill('120000')
  65  |     await page.getByText('Propriétaire direct', { exact: true }).click()
  66  |     await page.getByRole('button', { name: /^Sélectionner le tag/ }).first().click()
  67  |     await page.getByRole('button', { name: /^Suivant$/i }).click()
  68  | 
  69  |     await expect(page.getByText('Numéro du studio', { exact: true })).toBeVisible()
  70  |     await page.getByRole('button', { name: /^Suivant$/i }).click()
  71  | 
  72  |     await expect(page.getByText('Localisation du bien').first()).toBeVisible({ timeout: 15000 })
  73  |     await page.locator('#property-province').click()
  74  |     await page.getByRole('option', { name: 'Estuaire' }).click()
  75  |     await page.locator('#property-city').fill('Libreville')
  76  |     await page.locator('#property-city-suggestions').getByRole('option').first().click({ timeout: 15000 })
  77  |     await page.locator('#property-district').fill('Glass')
  78  |     await page.locator('#property-district-suggestions').getByRole('option').first().click({ timeout: 15000 })
  79  | 
  80  |     await client.send('Network.emulateNetworkConditions', {
  81  |       offline: false,
  82  |       downloadThroughput: (750 * 1024) / 8,
  83  |       uploadThroughput: (128 * 1024) / 8,
  84  |       latency: 150,
  85  |     })
  86  | 
  87  |     await page.getByRole('button', { name: /^Enregistrer$/i }).click()
> 88  |     await expect(page.getByText('Propriété ajoutée avec succès!').first()).toBeVisible({ timeout: 220000 })
      |                                                                            ^ Error: expect(locator).toBeVisible() failed
  89  | 
  90  |     const created = (await findPropertiesByOwner(OWNER_UID))[0]
  91  |     propertyId = created?.id ?? ''
  92  | 
  93  |     const uploadPhase = phaseLogs.find((record) => record.phase === 'image_upload')
  94  |     // eslint-disable-next-line no-console
  95  |     console.log(`BENCH_RESULT image_upload durationMs=${uploadPhase?.durationMs ?? 'NOT_FOUND'}`)
  96  |     // eslint-disable-next-line no-console
  97  |     console.log('BENCH_ALL_PHASES=' + JSON.stringify(phaseLogs))
  98  |   })
  99  | })
  100 | 
```