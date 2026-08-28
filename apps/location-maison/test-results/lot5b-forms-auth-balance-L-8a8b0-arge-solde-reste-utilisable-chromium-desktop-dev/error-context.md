# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B mobile light >> recharge-solde reste utilisable
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
                - heading "Recharge & packs" [level=1] [ref=e39]
              - paragraph [ref=e40]: Rechargez votre solde instantanément par mobile money. Choisissez un pack et confirmez le paiement sur votre téléphone.
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
              - img [ref=e94]
              - generic [ref=e96]:
                - heading "Recharge mobile money instantanée" [level=2] [ref=e97]
                - paragraph [ref=e98]: Paiement mobile money sécurisé (Airtel Money / Moov Money). Vos crédits sont ajoutés automatiquement après confirmation.
            - generic [ref=e99]:
              - generic [ref=e100]:
                - paragraph [ref=e101]: 1. Choisir un pack
                - paragraph [ref=e102]: Sélectionnez le forfait adapté à votre besoin.
              - generic [ref=e103]:
                - paragraph [ref=e104]: 2. Saisir son numéro
                - paragraph [ref=e105]: Indiquez le réseau et le numéro mobile money à débiter.
              - generic [ref=e106]:
                - paragraph [ref=e107]: 3. Confirmer sur le téléphone
                - paragraph [ref=e108]: Validez la transaction reçue ; vos crédits sont ajoutés aussitôt.
            - generic [ref=e109]:
              - img [ref=e110]
              - paragraph [ref=e113]: Historique et solde sont mis à jour automatiquement après confirmation du paiement.
            - generic [ref=e114]:
              - img [ref=e115]
              - paragraph [ref=e117]: "Astuce : cliquez sur un pack ci-dessous pour démarrer la recharge."
          - generic [ref=e118]:
            - generic [ref=e119]:
              - generic [ref=e120]:
                - img [ref=e121]
                - heading "Packs de Crédits" [level=2] [ref=e125]
              - paragraph [ref=e126]: Rechargez votre solde et profitez d'économies progressives. Plus vous achetez, plus vous économisez !
              - generic [ref=e128]:
                - img [ref=e129]
                - paragraph [ref=e131]: Recharge instantanée par mobile money (Airtel Money / Moov Money). Vos crédits sont ajoutés après confirmation du paiement.
            - generic [ref=e132]:
              - button "Choisir le pack Starter - 5 crédits pour 2000 FCFA" [ref=e133] [cursor=pointer]:
                - generic [ref=e134]:
                  - generic [ref=e135]:
                    - img [ref=e137]
                    - heading "Starter" [level=3] [ref=e139]
                  - generic [ref=e140]:
                    - generic [ref=e141]: "5"
                    - generic [ref=e142]: crédits
                  - generic [ref=e143]:
                    - generic [ref=e145]: 2,000 FCFA
                    - generic [ref=e146]: 400 FCFA par crédit
                  - generic [ref=e147]:
                    - generic [ref=e148]: Idéal pour tester
                    - generic [ref=e150]: Support standard
                  - generic [ref=e152]: Choisir ce pack
              - button "Choisir le pack Standard - 10 crédits pour 3500 FCFA" [ref=e153] [cursor=pointer]:
                - generic [ref=e155]: POPULAIRE
                - generic [ref=e156]:
                  - generic [ref=e157]:
                    - img [ref=e159]
                    - heading "Standard" [level=3] [ref=e161]
                  - generic [ref=e162]:
                    - generic [ref=e163]: "10"
                    - generic [ref=e164]: crédits
                  - generic [ref=e165]:
                    - generic [ref=e166]:
                      - generic [ref=e167]: 4,000 FCFA
                      - generic [ref=e168]: 3,500 FCFA
                    - generic [ref=e169]: 350 FCFA par crédit
                  - generic [ref=e170]:
                    - generic [ref=e171]: Pack le plus choisi
                    - generic [ref=e173]: Support prioritaire
                    - generic [ref=e175]: Économique
                  - generic [ref=e177]: Choisir ce pack
                  - generic [ref=e178]: Économisez 12.5% par rapport au pack de base
              - button "Choisir le pack Avancé - 25 crédits pour 7500 FCFA" [ref=e179] [cursor=pointer]:
                - generic [ref=e181]: 25% D'ÉCONOMIE
                - generic [ref=e182]:
                  - generic [ref=e183]:
                    - img [ref=e185]
                    - heading "Avancé" [level=3] [ref=e188]
                  - generic [ref=e189]:
                    - generic [ref=e190]: "25"
                    - generic [ref=e191]: crédits
                  - generic [ref=e192]:
                    - generic [ref=e193]:
                      - generic [ref=e194]: 10,000 FCFA
                      - generic [ref=e195]: 7,500 FCFA
                    - generic [ref=e196]: 300 FCFA par crédit
                  - generic [ref=e197]:
                    - generic [ref=e198]: Excellent rapport qualité/prix
                    - generic [ref=e200]: Support prioritaire
                    - generic [ref=e202]: "Bonus: conseils personnalisés"
                  - generic [ref=e204]: Choisir ce pack
                  - generic [ref=e205]: Économisez 25% par rapport au pack de base
              - button "Choisir le pack Premium - 50 crédits pour 12500 FCFA" [ref=e206] [cursor=pointer]:
                - generic [ref=e208]: MEILLEUR PRIX
                - generic [ref=e209]:
                  - generic [ref=e210]:
                    - img [ref=e212]
                    - heading "Premium" [level=3] [ref=e214]
                  - generic [ref=e215]:
                    - generic [ref=e216]: "50"
                    - generic [ref=e217]: crédits
                  - generic [ref=e218]:
                    - generic [ref=e219]:
                      - generic [ref=e220]: 20,000 FCFA
                      - generic [ref=e221]: 12,500 FCFA
                    - generic [ref=e222]: 250 FCFA par crédit
                  - generic [ref=e223]:
                    - generic [ref=e224]: Meilleure économie
                    - generic [ref=e226]: Support VIP
                    - generic [ref=e228]: Conseils dédiés
                    - generic [ref=e230]: Accès prioritaire aux nouveautés
                  - generic [ref=e232]: Choisir ce pack
                  - generic [ref=e233]: Économisez 37.5% par rapport au pack de base
            - generic [ref=e235]:
              - img [ref=e237]
              - generic [ref=e241]:
                - heading "Conseils d'achat" [level=3] [ref=e242]
                - list [ref=e243]:
                  - listitem [ref=e244]:
                    - strong [ref=e245]: Pack Standard
                    - text: ": Parfait pour débuter, excellent rapport qualité/prix"
                  - listitem [ref=e246]:
                    - strong [ref=e247]: Pack Avancé
                    - text: ": Idéal pour une utilisation régulière avec 25% d'économies"
                  - listitem [ref=e248]:
                    - strong [ref=e249]: Pack Premium
                    - text: ": Maximum d'économies (37.5%) pour les utilisateurs intensifs"
                  - listitem [ref=e250]: Vos crédits n'expirent jamais, achetez en toute sérénité
            - generic [ref=e251]:
              - paragraph [ref=e252]: Paiement sécurisé avec
              - generic [ref=e253]:
                - img "Airtel Money" [ref=e255]
                - img "Moov Money" [ref=e257]
          - generic [ref=e258]:
            - generic [ref=e259]:
              - generic [ref=e260]:
                - img [ref=e261]
                - heading "Services Premium" [level=2] [ref=e263]
              - paragraph [ref=e264]: Boostez la performance de vos annonces avec nos services premium. Voici le détail des coûts en crédits.
            - generic [ref=e265]:
              - generic [ref=e267]:
                - generic [ref=e268]:
                  - img [ref=e270]
                  - generic [ref=e273]:
                    - heading "Mise à la une" [level=3] [ref=e274]
                    - generic [ref=e275]: 7 jours
                - paragraph [ref=e276]: Votre annonce en première position sur la page d'accueil
                - generic [ref=e278]:
                  - generic [ref=e279]: 15 crédits
                  - generic [ref=e280]: ≈ 5,250 FCFA
                - generic [ref=e281]:
                  - generic [ref=e282]: "Avantages :"
                  - list [ref=e283]:
                    - listitem [ref=e284]: Visibilité maximale
                    - listitem [ref=e286]: Première position
                    - listitem [ref=e288]: +300% de vues en moyenne
              - generic [ref=e291]:
                - generic [ref=e292]:
                  - img [ref=e294]
                  - generic [ref=e297]:
                    - heading "Mise en tendance" [level=3] [ref=e298]
                    - generic [ref=e299]: 7 jours
                - paragraph [ref=e300]: Annonce prioritaire dans les résultats de recherche
                - generic [ref=e302]:
                  - generic [ref=e303]: 10 crédits
                  - generic [ref=e304]: ≈ 3,500 FCFA
                - generic [ref=e305]:
                  - generic [ref=e306]: "Avantages :"
                  - list [ref=e307]:
                    - listitem [ref=e308]: Apparition prioritaire
                    - listitem [ref=e310]: Badge "Tendance"
                    - listitem [ref=e312]: +150% de contacts
              - generic [ref=e315]:
                - generic [ref=e316]:
                  - img [ref=e318]
                  - generic [ref=e321]:
                    - heading "Mise en tendance courte" [level=3] [ref=e322]
                    - generic [ref=e323]: 3 jours
                - paragraph [ref=e324]: Version courte de la mise en tendance
                - generic [ref=e326]:
                  - generic [ref=e327]: 5 crédits
                  - generic [ref=e328]: ≈ 2,000 FCFA
                - generic [ref=e329]:
                  - generic [ref=e330]: "Avantages :"
                  - list [ref=e331]:
                    - listitem [ref=e332]: Boost rapide
                    - listitem [ref=e334]: Idéal pour tester
                    - listitem [ref=e336]: +100% de visibilité
              - generic [ref=e339]:
                - generic [ref=e340]:
                  - img [ref=e342]
                  - heading "Remonter une annonce" [level=3] [ref=e346]
                - paragraph [ref=e347]: Remise en haut de liste instantanée
                - generic [ref=e349]:
                  - generic [ref=e350]: 3 crédits
                  - generic [ref=e351]: ≈ 1,200 FCFA
                - generic [ref=e352]:
                  - generic [ref=e353]: "Avantages :"
                  - list [ref=e354]:
                    - listitem [ref=e355]: Action immédiate
                    - listitem [ref=e357]: Fraîcheur retrouvée
                    - listitem [ref=e359]: Parfait pour relancer
              - generic [ref=e362]:
                - generic [ref=e363]:
                  - img [ref=e365]
                  - heading "Assistant IA" [level=3] [ref=e369]
                - paragraph [ref=e370]: Génération automatique de description optimisée
                - generic [ref=e372]:
                  - generic [ref=e373]: 1 crédits
                  - generic [ref=e374]: ≈ 350 FCFA
                - generic [ref=e375]:
                  - generic [ref=e376]: "Avantages :"
                  - list [ref=e377]:
                    - listitem [ref=e378]: Description professionnelle
                    - listitem [ref=e380]: Mots-clés optimisés
                    - listitem [ref=e382]: Gain de temps
            - generic [ref=e385]:
              - generic [ref=e386]:
                - img [ref=e388]
                - heading "Optimisez votre retour sur investissement" [level=3] [ref=e391]
              - generic [ref=e392]:
                - generic [ref=e393]:
                  - heading "Stratégies recommandées :" [level=4] [ref=e394]
                  - list [ref=e395]:
                    - listitem [ref=e396]:
                      - text: Commencez par un
                      - strong [ref=e397]: boost simple (3 crédits)
                      - text: pour tester
                    - listitem [ref=e398]:
                      - text: Utilisez la
                      - strong [ref=e399]: mise en tendance 7j
                      - text: pour les annonces prioritaires
                    - listitem [ref=e400]:
                      - text: Réservez la
                      - strong [ref=e401]: mise à la une
                      - text: pour vos meilleures propriétés
                - generic [ref=e402]:
                  - heading "Résultats moyens observés :" [level=4] [ref=e403]
                  - list [ref=e404]:
                    - listitem [ref=e405]:
                      - strong [ref=e406]: +300% de vues
                      - text: avec mise à la une
                    - listitem [ref=e407]:
                      - strong [ref=e408]: +150% de contacts
                      - text: avec mise en tendance
                    - listitem [ref=e409]:
                      - strong [ref=e410]: 70% de chances
                      - text: de location sous 15 jours
    - navigation "Navigation mobile" [ref=e412]:
      - generic [ref=e414]:
        - link "Annonces" [ref=e415] [cursor=pointer]:
          - /url: /property
          - img [ref=e417]
          - generic [ref=e422]: Annonces
        - link "Recherche" [ref=e423] [cursor=pointer]:
          - /url: /search
          - img [ref=e425]
          - generic [ref=e428]: Recherche
        - link "Publier" [ref=e430] [cursor=pointer]:
          - /url: /publish
          - img [ref=e432]
          - generic [ref=e433]: Publier
        - link "Réels" [ref=e434] [cursor=pointer]:
          - /url: /reels
          - img [ref=e436]
          - generic [ref=e439]: Réels
        - link "Profil" [ref=e440] [cursor=pointer]:
          - /url: /profil
          - img [ref=e442]
          - generic [ref=e446]: Profil
    - region "Notifications (F8)":
      - list
  - alert [ref=e447]
  - complementary [ref=e448]:
    - generic [ref=e449]:
      - link [ref=e450] [cursor=pointer]:
        - /url: /
        - img [ref=e451]
        - generic [ref=e461]: Trouve Ton Nkama
      - button [ref=e462] [cursor=pointer]:
        - img [ref=e463]
    - navigation [ref=e466]:
      - link [ref=e467] [cursor=pointer]:
        - /url: /demandes-recherche
        - text: Demandes de recherche
      - link [ref=e468] [cursor=pointer]:
        - /url: /blog
        - text: Blog
      - link [ref=e469] [cursor=pointer]:
        - /url: /immobilier
        - text: Immobilier Gabon
      - link [ref=e470] [cursor=pointer]:
        - /url: /immobilier/location/maison
        - text: Maisons à louer
      - link [ref=e471] [cursor=pointer]:
        - /url: /immobilier/vente/maison
        - text: Maisons à vendre
      - link [ref=e472] [cursor=pointer]:
        - /url: /guide-immobilier-gabon
        - text: Guide Immobilier
      - link [ref=e473] [cursor=pointer]:
        - /url: /faire-de-la-pub
        - text: Faire de la pub
      - link [ref=e474] [cursor=pointer]:
        - /url: /privacy-policy
        - text: Politique de confidentialité
      - link [ref=e475] [cursor=pointer]:
        - /url: /terms-of-use
        - text: Conditions d'utilisation
      - link [ref=e476] [cursor=pointer]:
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