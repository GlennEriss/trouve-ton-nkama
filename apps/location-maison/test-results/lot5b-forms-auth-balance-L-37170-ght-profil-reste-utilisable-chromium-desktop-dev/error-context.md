# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B desktop light >> profil reste utilisable
- Location: __tests__/e2e/lot5b-forms-auth-balance.spec.ts:135:13

# Error details

```
Error: Violations WCAG bloquantes: [
  {
    "id": "nested-interactive",
    "impact": "serious",
    "help": "Interactive controls must not be nested",
    "targets": [
      "button[aria-haspopup=\"dialog\"]"
    ],
    "elements": [
      "<button type=\"button\" aria-haspopup=\"dialog\" aria-expanded=\"false\" data-state=\"closed\">"
    ]
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 13

- Array []
+ Array [
+   Object {
+     "elements": Array [
+       "<button type=\"button\" aria-haspopup=\"dialog\" aria-expanded=\"false\" data-state=\"closed\">",
+     ],
+     "help": "Interactive controls must not be nested",
+     "id": "nested-interactive",
+     "impact": "serious",
+     "targets": Array [
+       "button[aria-haspopup=\"dialog\"]",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - banner [ref=e5]:
        - generic [ref=e6]:
          - link "Accueil - Trouve Ton Nkama" [ref=e7] [cursor=pointer]:
            - /url: /
            - img [ref=e8]
            - generic [ref=e18]: Trouve Ton Nkama
          - generic [ref=e19]:
            - generic [ref=e20]:
              - button "Ouvrir les notifications" [ref=e21] [cursor=pointer]:
                - button "Ouvrir les notifications" [ref=e22]:
                  - img
              - button "Ouvrir le menu du profil" [ref=e23] [cursor=pointer]:
                - generic [ref=e24]:
                  - generic [ref=e26]: G
                  - img
            - link "Poster une annonce" [ref=e27] [cursor=pointer]:
              - /url: /publish
              - img
              - text: Poster une annonce
        - navigation "Main" [ref=e30]:
          - list [ref=e32]:
            - listitem [ref=e33]:
              - link "Mes annonces" [ref=e34] [cursor=pointer]:
                - /url: /property
              - link "Catalogue" [ref=e35] [cursor=pointer]:
                - /url: /search
              - link "Demandes" [ref=e36] [cursor=pointer]:
                - /url: /demandes-recherche
              - link "Réels" [ref=e37] [cursor=pointer]:
                - /url: /reels
              - link "Mes réels" [ref=e38] [cursor=pointer]:
                - /url: /reels/mine
              - link "Publicité" [ref=e39] [cursor=pointer]:
                - /url: /advertising
      - generic [ref=e40]:
        - navigation "breadcrumb" [ref=e42]:
          - list [ref=e43]:
            - listitem [ref=e44]:
              - link "Accueil" [ref=e45] [cursor=pointer]:
                - /url: /
            - listitem [ref=e46]:
              - img [ref=e47]
            - listitem [ref=e49]:
              - link "Profil" [ref=e50] [cursor=pointer]:
                - /url: /profil
        - main [ref=e51]:
          - generic [ref=e53]:
            - heading "Mon profil" [level=1] [ref=e55]
            - link "G Glenn Eriss Eriss Modifier mes informations" [ref=e56] [cursor=pointer]:
              - /url: /profil/informations
              - generic [ref=e58]: G
              - generic [ref=e59]:
                - paragraph [ref=e60]:
                  - generic [ref=e61]: Glenn Eriss
                  - generic [ref=e62]: Eriss
                - generic [ref=e63]: Modifier mes informations
              - img [ref=e64]
            - generic [ref=e66]:
              - link "Favoris Retrouvez toutes les annonces que vous avez sauvegardées pour les consulter plus tard." [ref=e67] [cursor=pointer]:
                - /url: /favoris
                - generic [ref=e68]:
                  - img [ref=e69]
                  - heading "Favoris" [level=2] [ref=e71]
                - paragraph [ref=e72]: Retrouvez toutes les annonces que vous avez sauvegardées pour les consulter plus tard.
              - link "Faire de la pub Créez une publicité pour votre entreprise et payez en crédits. Diffusion immédiate sur la plateforme." [ref=e73] [cursor=pointer]:
                - /url: /advertising
                - generic [ref=e74]:
                  - img [ref=e75]
                  - heading "Faire de la pub" [level=2] [ref=e78]
                - paragraph [ref=e79]: Créez une publicité pour votre entreprise et payez en crédits. Diffusion immédiate sur la plateforme.
              - link "Mon solde Accédez aux pages dédiées pour consulter votre historique de crédits et gérer la recharge manuelle de votre compte." [ref=e80] [cursor=pointer]:
                - /url: /my-balance/history
                - generic [ref=e81]:
                  - img [ref=e82]
                  - heading "Mon solde" [level=2] [ref=e87]
                - paragraph [ref=e88]: Accédez aux pages dédiées pour consulter votre historique de crédits et gérer la recharge manuelle de votre compte.
              - link "Vérifier mon numéro de téléphone Vérifiez votre numéro de téléphone en recevant un code de confirmation par SMS pour sécuriser votre compte." [ref=e89] [cursor=pointer]:
                - /url: /verify-phone
                - generic [ref=e90]:
                  - img [ref=e91]
                  - heading "Vérifier mon numéro de téléphone" [level=2] [ref=e93]
                - paragraph [ref=e94]: Vérifiez votre numéro de téléphone en recevant un code de confirmation par SMS pour sécuriser votre compte.
              - link "Paramètre Personnalisez vos préférences de notification pour rester informé tout en évitant les distractions inutiles." [ref=e95] [cursor=pointer]:
                - /url: /settings
                - generic [ref=e96]:
                  - img [ref=e97]
                  - heading "Paramètre" [level=2] [ref=e100]
                - paragraph [ref=e101]: Personnalisez vos préférences de notification pour rester informé tout en évitant les distractions inutiles.
              - link "Connexion et sécurité Gérez vos informations de connexion, réinitialisez votre mot de passe et configurez les options de sécurité pour protéger votre compte." [ref=e102] [cursor=pointer]:
                - /url: /login-and-security
                - generic [ref=e103]:
                  - img [ref=e104]
                  - heading "Connexion et sécurité" [level=2] [ref=e107]
                - paragraph [ref=e108]: Gérez vos informations de connexion, réinitialisez votre mot de passe et configurez les options de sécurité pour protéger votre compte.
              - link "Politique de confidentialité Consultez comment vos données personnelles sont collectées, utilisées et protégées conformément à nos politiques." [ref=e109] [cursor=pointer]:
                - /url: /privacy-policy
                - generic [ref=e110]:
                  - img [ref=e111]
                  - heading "Politique de confidentialité" [level=2] [ref=e114]
                - paragraph [ref=e115]: Consultez comment vos données personnelles sont collectées, utilisées et protégées conformément à nos politiques.
              - link "Condition d'utilisations Prenez connaissance de nos règles et engagements qui encadrent l'utilisation de notre plateforme afin de garantir une expérience sécurisée et équitable pour tous." [ref=e116] [cursor=pointer]:
                - /url: /terms-of-use
                - generic [ref=e117]:
                  - img [ref=e118]
                  - heading "Condition d'utilisations" [level=2] [ref=e121]
                - paragraph [ref=e122]: Prenez connaissance de nos règles et engagements qui encadrent l'utilisation de notre plateforme afin de garantir une expérience sécurisée et équitable pour tous.
    - contentinfo [ref=e123]:
      - generic [ref=e124]:
        - generic [ref=e125]:
          - generic [ref=e126]:
            - img [ref=e127]
            - paragraph [ref=e137]: Trouve Ton Nkama simplifie la recherche, la location et la vente de biens immobiliers au Gabon.
          - navigation [ref=e138]:
            - heading "Liens utiles" [level=2] [ref=e139]
            - list [ref=e140]:
              - listitem [ref=e141]:
                - link "À propos" [ref=e142] [cursor=pointer]:
                  - /url: https://www.facebook.com/profile.php?id=61574099562451
              - listitem [ref=e143]:
                - link "Blog" [ref=e144] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=e145]:
                - link "Immobilier Gabon" [ref=e146] [cursor=pointer]:
                  - /url: /immobilier
              - listitem [ref=e147]:
                - link "Maisons à louer" [ref=e148] [cursor=pointer]:
                  - /url: /immobilier/location/maison
              - listitem [ref=e149]:
                - link "Maisons à vendre" [ref=e150] [cursor=pointer]:
                  - /url: /immobilier/vente/maison
              - listitem [ref=e151]:
                - link "Guide Immobilier" [ref=e152] [cursor=pointer]:
                  - /url: /guide-immobilier-gabon
              - listitem [ref=e153]:
                - link "Faire de la pub" [ref=e154] [cursor=pointer]:
                  - /url: /faire-de-la-pub
              - listitem [ref=e155]:
                - link "Demandes de recherche" [ref=e156] [cursor=pointer]:
                  - /url: /demandes-recherche
              - listitem [ref=e157]:
                - link "Politique de confidentialité" [ref=e158] [cursor=pointer]:
                  - /url: /privacy-policy
              - listitem [ref=e159]:
                - link "Conditions d'utilisation" [ref=e160] [cursor=pointer]:
                  - /url: /terms-of-use
              - listitem [ref=e161]:
                - link "Conditions annonceur" [ref=e162] [cursor=pointer]:
                  - /url: /announcer-terms
          - generic [ref=e163]:
            - heading "Contact" [level=2] [ref=e164]
            - generic [ref=e165]:
              - generic [ref=e166]:
                - img [ref=e167]
                - generic [ref=e170]: Libreville, Gabon
              - generic [ref=e171]:
                - img [ref=e172]
                - link "glenneriss@gmail.com" [ref=e175] [cursor=pointer]:
                  - /url: mailto:glenneriss@gmail.com
              - generic [ref=e176]:
                - img [ref=e177]
                - link "Suivez-nous sur Facebook" [ref=e179] [cursor=pointer]:
                  - /url: https://www.facebook.com/share/16beeh915e/
              - generic [ref=e180]:
                - img [ref=e181]
                - link "Contactez-nous sur WhatsApp" [ref=e183] [cursor=pointer]:
                  - /url: "#"
              - generic [ref=e184]:
                - img [ref=e185]
                - link "Rejoignez notre chaîne" [ref=e191] [cursor=pointer]:
                  - /url: https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z
              - generic [ref=e192]:
                - img [ref=e193]
                - link "Suivez-nous sur TikTok" [ref=e196] [cursor=pointer]:
                  - /url: https://www.tiktok.com/@tonnkama?is_from_webapp=1&sender_device=pc
        - separator [ref=e197]
        - generic [ref=e198]:
          - text: © 2026
          - link "Trouve Ton Nkama" [ref=e199] [cursor=pointer]:
            - /url: /
          - text: . Tous droits réservés.
    - region "Notifications (F8)":
      - list
  - alert [ref=e200]
```

