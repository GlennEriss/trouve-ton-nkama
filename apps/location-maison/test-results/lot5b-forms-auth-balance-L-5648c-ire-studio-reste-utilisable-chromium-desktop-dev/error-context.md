# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B mobile dark >> formulaire-studio reste utilisable
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
    "id": "color-contrast",
    "impact": "serious",
    "help": "Elements must meet minimum color contrast ratio thresholds",
    "targets": [
      ".hover\\:bg-primary\\/90"
    ],
    "elements": [
      "<button class=\"inline-flex items-ce...\" type=\"submit\">"
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
+ Received  + 35

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
+       "<button class=\"inline-flex items-ce...\" type=\"submit\">",
+     ],
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "id": "color-contrast",
+     "impact": "serious",
+     "targets": Array [
+       ".hover\\:bg-primary\\/90",
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
          - heading "Ajout d'un studio" [level=1] [ref=e33]
          - generic [ref=e35]:
            - generic [ref=e36]:
              - 'button "Aller à l''étape 1: First" [disabled] [ref=e38] [cursor=pointer]': "1"
              - 'button "Aller à l''étape 2: Second" [disabled] [ref=e41]': "2"
              - 'button "Aller à l''étape 3: Third" [disabled] [ref=e44]': "3"
            - generic [ref=e45]:
              - generic [ref=e46]:
                - generic [ref=e48]:
                  - text: Sélectionnez plusieurs images
                  - generic [ref=e49]:
                    - generic [ref=e51]: 0/10 images
                    - generic [ref=e53] [cursor=pointer]:
                      - button "Ajouter des images du bien" [ref=e54]
                      - generic [ref=e55]:
                        - img [ref=e57]
                        - paragraph [ref=e60]: Cliquez ou glissez-déposez
                  - paragraph [ref=e61]: Ajoutez des images de bonne qualité du bien immobilier. (Max 10)
                - generic [ref=e63]:
                  - text: Titre
                  - textbox "Titre de l'annonce" [ref=e65]
                  - paragraph [ref=e66]: "Entrez un titre pour décrire le bien (ex: Maison familiale spacieuse)."
                - generic [ref=e68]:
                  - text: Description
                  - textbox "Description de l'annonce" [ref=e70]
                  - paragraph [ref=e71]: Décrivez les caractéristiques principales du bien immobilier.
                - generic [ref=e73]:
                  - text: Superficie
                  - generic [ref=e74]:
                    - spinbutton "Superficie du bien en mètres carrés" [ref=e75]: "0"
                    - generic [ref=e76]:
                      - button "Diminuer la valeur" [ref=e77] [cursor=pointer]:
                        - img
                      - button "Augmenter la valeur" [ref=e78] [cursor=pointer]:
                        - img
                  - paragraph [ref=e79]: Indiquez la superficie du bien en mètres carrés.
                - generic [ref=e81]:
                  - text: Prix (FCFA)
                  - generic [ref=e82]:
                    - spinbutton "Prix du bien en FCFA" [ref=e83]: "0"
                    - generic [ref=e84]:
                      - button "Diminuer la valeur" [ref=e85] [cursor=pointer]:
                        - img
                      - button "Augmenter la valeur" [ref=e86] [cursor=pointer]:
                        - img
                  - paragraph [ref=e87]: Entrez le prix du bien immobilier ou le loyer attendu.
                - generic [ref=e89]:
                  - text: Statut
                  - generic [ref=e91]:
                    - generic [ref=e96] [cursor=pointer]:
                      - text: A louer
                      - paragraph [ref=e97]: Propriété disponible à la location
                    - generic [ref=e103] [cursor=pointer]:
                      - text: A vendre
                      - paragraph [ref=e104]: Propriété disponible à la vente
                  - paragraph [ref=e105]: Choisissez si le bien est à vendre ou à louer.
                - generic [ref=e107]:
                  - text: Votre rôle sur ce bien
                  - generic [ref=e108]:
                    - generic [ref=e112] [cursor=pointer]:
                      - text: Propriétaire direct
                      - paragraph [ref=e113]: Le locataire/acheteur ne paie aucune commission
                    - generic [ref=e117] [cursor=pointer]:
                      - text: Mandataire / Agence
                      - paragraph [ref=e118]: Des frais de service peuvent s'appliquer au locataire/acheteur
                  - paragraph [ref=e119]: Indiquez si vous êtes le propriétaire direct ou un mandataire.
                - generic [ref=e121]:
                  - text: Tags
                  - generic [ref=e122]:
                    - generic [ref=e124]: 0/6 sélectionnés
                    - generic [ref=e125]:
                      - button "Sélectionner le tag Calme" [ref=e126] [cursor=pointer]:
                        - img [ref=e128]
                        - generic [ref=e130]: Calme
                      - button "Sélectionner le tag Parking" [ref=e131] [cursor=pointer]:
                        - img [ref=e133]
                        - generic [ref=e135]: Parking
                      - button "Sélectionner le tag Sécurisé" [ref=e136] [cursor=pointer]:
                        - img [ref=e138]
                        - generic [ref=e140]: Sécurisé
                  - paragraph [ref=e141]: "Ajoutez des tags pour décrire le bien (ex: moderne, familial). (Max 6)"
              - button "Ouvrir l'assistant de création d'annonce" [ref=e143] [cursor=pointer]
            - generic [ref=e163]:
              - button "Réinitialiser" [ref=e164] [cursor=pointer]:
                - img
                - text: Réinitialiser
              - button "Suivant" [ref=e166] [cursor=pointer]
    - navigation "Navigation mobile" [ref=e168]:
      - generic [ref=e170]:
        - link "Annonces" [ref=e171] [cursor=pointer]:
          - /url: /property
          - img [ref=e173]
          - generic [ref=e178]: Annonces
        - link "Recherche" [ref=e179] [cursor=pointer]:
          - /url: /search
          - img [ref=e181]
          - generic [ref=e184]: Recherche
        - link "Publier" [ref=e186] [cursor=pointer]:
          - /url: /publish
          - img [ref=e188]
          - generic [ref=e189]: Publier
        - link "Réels" [ref=e190] [cursor=pointer]:
          - /url: /reels
          - img [ref=e192]
          - generic [ref=e195]: Réels
        - link "Profil" [ref=e196] [cursor=pointer]:
          - /url: /profil
          - img [ref=e198]
          - generic [ref=e202]: Profil
    - region "Notifications (F8)":
      - list
  - alert [ref=e203]
  - complementary [ref=e204]:
    - generic [ref=e205]:
      - link [ref=e206] [cursor=pointer]:
        - /url: /
        - img [ref=e207]
        - generic [ref=e217]: Trouve Ton Nkama
      - button [ref=e218] [cursor=pointer]:
        - img [ref=e219]
    - navigation [ref=e222]:
      - link [ref=e223] [cursor=pointer]:
        - /url: /demandes-recherche
        - text: Demandes de recherche
      - link [ref=e224] [cursor=pointer]:
        - /url: /blog
        - text: Blog
      - link [ref=e225] [cursor=pointer]:
        - /url: /immobilier
        - text: Immobilier Gabon
      - link [ref=e226] [cursor=pointer]:
        - /url: /immobilier/location/maison
        - text: Maisons à louer
      - link [ref=e227] [cursor=pointer]:
        - /url: /immobilier/vente/maison
        - text: Maisons à vendre
      - link [ref=e228] [cursor=pointer]:
        - /url: /guide-immobilier-gabon
        - text: Guide Immobilier
      - link [ref=e229] [cursor=pointer]:
        - /url: /faire-de-la-pub
        - text: Faire de la pub
      - link [ref=e230] [cursor=pointer]:
        - /url: /privacy-policy
        - text: Politique de confidentialité
      - link [ref=e231] [cursor=pointer]:
        - /url: /terms-of-use
        - text: Conditions d'utilisation
      - link [ref=e232] [cursor=pointer]:
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