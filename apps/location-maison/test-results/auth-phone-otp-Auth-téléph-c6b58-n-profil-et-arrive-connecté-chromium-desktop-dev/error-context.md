# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-phone-otp.spec.ts >> Auth téléphone (OTP) — parcours complet réel, sans mock >> un numéro de test Firebase signup, complète son profil et arrive connecté
- Location: __tests__/e2e/auth-phone-otp.spec.ts:29:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Vérification du code' })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('heading', { name: 'Vérification du code' })

```

```yaml
- dialog "Numéro de téléphone":
  - heading "Numéro de téléphone" [level=2]
  - text: Indicatif
  - combobox "Indicatif téléphonique" [disabled]: "+241"
  - text: Numéro
  - textbox "Numéro de téléphone national" [disabled]:
    - /placeholder: 06 12 34 56 78
    - text: "66000000"
  - button "Envoi du code…" [disabled]
  - button "Close":
    - img
    - text: Close
- iframe
```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | import { AUTH_COOKIE_NAME } from './helpers/auth'
  4  | import { deleteAccountByPhoneNumber } from './helpers/firebase-admin'
  5  | 
  6  | /**
  7  |  * Numéro de test Firebase (Authentication > Sign-in method > Phone >
  8  |  * "Phone numbers for testing"), enregistré uniquement sur le projet
  9  |  * location-maison-dev. Firebase court-circuite le reCAPTCHA et l'envoi
  10 |  * du vrai SMS pour ce numéro et accepte directement le code fixé ici —
  11 |  * ce test exerce donc le vrai SDK Firebase Phone Auth, sans mock.
  12 |  */
  13 | const TEST_PHONE_LOCAL_DIGITS = '66000000'
  14 | const TEST_PHONE_E164 = '+24166000000'
  15 | const TEST_OTP_CODE = '123456'
  16 | 
  17 | test.describe('Auth téléphone (OTP) — parcours complet réel, sans mock', () => {
  18 |   test.beforeAll(async () => {
  19 |     // Firebase réutilise le même uid pour ce numéro de test d'un run à l'autre :
  20 |     // sans ce nettoyage, seul le tout premier run exercerait vraiment le chemin
  21 |     // "nouveau compte → /complete-profile".
  22 |     await deleteAccountByPhoneNumber(TEST_PHONE_E164)
  23 |   })
  24 | 
  25 |   test.afterAll(async () => {
  26 |     await deleteAccountByPhoneNumber(TEST_PHONE_E164)
  27 |   })
  28 | 
  29 |   test('un numéro de test Firebase signup, complète son profil et arrive connecté', async ({
  30 |     page,
  31 |     context,
  32 |   }) => {
  33 |     await page.goto('/signin')
  34 |     await page
  35 |       .getByRole('button', { name: 'Continuer avec Numéro de téléphone' })
  36 |       .click()
  37 | 
  38 |     await page
  39 |       .getByLabel('Numéro de téléphone national')
  40 |       .fill(TEST_PHONE_LOCAL_DIGITS)
  41 |     await page.getByRole('button', { name: 'Recevoir le code' }).click()
  42 | 
  43 |     // Preuve d'un vrai aller-retour réseau avec Firebase : le SDK a accepté
  44 |     // le numéro et est passé à l'étape code (pas de mock signInWithPhoneNumber ici).
  45 |     await expect(
  46 |       page.getByRole('heading', { name: 'Vérification du code' }),
> 47 |     ).toBeVisible({ timeout: 15000 })
     |       ^ Error: expect(locator).toBeVisible() failed
  48 |     await expect(page.getByText(`Code envoyé au ${TEST_PHONE_E164}`)).toBeVisible()
  49 | 
  50 |     await page.locator('input[inputmode="numeric"]').fill(TEST_OTP_CODE)
  51 |     await page.getByRole('button', { name: 'Vérifier et continuer' }).click()
  52 | 
  53 |     // Compte flambant neuf → le middleware redirige vers la complétion de profil,
  54 |     // une fois que confirm()/signIn('phone') (async) ont vraiment abouti.
  55 |     await expect(page).toHaveURL(/\/complete-profile/, { timeout: 15000 })
  56 |     await expect(
  57 |       page.getByRole('heading', { name: 'Compléter le profil' }),
  58 |     ).toBeVisible()
  59 | 
  60 |     // Le code de test est accepté par Firebase, l'ID token est échangé contre
  61 |     // une vraie session NextAuth.
  62 |     const cookies = await context.cookies()
  63 |     expect(cookies.some((c) => c.name === AUTH_COOKIE_NAME)).toBe(true)
  64 | 
  65 |     await page.getByLabel('Prénom', { exact: true }).fill('Test')
  66 |     await page.getByLabel('Nom', { exact: true }).fill('E2E')
  67 | 
  68 |     await page.getByRole('combobox', { name: 'Jour de naissance' }).click()
  69 |     await page.getByRole('option', { name: '15', exact: true }).click()
  70 |     await page.getByRole('combobox', { name: 'Mois de naissance' }).click()
  71 |     await page.getByRole('option', { name: 'Juin', exact: true }).click()
  72 |     await page.getByRole('combobox', { name: 'Année de naissance' }).click()
  73 |     await page.getByRole('option', { name: '1990', exact: true }).click()
  74 | 
  75 |     // Un signup téléphone est auto-attribué Annonceur (voir phone-auth.service.ts) :
  76 |     // la case "conditions annonceur" existe en plus de la politique de confidentialité.
  77 |     // `accountType` démarre à 'User' (default du formulaire) puis passe à 'Announcer'
  78 |     // un tick de rendu après le montage, une fois l'effet d'hydratation de session
  79 |     // appliqué — la 2e checkbox n'existe donc pas encore au tout premier rendu. On
  80 |     // attend qu'elle soit bien montée avant d'interagir (cf. BUGS-AUTH-E2E-2026-08.md).
  81 |     const checkboxes = page.getByRole('checkbox')
  82 |     await expect(checkboxes).toHaveCount(2, { timeout: 5000 })
  83 |     const checkboxCount = await checkboxes.count()
  84 |     for (let i = 0; i < checkboxCount; i += 1) {
  85 |       await checkboxes.nth(i).check()
  86 |       await expect(checkboxes.nth(i)).toBeChecked()
  87 |     }
  88 | 
  89 |     await page.getByRole('button', { name: 'Finaliser mon compte' }).click()
  90 | 
  91 |     await expect(page.getByText('Profil finalisé', { exact: true })).toBeVisible({ timeout: 15000 })
  92 |     await expect(page).not.toHaveURL(/\/complete-profile/, { timeout: 15000 })
  93 |   })
  94 | })
  95 | 
```