# Test source

```ts
  1   | import AxeBuilder from '@axe-core/playwright'
  2   | import { expect, type Locator, type Page } from '@playwright/test'
  3   | 
  4   | export function formatViolations(
  5   |   violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
  6   | ) {
  7   |   return violations.map((violation) => ({
  8   |     id: violation.id,
  9   |     impact: violation.impact,
  10  |     help: violation.help,
  11  |     targets: violation.nodes.flatMap((node) => node.target.map(String)),
  12  |     elements: violation.nodes.map((node) => node.html),
  13  |   }))
  14  | }
  15  | 
  16  | export async function expectNoBlockingAccessibilityViolations(page: Page) {
  17  |   const accessibility = await new AxeBuilder({ page })
  18  |     .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  19  |     .analyze()
  20  |   const blockingViolations = accessibility.violations.filter(
  21  |     (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  22  |   )
  23  | 
  24  |   expect(
  25  |     formatViolations(blockingViolations),
  26  |     `Violations WCAG bloquantes: ${JSON.stringify(formatViolations(blockingViolations), null, 2)}`,
> 27  |   ).toEqual([])
      |     ^ Error: Violations WCAG bloquantes: [
  28  | }
  29  | 
  30  | export async function expectNoSmallTouchTargets(page: Page) {
  31  |   const failures = await page.evaluate(() => {
  32  |     const minimum = 44
  33  |     const candidates = Array.from(
  34  |       document.querySelectorAll<HTMLElement>(
  35  |         'main button:not([disabled]), main a[href], main input:not([type="hidden"]):not([type="file"]):not([disabled]), main textarea:not([disabled]), main select:not([disabled]):not([aria-hidden="true"]), main [role="button"], nav[aria-label="Navigation mobile"] a[href]',
  36  |       ),
  37  |     )
  38  | 
  39  |     return candidates.flatMap((element) => {
  40  |       const style = window.getComputedStyle(element)
  41  |       const rect = element.getBoundingClientRect()
  42  |       const isVisible =
  43  |         style.display !== 'none' &&
  44  |         style.visibility !== 'hidden' &&
  45  |         element.getAttribute('aria-hidden') !== 'true' &&
  46  |         Number(style.opacity) > 0 &&
  47  |         rect.width > 0 &&
  48  |         rect.height > 0
  49  | 
  50  |       if (!isVisible || (rect.width >= minimum && rect.height >= minimum)) return []
  51  | 
  52  |       return [{
  53  |         element: element.outerHTML.slice(0, 180),
  54  |         width: Math.round(rect.width),
  55  |         height: Math.round(rect.height),
  56  |       }]
  57  |     })
  58  |   })
  59  | 
  60  |   expect(failures, `Zones tactiles inférieures à 44px: ${JSON.stringify(failures, null, 2)}`).toEqual([])
  61  | }
  62  | 
  63  | export async function expectLastActionAboveBottomNavigation(page: Page) {
  64  |   const navigation = page.getByRole('navigation', { name: /Navigation mobile/i })
  65  |   if (await navigation.count() === 0 || !(await navigation.isVisible())) return
  66  | 
  67  |   await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  68  |   await page.waitForTimeout(150)
  69  | 
  70  |   const overlap = await page.evaluate(() => {
  71  |     const nav = document.querySelector<HTMLElement>('nav[aria-label="Navigation mobile"]')
  72  |     const main = document.querySelector('main')
  73  |     if (!nav || !main) return null
  74  | 
  75  |     const navTop = nav.getBoundingClientRect().top
  76  |     const actions = Array.from(
  77  |       main.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([type="hidden"]), textarea, select'),
  78  |     ).filter((element) => {
  79  |       const rect = element.getBoundingClientRect()
  80  |       const style = window.getComputedStyle(element)
  81  |       return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
  82  |     })
  83  | 
  84  |     const lastAction = actions.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]
  85  |     if (!lastAction) return null
  86  | 
  87  |     const rect = lastAction.getBoundingClientRect()
  88  |     return rect.bottom > navTop + 1
  89  |       ? { element: lastAction.outerHTML.slice(0, 180), actionBottom: Math.round(rect.bottom), navTop: Math.round(navTop) }
  90  |       : null
  91  |   })
  92  | 
  93  |   expect(overlap, `La dernière action est masquée par la navigation: ${JSON.stringify(overlap)}`).toBeNull()
  94  | }
  95  | 
  96  | export async function expectKeyboardReachable(
  97  |   page: Page,
  98  |   target: Locator,
  99  |   maximumTabs = 60,
  100 | ) {
  101 |   await target.scrollIntoViewIfNeeded()
  102 |   await page.evaluate(() => {
  103 |     window.scrollTo(0, 0)
  104 |     const active = document.activeElement
  105 |     if (active instanceof HTMLElement) active.blur()
  106 |   })
  107 | 
  108 |   for (let index = 0; index < maximumTabs; index += 1) {
  109 |     await page.keyboard.press('Tab')
  110 |     const reached = await target.evaluate((element) => (
  111 |       element === document.activeElement || element.contains(document.activeElement)
  112 |     ))
  113 |     if (reached) {
  114 |       await expect(target).toBeFocused()
  115 |       return
  116 |     }
  117 |   }
  118 | 
  119 |   throw new Error(`La cible clavier n'a pas été atteinte après ${maximumTabs} tabulations`)
  120 | }
  121 | 
```