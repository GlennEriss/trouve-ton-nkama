# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B desktop light >> formulaire-studio reste utilisable
- Location: __tests__/e2e/lot5b-forms-auth-balance.spec.ts:135:13

# Error details

```
Error: Violations WCAG bloquantes: [
  {
    "id": "color-contrast",
    "impact": "serious",
    "help": "Elements must meet minimum color contrast ratio thresholds",
    "targets": [
      "#_r_o_-form-item > .flex-1 > .mt-1.text-gray-500"
    ],
    "elements": [
      "<p class=\"text-sm text-gray-500 dark:text-gray-400 mt-1\">Propriété disponible à la location</p>"
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
+       "<p class=\"text-sm text-gray-500 dark:text-gray-400 mt-1\">Propriété disponible à la location</p>",
+     ],
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "id": "color-contrast",
+     "impact": "serious",
+     "targets": Array [
+       "#_r_o_-form-item > .flex-1 > .mt-1.text-gray-500",
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
              - link "Propriétés" [ref=e50] [cursor=pointer]:
                - /url: /property
            - listitem [ref=e51]:
              - img [ref=e52]
            - listitem [ref=e54]:
              - link "Ajouter" [ref=e55] [cursor=pointer]:
                - /url: /property/add
            - listitem [ref=e56]:
              - img [ref=e57]
            - listitem [ref=e59]:
              - link "Studio" [ref=e60] [cursor=pointer]:
                - /url: /property/add/studio
        - main [ref=e61]:
          - generic [ref=e64]:
            - heading "Ajout d'un studio" [level=1] [ref=e66]
            - generic [ref=e67]:
              - 'button "Aller à l''étape 1: First" [disabled] [ref=e69] [cursor=pointer]': "1"
              - 'button "Aller à l''étape 2: Second" [disabled] [ref=e72]': "2"
              - 'button "Aller à l''étape 3: Third" [disabled] [ref=e75]': "3"
            - generic [ref=e76]:
              - generic [ref=e77]:
                - generic [ref=e79]:
                  - text: Sélectionnez plusieurs images
                  - generic [ref=e80]:
                    - generic [ref=e82]: 0/10 images
                    - generic [ref=e84] [cursor=pointer]:
                      - button "Ajouter des images du bien" [ref=e85]
                      - generic [ref=e86]:
                        - img [ref=e88]
                        - generic [ref=e90]:
                          - paragraph [ref=e91]: Ajouter des images
                          - paragraph [ref=e92]: Cliquez ou glissez-déposez
                  - paragraph [ref=e93]: Ajoutez des images de bonne qualité du bien immobilier. (Max 10)
                - generic [ref=e95]:
                  - text: Titre
                  - textbox "Titre de l'annonce" [ref=e97]
                  - paragraph [ref=e98]: "Entrez un titre pour décrire le bien (ex: Maison familiale spacieuse)."
                - generic [ref=e100]:
                  - text: Description
                  - textbox "Description de l'annonce" [ref=e102]
                  - paragraph [ref=e103]: Décrivez les caractéristiques principales du bien immobilier.
                - generic [ref=e105]:
                  - text: Superficie
                  - generic [ref=e106]:
                    - spinbutton "Superficie du bien en mètres carrés" [ref=e107]: "0"
                    - generic [ref=e108]:
                      - button "Diminuer la valeur" [ref=e109] [cursor=pointer]:
                        - img
                      - button "Augmenter la valeur" [ref=e110] [cursor=pointer]:
                        - img
                  - paragraph [ref=e111]: Indiquez la superficie du bien en mètres carrés.
                - generic [ref=e113]:
                  - text: Prix (FCFA)
                  - generic [ref=e114]:
                    - spinbutton "Prix du bien en FCFA" [ref=e115]: "0"
                    - generic [ref=e116]:
                      - button "Diminuer la valeur" [ref=e117] [cursor=pointer]:
                        - img
                      - button "Augmenter la valeur" [ref=e118] [cursor=pointer]:
                        - img
                  - paragraph [ref=e119]: Entrez le prix du bien immobilier ou le loyer attendu.
                - generic [ref=e121]:
                  - text: Statut
                  - generic [ref=e123]:
                    - generic [ref=e128] [cursor=pointer]:
                      - text: A louer
                      - paragraph [ref=e129]: Propriété disponible à la location
                    - generic [ref=e135] [cursor=pointer]:
                      - text: A vendre
                      - paragraph [ref=e136]: Propriété disponible à la vente
                  - paragraph [ref=e137]: Choisissez si le bien est à vendre ou à louer.
                - generic [ref=e139]:
                  - text: Votre rôle sur ce bien
                  - generic [ref=e140]:
                    - generic [ref=e144] [cursor=pointer]:
                      - text: Propriétaire direct
                      - paragraph [ref=e145]: Le locataire/acheteur ne paie aucune commission
                    - generic [ref=e149] [cursor=pointer]:
                      - text: Mandataire / Agence
                      - paragraph [ref=e150]: Des frais de service peuvent s'appliquer au locataire/acheteur
                  - paragraph [ref=e151]: Indiquez si vous êtes le propriétaire direct ou un mandataire.
                - generic [ref=e153]:
                  - text: Tags
                  - generic [ref=e154]:
                    - generic [ref=e156]: 0/6 sélectionnés
                    - generic [ref=e157]:
                      - button "Sélectionner le tag Calme" [ref=e158] [cursor=pointer]:
                        - img [ref=e160]
                        - generic [ref=e162]: Calme
                      - button "Sélectionner le tag Parking" [ref=e163] [cursor=pointer]:
                        - img [ref=e165]
                        - generic [ref=e167]: Parking
                      - button "Sélectionner le tag Sécurisé" [ref=e168] [cursor=pointer]:
                        - img [ref=e170]
                        - generic [ref=e172]: Sécurisé
                  - paragraph [ref=e173]: "Ajoutez des tags pour décrire le bien (ex: moderne, familial). (Max 6)"
              - generic [ref=e174]:
                - paragraph [ref=e177]: 👋 Salut ! Je vais |
                - button "Ouvrir l'assistant de création d'annonce" [ref=e179] [cursor=pointer]
            - generic [ref=e199]:
              - button "Réinitialiser" [ref=e200] [cursor=pointer]:
                - img
                - text: Réinitialiser
              - button "Suivant" [ref=e202] [cursor=pointer]
    - region "Notifications (F8)":
      - list
  - alert [ref=e203]
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