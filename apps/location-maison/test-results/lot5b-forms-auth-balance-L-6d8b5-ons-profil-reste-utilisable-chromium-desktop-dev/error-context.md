# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B desktop light >> informations-profil reste utilisable
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
            - listitem [ref=e51]:
              - img [ref=e52]
            - listitem [ref=e54]:
              - link "Informations" [ref=e55] [cursor=pointer]:
                - /url: /profil/informations
        - main [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]:
              - heading "Modifier mes informations" [level=1] [ref=e59]
              - paragraph [ref=e60]: Modifiez votre numéro de téléphone et votre pays. Les autres informations sont en lecture seule.
            - generic [ref=e61]:
              - complementary [ref=e62]:
                - generic [ref=e63]:
                  - generic [ref=e65]: G
                  - generic [ref=e66]:
                    - paragraph [ref=e67]: Glenn Eriss
                    - paragraph [ref=e68]: glenn.e2e@example.com
                - generic [ref=e70]:
                  - generic [ref=e71]:
                    - img [ref=e72]
                    - text: Statut téléphone
                  - generic [ref=e75]: Vérifié
              - generic [ref=e77]:
                - generic [ref=e78]:
                  - generic [ref=e79]:
                    - text: Prénom
                    - generic [ref=e80]:
                      - img [ref=e81]
                      - textbox "Prénom" [disabled] [ref=e85]:
                        - /placeholder: Votre prénom
                        - text: Glenn
                  - generic [ref=e86]:
                    - text: Nom
                    - generic [ref=e87]:
                      - img [ref=e88]
                      - textbox "Nom" [disabled] [ref=e92]:
                        - /placeholder: Votre nom
                        - text: Eriss
                - generic [ref=e93]:
                  - text: Nom de l'entreprise (optionnel)
                  - generic [ref=e94]:
                    - img [ref=e95]
                    - textbox "Nom de l'entreprise (optionnel)" [ref=e98]:
                      - /placeholder: Laissez vide pour afficher votre prénom et nom
                - generic [ref=e99]:
                  - text: Adresse email
                  - generic [ref=e100]:
                    - img [ref=e101]
                    - textbox "Adresse email" [disabled] [ref=e104]:
                      - /placeholder: email@exemple.com
                      - text: glenn.e2e@example.com
                - paragraph [ref=e105]: L'email est géré par votre méthode de connexion et ne se modifie pas ici.
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - text: Date de naissance
                    - generic [ref=e108]:
                      - img [ref=e109]
                      - textbox "Date de naissance" [disabled] [ref=e111]: 1990-01-01
                  - generic [ref=e112]:
                    - text: Pays
                    - combobox "Pays" [ref=e113] [cursor=pointer]:
                      - generic: Gabon
                      - img [ref=e114]
                    - combobox [ref=e116]
                - generic [ref=e117]:
                  - text: Numéro de téléphone
                  - generic [ref=e118]:
                    - generic [ref=e119]:
                      - generic [ref=e120]: Indicatif
                      - combobox "Indicatif téléphonique" [ref=e121] [cursor=pointer]:
                        - generic:
                          - generic:
                            - generic: "+241"
                        - img [ref=e122]
                      - combobox [ref=e124]
                    - generic [ref=e125]:
                      - generic [ref=e126]: Numéro
                      - textbox "Numéro de téléphone national" [ref=e128]:
                        - /placeholder: 66 12 34 56
                        - text: "66545430"
                - button "Réseaux sociaux (facultatif) Ajoutez les liens utilisés pour publier vos annonces." [ref=e130] [cursor=pointer]:
                  - generic [ref=e131]:
                    - generic [ref=e132]:
                      - img [ref=e133]
                      - text: Réseaux sociaux (facultatif)
                    - generic [ref=e136]: Ajoutez les liens utilisés pour publier vos annonces.
                  - img [ref=e137]
                - button "Enregistrer les modifications" [ref=e140] [cursor=pointer]
    - contentinfo [ref=e141]:
      - generic [ref=e142]:
        - generic [ref=e143]:
          - generic [ref=e144]:
            - img [ref=e145]
            - paragraph [ref=e155]: Trouve Ton Nkama simplifie la recherche, la location et la vente de biens immobiliers au Gabon.
          - navigation [ref=e156]:
            - heading "Liens utiles" [level=2] [ref=e157]
            - list [ref=e158]:
              - listitem [ref=e159]:
                - link "À propos" [ref=e160] [cursor=pointer]:
                  - /url: https://www.facebook.com/profile.php?id=61574099562451
              - listitem [ref=e161]:
                - link "Blog" [ref=e162] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=e163]:
                - link "Immobilier Gabon" [ref=e164] [cursor=pointer]:
                  - /url: /immobilier
              - listitem [ref=e165]:
                - link "Maisons à louer" [ref=e166] [cursor=pointer]:
                  - /url: /immobilier/location/maison
              - listitem [ref=e167]:
                - link "Maisons à vendre" [ref=e168] [cursor=pointer]:
                  - /url: /immobilier/vente/maison
              - listitem [ref=e169]:
                - link "Guide Immobilier" [ref=e170] [cursor=pointer]:
                  - /url: /guide-immobilier-gabon
              - listitem [ref=e171]:
                - link "Faire de la pub" [ref=e172] [cursor=pointer]:
                  - /url: /faire-de-la-pub
              - listitem [ref=e173]:
                - link "Demandes de recherche" [ref=e174] [cursor=pointer]:
                  - /url: /demandes-recherche
              - listitem [ref=e175]:
                - link "Politique de confidentialité" [ref=e176] [cursor=pointer]:
                  - /url: /privacy-policy
              - listitem [ref=e177]:
                - link "Conditions d'utilisation" [ref=e178] [cursor=pointer]:
                  - /url: /terms-of-use
              - listitem [ref=e179]:
                - link "Conditions annonceur" [ref=e180] [cursor=pointer]:
                  - /url: /announcer-terms
          - generic [ref=e181]:
            - heading "Contact" [level=2] [ref=e182]
            - generic [ref=e183]:
              - generic [ref=e184]:
                - img [ref=e185]
                - generic [ref=e188]: Libreville, Gabon
              - generic [ref=e189]:
                - img [ref=e190]
                - link "glenneriss@gmail.com" [ref=e193] [cursor=pointer]:
                  - /url: mailto:glenneriss@gmail.com
              - generic [ref=e194]:
                - img [ref=e195]
                - link "Suivez-nous sur Facebook" [ref=e197] [cursor=pointer]:
                  - /url: https://www.facebook.com/share/16beeh915e/
              - generic [ref=e198]:
                - img [ref=e199]
                - link "Contactez-nous sur WhatsApp" [ref=e201] [cursor=pointer]:
                  - /url: "#"
              - generic [ref=e202]:
                - img [ref=e203]
                - link "Rejoignez notre chaîne" [ref=e209] [cursor=pointer]:
                  - /url: https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z
              - generic [ref=e210]:
                - img [ref=e211]
                - link "Suivez-nous sur TikTok" [ref=e214] [cursor=pointer]:
                  - /url: https://www.tiktok.com/@tonnkama?is_from_webapp=1&sender_device=pc
        - separator [ref=e215]
        - generic [ref=e216]:
          - text: © 2026
          - link "Trouve Ton Nkama" [ref=e217] [cursor=pointer]:
            - /url: /
          - text: . Tous droits réservés.
    - region "Notifications (F8)":
      - list
  - alert [ref=e218]
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