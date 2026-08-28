# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B desktop light >> historique-solde reste utilisable
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
              - link "My-balance" [ref=e50] [cursor=pointer]:
                - /url: /my-balance
            - listitem [ref=e51]:
              - img [ref=e52]
            - listitem [ref=e54]:
              - link "History" [ref=e55] [cursor=pointer]:
                - /url: /my-balance/history
        - main [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]:
                - generic [ref=e60]:
                  - img [ref=e61]
                  - heading "Historique de crédits" [level=1] [ref=e66]
                - paragraph [ref=e67]: Consultez votre solde actuel et toutes vos transactions de crédits (achats et dépenses).
              - generic [ref=e69]:
                - link "Historique" [ref=e70] [cursor=pointer]:
                  - /url: /my-balance/history
                  - img [ref=e71]
                  - generic [ref=e75]: Historique
                - link "Recharge & packs" [ref=e76] [cursor=pointer]:
                  - /url: /my-balance/recharge
                  - img [ref=e77]
                  - generic [ref=e81]: Recharge & packs
            - generic [ref=e82]:
              - img [ref=e84]
              - generic [ref=e87]:
                - generic [ref=e88]:
                  - generic [ref=e89]:
                    - img [ref=e90]
                    - generic [ref=e93]: Solde actuel
                  - generic [ref=e94]:
                    - text: "169"
                    - generic [ref=e95]: crédits
                  - generic [ref=e99]: Solde élevé
                  - paragraph [ref=e100]: Vous avez 169 crédits
                - generic [ref=e101]:
                  - button "Recharger mon solde" [ref=e102] [cursor=pointer]:
                    - img [ref=e103]
                    - text: Recharger mon solde
                  - paragraph [ref=e105]: Paiement mobile money sécurisé
                - generic [ref=e106]:
                  - generic [ref=e107]:
                    - generic [ref=e108]: "11"
                    - generic [ref=e109]: Mises à la une possibles
                  - generic [ref=e110]:
                    - generic [ref=e111]: "16"
                    - generic [ref=e112]: Mises en tendance (7j)
                  - generic [ref=e113]:
                    - generic [ref=e114]: "33"
                    - generic [ref=e115]: Mises en tendance (3j)
                  - generic [ref=e116]:
                    - generic [ref=e117]: "169"
                    - generic [ref=e118]: Assistances IA
            - generic [ref=e119]:
              - generic [ref=e120]:
                - generic [ref=e121]:
                  - img [ref=e122]
                  - heading "Historique des Transactions" [level=2] [ref=e126]
                - generic [ref=e127]:
                  - generic [ref=e128]: 1 transaction au total
                  - generic [ref=e129]:
                    - generic [ref=e130]:
                      - img [ref=e131]
                      - combobox "Filtrer les transactions" [ref=e133] [cursor=pointer]:
                        - generic: Toutes
                        - img [ref=e134]
                    - button "Exporter" [ref=e136] [cursor=pointer]:
                      - img
                      - generic [ref=e137]: Exporter
              - table [ref=e140]:
                - rowgroup [ref=e141]:
                  - row "Type Description Crédits Montant Statut Date" [ref=e142]:
                    - columnheader "Type" [ref=e143]
                    - columnheader "Description" [ref=e144]
                    - columnheader "Crédits" [ref=e145]
                    - columnheader "Montant" [ref=e146]
                    - columnheader "Statut" [ref=e147]
                    - columnheader "Date" [ref=e148]
                - rowgroup [ref=e149]:
                  - row "Achat Recharge Pack Boost +70 10,000 FCFA Validé 18 juil. 2026, 11:00" [ref=e150]:
                    - cell "Achat" [ref=e151]:
                      - generic [ref=e152]:
                        - img [ref=e153]
                        - generic [ref=e154]: Achat
                    - cell "Recharge Pack Boost" [ref=e155]
                    - cell "+70" [ref=e156]:
                      - generic [ref=e157]: "+70"
                    - cell "10,000 FCFA" [ref=e158]
                    - cell "Validé" [ref=e159]:
                      - generic [ref=e160]:
                        - img [ref=e161]
                        - generic [ref=e164]: Validé
                    - cell "18 juil. 2026, 11:00" [ref=e165]
    - contentinfo [ref=e166]:
      - generic [ref=e167]:
        - generic [ref=e168]:
          - generic [ref=e169]:
            - img [ref=e170]
            - paragraph [ref=e180]: Trouve Ton Nkama simplifie la recherche, la location et la vente de biens immobiliers au Gabon.
          - navigation [ref=e181]:
            - heading "Liens utiles" [level=2] [ref=e182]
            - list [ref=e183]:
              - listitem [ref=e184]:
                - link "À propos" [ref=e185] [cursor=pointer]:
                  - /url: https://www.facebook.com/profile.php?id=61574099562451
              - listitem [ref=e186]:
                - link "Blog" [ref=e187] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=e188]:
                - link "Immobilier Gabon" [ref=e189] [cursor=pointer]:
                  - /url: /immobilier
              - listitem [ref=e190]:
                - link "Maisons à louer" [ref=e191] [cursor=pointer]:
                  - /url: /immobilier/location/maison
              - listitem [ref=e192]:
                - link "Maisons à vendre" [ref=e193] [cursor=pointer]:
                  - /url: /immobilier/vente/maison
              - listitem [ref=e194]:
                - link "Guide Immobilier" [ref=e195] [cursor=pointer]:
                  - /url: /guide-immobilier-gabon
              - listitem [ref=e196]:
                - link "Faire de la pub" [ref=e197] [cursor=pointer]:
                  - /url: /faire-de-la-pub
              - listitem [ref=e198]:
                - link "Demandes de recherche" [ref=e199] [cursor=pointer]:
                  - /url: /demandes-recherche
              - listitem [ref=e200]:
                - link "Politique de confidentialité" [ref=e201] [cursor=pointer]:
                  - /url: /privacy-policy
              - listitem [ref=e202]:
                - link "Conditions d'utilisation" [ref=e203] [cursor=pointer]:
                  - /url: /terms-of-use
              - listitem [ref=e204]:
                - link "Conditions annonceur" [ref=e205] [cursor=pointer]:
                  - /url: /announcer-terms
          - generic [ref=e206]:
            - heading "Contact" [level=2] [ref=e207]
            - generic [ref=e208]:
              - generic [ref=e209]:
                - img [ref=e210]
                - generic [ref=e213]: Libreville, Gabon
              - generic [ref=e214]:
                - img [ref=e215]
                - link "glenneriss@gmail.com" [ref=e218] [cursor=pointer]:
                  - /url: mailto:glenneriss@gmail.com
              - generic [ref=e219]:
                - img [ref=e220]
                - link "Suivez-nous sur Facebook" [ref=e222] [cursor=pointer]:
                  - /url: https://www.facebook.com/share/16beeh915e/
              - generic [ref=e223]:
                - img [ref=e224]
                - link "Contactez-nous sur WhatsApp" [ref=e226] [cursor=pointer]:
                  - /url: "#"
              - generic [ref=e227]:
                - img [ref=e228]
                - link "Rejoignez notre chaîne" [ref=e234] [cursor=pointer]:
                  - /url: https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z
              - generic [ref=e235]:
                - img [ref=e236]
                - link "Suivez-nous sur TikTok" [ref=e239] [cursor=pointer]:
                  - /url: https://www.tiktok.com/@tonnkama?is_from_webapp=1&sender_device=pc
        - separator [ref=e240]
        - generic [ref=e241]:
          - text: © 2026
          - link "Trouve Ton Nkama" [ref=e242] [cursor=pointer]:
            - /url: /
          - text: . Tous droits réservés.
    - region "Notifications (F8)":
      - list
  - alert [ref=e243]
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