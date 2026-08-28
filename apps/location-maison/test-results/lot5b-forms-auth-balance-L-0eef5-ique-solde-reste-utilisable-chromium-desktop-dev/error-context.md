# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B mobile light >> historique-solde reste utilisable
- Location: __tests__/e2e/lot5b-forms-auth-balance.spec.ts:135:13

# Error details

```
Error: Violations WCAG bloquantes: [
  {
    "id": "aria-hidden-focus",
    "impact": "serious",
    "help": "ARIA hidden element must not be focusable or contain focusable elements",
    "targets": [
      "aside"
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
+       "aside",
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
            - generic [ref=e32]:
              - generic [ref=e33]:
                - img [ref=e34]
                - heading "Historique de crédits" [level=1] [ref=e39]
              - paragraph [ref=e40]: Consultez votre solde actuel et toutes vos transactions de crédits (achats et dépenses).
            - generic [ref=e42]:
              - link "Historique" [ref=e43] [cursor=pointer]:
                - /url: /my-balance/history
                - img [ref=e44]
                - generic [ref=e48]: Historique
              - link "Recharge & packs" [ref=e49] [cursor=pointer]:
                - /url: /my-balance/recharge
                - img [ref=e50]
                - generic [ref=e54]: Recharge & packs
          - generic [ref=e55]:
            - img [ref=e57]
            - generic [ref=e60]:
              - generic [ref=e61]:
                - generic [ref=e62]:
                  - img [ref=e63]
                  - generic [ref=e66]: Solde actuel
                - generic [ref=e67]:
                  - text: "169"
                  - generic [ref=e68]: crédits
                - generic [ref=e72]: Solde élevé
                - paragraph [ref=e73]: Vous avez 169 crédits
              - generic [ref=e74]:
                - button "Recharger mon solde" [ref=e75] [cursor=pointer]:
                  - img [ref=e76]
                  - text: Recharger mon solde
                - paragraph [ref=e78]: Paiement mobile money sécurisé
              - generic [ref=e79]:
                - generic [ref=e80]:
                  - generic [ref=e81]: "11"
                  - generic [ref=e82]: Mises à la une possibles
                - generic [ref=e83]:
                  - generic [ref=e84]: "16"
                  - generic [ref=e85]: Mises en tendance (7j)
                - generic [ref=e86]:
                  - generic [ref=e87]: "33"
                  - generic [ref=e88]: Mises en tendance (3j)
                - generic [ref=e89]:
                  - generic [ref=e90]: "169"
                  - generic [ref=e91]: Assistances IA
          - generic [ref=e92]:
            - generic [ref=e93]:
              - generic [ref=e94]:
                - img [ref=e95]
                - heading "Historique des Transactions" [level=2] [ref=e99]
              - generic [ref=e100]:
                - generic [ref=e101]: 1 transaction au total
                - generic [ref=e102]:
                  - generic [ref=e103]:
                    - img [ref=e104]
                    - combobox "Filtrer les transactions" [ref=e106] [cursor=pointer]:
                      - generic: Toutes
                      - img [ref=e107]
                  - button "Exporter" [ref=e109] [cursor=pointer]:
                    - img
                    - generic [ref=e110]: Exporter
            - generic [ref=e113]:
              - generic [ref=e114]:
                - generic [ref=e115]:
                  - img [ref=e116]
                  - generic [ref=e117]: Achat
                - generic [ref=e118]:
                  - img [ref=e119]
                  - generic [ref=e122]: Validé
              - paragraph [ref=e123]: Recharge Pack Boost
              - generic [ref=e124]:
                - generic [ref=e125]: +70 crédits
                - generic [ref=e126]: 18 juil. 2026, 11:00
              - generic [ref=e127]: 10,000 FCFA
    - navigation "Navigation mobile" [ref=e129]:
      - generic [ref=e131]:
        - link "Annonces" [ref=e132] [cursor=pointer]:
          - /url: /property
          - img [ref=e134]
          - generic [ref=e139]: Annonces
        - link "Recherche" [ref=e140] [cursor=pointer]:
          - /url: /search
          - img [ref=e142]
          - generic [ref=e145]: Recherche
        - link "Publier" [ref=e147] [cursor=pointer]:
          - /url: /publish
          - img [ref=e149]
          - generic [ref=e150]: Publier
        - link "Réels" [ref=e151] [cursor=pointer]:
          - /url: /reels
          - img [ref=e153]
          - generic [ref=e156]: Réels
        - link "Profil" [ref=e157] [cursor=pointer]:
          - /url: /profil
          - img [ref=e159]
          - generic [ref=e163]: Profil
    - region "Notifications (F8)":
      - list
  - alert [ref=e164]
  - complementary [ref=e165]:
    - generic [ref=e166]:
      - link [ref=e167] [cursor=pointer]:
        - /url: /
        - img [ref=e168]
        - generic [ref=e178]: Trouve Ton Nkama
      - button [ref=e179] [cursor=pointer]:
        - img [ref=e180]
    - navigation [ref=e183]:
      - link [ref=e184] [cursor=pointer]:
        - /url: /demandes-recherche
        - text: Demandes de recherche
      - link [ref=e185] [cursor=pointer]:
        - /url: /blog
        - text: Blog
      - link [ref=e186] [cursor=pointer]:
        - /url: /immobilier
        - text: Immobilier Gabon
      - link [ref=e187] [cursor=pointer]:
        - /url: /immobilier/location/maison
        - text: Maisons à louer
      - link [ref=e188] [cursor=pointer]:
        - /url: /immobilier/vente/maison
        - text: Maisons à vendre
      - link [ref=e189] [cursor=pointer]:
        - /url: /guide-immobilier-gabon
        - text: Guide Immobilier
      - link [ref=e190] [cursor=pointer]:
        - /url: /faire-de-la-pub
        - text: Faire de la pub
      - link [ref=e191] [cursor=pointer]:
        - /url: /privacy-policy
        - text: Politique de confidentialité
      - link [ref=e192] [cursor=pointer]:
        - /url: /terms-of-use
        - text: Conditions d'utilisation
      - link [ref=e193] [cursor=pointer]:
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