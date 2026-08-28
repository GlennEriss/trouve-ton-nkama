# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B mobile light >> informations-profil reste utilisable
- Location: __tests__/e2e/lot5b-forms-auth-balance.spec.ts:135:13

# Error details

```
Error: Violations WCAG bloquantes: [
  {
    "id": "aria-hidden-focus",
    "impact": "serious",
    "help": "ARIA hidden element must not be focusable or contain focusable elements",
    "targets": [
      ".inset-y-0"
    ],
    "elements": [
      "<aside class=\"fixed inset-y-0 left-0 z-[10001] w-[80%] max-w-xs overflow-y-auto bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900 md:hidden -translate-x-full\" aria-hidden=\"true\">"
    ]
  },
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
+ Received  + 24

- Array []
+ Array [
+   Object {
+     "elements": Array [
+       "<aside class=\"fixed inset-y-0 left-0 z-[10001] w-[80%] max-w-xs overflow-y-auto bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900 md:hidden -translate-x-full\" aria-hidden=\"true\">",
+     ],
+     "help": "ARIA hidden element must not be focusable or contain focusable elements",
+     "id": "aria-hidden-focus",
+     "impact": "serious",
+     "targets": Array [
+       ".inset-y-0",
+     ],
+   },
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
      - navigation [ref=e5]:
        - generic [ref=e6]:
          - button "Ouvrir le menu" [ref=e7] [cursor=pointer]:
            - img [ref=e8]
          - link "Trouve Ton Nkama" [ref=e9] [cursor=pointer]:
            - /url: /
            - img [ref=e10]
            - generic [ref=e20]: Trouve Ton Nkama
        - generic [ref=e21]:
          - button "Ouvrir les notifications" [ref=e22] [cursor=pointer]:
            - button "Ouvrir les notifications" [ref=e23]:
              - img
          - button "Ouvrir le menu du profil" [ref=e24] [cursor=pointer]:
            - generic [ref=e27]: G
      - main [ref=e29]:
        - generic [ref=e30]:
          - generic [ref=e31]:
            - link "Retour au profil" [ref=e32] [cursor=pointer]:
              - /url: /profil
              - img [ref=e33]
            - heading "Modifier mes informations" [level=1] [ref=e35]
          - generic [ref=e36]:
            - complementary [ref=e37]:
              - generic [ref=e38]:
                - generic [ref=e40]: G
                - generic [ref=e41]:
                  - paragraph [ref=e42]: Glenn Eriss
                  - paragraph [ref=e43]: glenn.e2e@example.com
              - generic [ref=e45]:
                - generic [ref=e46]:
                  - img [ref=e47]
                  - text: Statut téléphone
                - generic [ref=e50]: Vérifié
            - generic [ref=e52]:
              - generic [ref=e53]:
                - generic [ref=e54]:
                  - text: Prénom
                  - generic [ref=e55]:
                    - img [ref=e56]
                    - textbox "Prénom" [disabled] [ref=e60]:
                      - /placeholder: Votre prénom
                      - text: Glenn
                - generic [ref=e61]:
                  - text: Nom
                  - generic [ref=e62]:
                    - img [ref=e63]
                    - textbox "Nom" [disabled] [ref=e67]:
                      - /placeholder: Votre nom
                      - text: Eriss
              - generic [ref=e68]:
                - text: Nom de l'entreprise (optionnel)
                - generic [ref=e69]:
                  - img [ref=e70]
                  - textbox "Nom de l'entreprise (optionnel)" [ref=e73]:
                    - /placeholder: Laissez vide pour afficher votre prénom et nom
              - generic [ref=e74]:
                - text: Adresse email
                - generic [ref=e75]:
                  - img [ref=e76]
                  - textbox "Adresse email" [disabled] [ref=e79]:
                    - /placeholder: email@exemple.com
                    - text: glenn.e2e@example.com
              - paragraph [ref=e80]: L'email est géré par votre méthode de connexion et ne se modifie pas ici.
              - generic [ref=e81]:
                - generic [ref=e82]:
                  - text: Date de naissance
                  - generic [ref=e83]:
                    - img [ref=e84]
                    - textbox "Date de naissance" [disabled] [ref=e86]: 1990-01-01
                - generic [ref=e87]:
                  - text: Pays
                  - combobox "Pays" [ref=e88] [cursor=pointer]:
                    - generic: Gabon
                    - img [ref=e89]
                  - combobox [ref=e91]
              - generic [ref=e92]:
                - text: Numéro de téléphone
                - generic [ref=e93]:
                  - generic [ref=e94]:
                    - generic [ref=e95]: Indicatif
                    - combobox "Indicatif téléphonique" [ref=e96] [cursor=pointer]:
                      - generic:
                        - generic:
                          - generic: "+241"
                      - img [ref=e97]
                    - combobox [ref=e99]
                  - generic [ref=e100]:
                    - generic [ref=e101]: Numéro
                    - textbox "Numéro de téléphone national" [ref=e103]:
                      - /placeholder: 66 12 34 56
                      - text: "66545430"
              - button "Réseaux sociaux (facultatif) Ajoutez les liens utilisés pour publier vos annonces." [ref=e105] [cursor=pointer]:
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - img [ref=e108]
                    - text: Réseaux sociaux (facultatif)
                  - generic [ref=e111]: Ajoutez les liens utilisés pour publier vos annonces.
                - img [ref=e112]
              - button "Enregistrer les modifications" [ref=e115] [cursor=pointer]
    - navigation "Navigation mobile" [ref=e117]:
      - generic [ref=e119]:
        - link "Annonces" [ref=e120] [cursor=pointer]:
          - /url: /property
          - img [ref=e122]
          - generic [ref=e127]: Annonces
        - link "Recherche" [ref=e128] [cursor=pointer]:
          - /url: /search
          - img [ref=e130]
          - generic [ref=e133]: Recherche
        - link "Publier" [ref=e135] [cursor=pointer]:
          - /url: /publish
          - img [ref=e137]
          - generic [ref=e138]: Publier
        - link "Réels" [ref=e139] [cursor=pointer]:
          - /url: /reels
          - img [ref=e141]
          - generic [ref=e144]: Réels
        - link "Profil" [ref=e145] [cursor=pointer]:
          - /url: /profil
          - img [ref=e147]
          - generic [ref=e151]: Profil
    - region "Notifications (F8)":
      - list
  - alert [ref=e152]
  - complementary [ref=e153]:
    - generic [ref=e154]:
      - link [ref=e155] [cursor=pointer]:
        - /url: /
        - img [ref=e156]
        - generic [ref=e166]: Trouve Ton Nkama
      - button [ref=e167] [cursor=pointer]:
        - img [ref=e168]
    - navigation [ref=e171]:
      - link [ref=e172] [cursor=pointer]:
        - /url: /demandes-recherche
        - text: Demandes de recherche
      - link [ref=e173] [cursor=pointer]:
        - /url: /blog
        - text: Blog
      - link [ref=e174] [cursor=pointer]:
        - /url: /immobilier
        - text: Immobilier Gabon
      - link [ref=e175] [cursor=pointer]:
        - /url: /immobilier/location/maison
        - text: Maisons à louer
      - link [ref=e176] [cursor=pointer]:
        - /url: /immobilier/vente/maison
        - text: Maisons à vendre
      - link [ref=e177] [cursor=pointer]:
        - /url: /guide-immobilier-gabon
        - text: Guide Immobilier
      - link [ref=e178] [cursor=pointer]:
        - /url: /faire-de-la-pub
        - text: Faire de la pub
      - link [ref=e179] [cursor=pointer]:
        - /url: /privacy-policy
        - text: Politique de confidentialité
      - link [ref=e180] [cursor=pointer]:
        - /url: /terms-of-use
        - text: Conditions d'utilisation
      - link [ref=e181] [cursor=pointer]:
        - /url: /announcer-terms
        - text: Conditions annonceur
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