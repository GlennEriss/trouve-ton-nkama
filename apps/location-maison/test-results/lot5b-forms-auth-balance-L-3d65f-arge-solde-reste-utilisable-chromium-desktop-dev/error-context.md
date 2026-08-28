# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lot5b-forms-auth-balance.spec.ts >> Lot 5B desktop dark >> recharge-solde reste utilisable
- Location: __tests__/e2e/lot5b-forms-auth-balance.spec.ts:135:13

# Error details

```
Error: Violations WCAG bloquantes: [
  {
    "id": "color-contrast",
    "impact": "serious",
    "help": "Elements must meet minimum color contrast ratio thresholds",
    "targets": [
      ".px-3.md\\:px-4[href$=\"recharge\"] > span",
      ".md\\:px-8",
      ".border-2.text-left.opacity-100:nth-child(1) > .space-y-6.text-center > .py-3.px-6.w-full",
      ".border-secondary > .space-y-6.text-center > .py-3.px-6.w-full",
      ".border-2.text-left.opacity-100:nth-child(3) > .space-y-6.text-center > .py-3.px-6.w-full",
      ".border-gradient-to-r > .space-y-6.text-center > .py-3.px-6.w-full"
    ],
    "elements": [
      "<span>Recharge &amp; packs</span>",
      "<button type=\"button\" class=\"inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 md:px-8 md:py-3 md:text-base\">",
      "<div class=\"\n            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center\n            bg-primary text-white\n          \">Choisir ce pack</div>",
      "<div class=\"\n            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center\n            bg-primary text-white\n          \">Choisir ce pack</div>",
      "<div class=\"\n            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center\n            bg-primary text-white\n          \">Choisir ce pack</div>",
      "<div class=\"\n            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center\n            bg-primary text-white\n          \">Choisir ce pack</div>"
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
+ Received  + 46

- Array []
+ Array [
+   Object {
+     "elements": Array [
+       "<span>Recharge &amp; packs</span>",
+       "<button type=\"button\" class=\"inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 md:px-8 md:py-3 md:text-base\">",
+       "<div class=\"
+             w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center
+             bg-primary text-white
+           \">Choisir ce pack</div>",
+       "<div class=\"
+             w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center
+             bg-primary text-white
+           \">Choisir ce pack</div>",
+       "<div class=\"
+             w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center
+             bg-primary text-white
+           \">Choisir ce pack</div>",
+       "<div class=\"
+             w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300 text-center
+             bg-primary text-white
+           \">Choisir ce pack</div>",
+     ],
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "id": "color-contrast",
+     "impact": "serious",
+     "targets": Array [
+       ".px-3.md\\:px-4[href$=\"recharge\"] > span",
+       ".md\\:px-8",
+       ".border-2.text-left.opacity-100:nth-child(1) > .space-y-6.text-center > .py-3.px-6.w-full",
+       ".border-secondary > .space-y-6.text-center > .py-3.px-6.w-full",
+       ".border-2.text-left.opacity-100:nth-child(3) > .space-y-6.text-center > .py-3.px-6.w-full",
+       ".border-gradient-to-r > .space-y-6.text-center > .py-3.px-6.w-full",
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
              - link "My-balance" [ref=e50] [cursor=pointer]:
                - /url: /my-balance
            - listitem [ref=e51]:
              - img [ref=e52]
            - listitem [ref=e54]:
              - link "Recharge" [ref=e55] [cursor=pointer]:
                - /url: /my-balance/recharge
        - main [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]:
                - generic [ref=e60]:
                  - img [ref=e61]
                  - heading "Recharge & packs" [level=1] [ref=e66]
                - paragraph [ref=e67]: Rechargez votre solde instantanément par mobile money. Choisissez un pack et confirmez le paiement sur votre téléphone.
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
                - img [ref=e121]
                - generic [ref=e123]:
                  - heading "Recharge mobile money instantanée" [level=2] [ref=e124]
                  - paragraph [ref=e125]: Paiement mobile money sécurisé (Airtel Money / Moov Money). Vos crédits sont ajoutés automatiquement après confirmation.
              - generic [ref=e126]:
                - generic [ref=e127]:
                  - paragraph [ref=e128]: 1. Choisir un pack
                  - paragraph [ref=e129]: Sélectionnez le forfait adapté à votre besoin.
                - generic [ref=e130]:
                  - paragraph [ref=e131]: 2. Saisir son numéro
                  - paragraph [ref=e132]: Indiquez le réseau et le numéro mobile money à débiter.
                - generic [ref=e133]:
                  - paragraph [ref=e134]: 3. Confirmer sur le téléphone
                  - paragraph [ref=e135]: Validez la transaction reçue ; vos crédits sont ajoutés aussitôt.
              - generic [ref=e136]:
                - img [ref=e137]
                - paragraph [ref=e140]: Historique et solde sont mis à jour automatiquement après confirmation du paiement.
              - generic [ref=e141]:
                - img [ref=e142]
                - paragraph [ref=e144]: "Astuce : cliquez sur un pack ci-dessous pour démarrer la recharge."
            - generic [ref=e145]:
              - generic [ref=e146]:
                - generic [ref=e147]:
                  - img [ref=e148]
                  - heading "Packs de Crédits" [level=2] [ref=e152]
                - paragraph [ref=e153]: Rechargez votre solde et profitez d'économies progressives. Plus vous achetez, plus vous économisez !
                - generic [ref=e155]:
                  - img [ref=e156]
                  - paragraph [ref=e158]: Recharge instantanée par mobile money (Airtel Money / Moov Money). Vos crédits sont ajoutés après confirmation du paiement.
              - generic [ref=e159]:
                - button "Choisir le pack Starter - 5 crédits pour 2000 FCFA" [ref=e160] [cursor=pointer]:
                  - generic [ref=e161]:
                    - generic [ref=e162]:
                      - img [ref=e164]
                      - heading "Starter" [level=3] [ref=e166]
                    - generic [ref=e167]:
                      - generic [ref=e168]: "5"
                      - generic [ref=e169]: crédits
                    - generic [ref=e170]:
                      - generic [ref=e172]: 2,000 FCFA
                      - generic [ref=e173]: 400 FCFA par crédit
                    - generic [ref=e174]:
                      - generic [ref=e175]: Idéal pour tester
                      - generic [ref=e177]: Support standard
                    - generic [ref=e179]: Choisir ce pack
                - button "Choisir le pack Standard - 10 crédits pour 3500 FCFA" [ref=e180] [cursor=pointer]:
                  - generic [ref=e182]: POPULAIRE
                  - generic [ref=e183]:
                    - generic [ref=e184]:
                      - img [ref=e186]
                      - heading "Standard" [level=3] [ref=e188]
                    - generic [ref=e189]:
                      - generic [ref=e190]: "10"
                      - generic [ref=e191]: crédits
                    - generic [ref=e192]:
                      - generic [ref=e193]:
                        - generic [ref=e194]: 4,000 FCFA
                        - generic [ref=e195]: 3,500 FCFA
                      - generic [ref=e196]: 350 FCFA par crédit
                    - generic [ref=e197]:
                      - generic [ref=e198]: Pack le plus choisi
                      - generic [ref=e200]: Support prioritaire
                      - generic [ref=e202]: Économique
                    - generic [ref=e204]: Choisir ce pack
                    - generic [ref=e205]: Économisez 12.5% par rapport au pack de base
                - button "Choisir le pack Avancé - 25 crédits pour 7500 FCFA" [ref=e206] [cursor=pointer]:
                  - generic [ref=e208]: 25% D'ÉCONOMIE
                  - generic [ref=e209]:
                    - generic [ref=e210]:
                      - img [ref=e212]
                      - heading "Avancé" [level=3] [ref=e215]
                    - generic [ref=e216]:
                      - generic [ref=e217]: "25"
                      - generic [ref=e218]: crédits
                    - generic [ref=e219]:
                      - generic [ref=e220]:
                        - generic [ref=e221]: 10,000 FCFA
                        - generic [ref=e222]: 7,500 FCFA
                      - generic [ref=e223]: 300 FCFA par crédit
                    - generic [ref=e224]:
                      - generic [ref=e225]: Excellent rapport qualité/prix
                      - generic [ref=e227]: Support prioritaire
                      - generic [ref=e229]: "Bonus: conseils personnalisés"
                    - generic [ref=e231]: Choisir ce pack
                    - generic [ref=e232]: Économisez 25% par rapport au pack de base
                - button "Choisir le pack Premium - 50 crédits pour 12500 FCFA" [ref=e233] [cursor=pointer]:
                  - generic [ref=e235]: MEILLEUR PRIX
                  - generic [ref=e236]:
                    - generic [ref=e237]:
                      - img [ref=e239]
                      - heading "Premium" [level=3] [ref=e241]
                    - generic [ref=e242]:
                      - generic [ref=e243]: "50"
                      - generic [ref=e244]: crédits
                    - generic [ref=e245]:
                      - generic [ref=e246]:
                        - generic [ref=e247]: 20,000 FCFA
                        - generic [ref=e248]: 12,500 FCFA
                      - generic [ref=e249]: 250 FCFA par crédit
                    - generic [ref=e250]:
                      - generic [ref=e251]: Meilleure économie
                      - generic [ref=e253]: Support VIP
                      - generic [ref=e255]: Conseils dédiés
                      - generic [ref=e257]: Accès prioritaire aux nouveautés
                    - generic [ref=e259]: Choisir ce pack
                    - generic [ref=e260]: Économisez 37.5% par rapport au pack de base
              - generic [ref=e262]:
                - img [ref=e264]
                - generic [ref=e268]:
                  - heading "Conseils d'achat" [level=3] [ref=e269]
                  - list [ref=e270]:
                    - listitem [ref=e271]:
                      - strong [ref=e272]: Pack Standard
                      - text: ": Parfait pour débuter, excellent rapport qualité/prix"
                    - listitem [ref=e273]:
                      - strong [ref=e274]: Pack Avancé
                      - text: ": Idéal pour une utilisation régulière avec 25% d'économies"
                    - listitem [ref=e275]:
                      - strong [ref=e276]: Pack Premium
                      - text: ": Maximum d'économies (37.5%) pour les utilisateurs intensifs"
                    - listitem [ref=e277]: Vos crédits n'expirent jamais, achetez en toute sérénité
              - generic [ref=e278]:
                - paragraph [ref=e279]: Paiement sécurisé avec
                - generic [ref=e280]:
                  - img "Airtel Money" [ref=e282]
                  - img "Moov Money" [ref=e284]
            - generic [ref=e285]:
              - generic [ref=e286]:
                - generic [ref=e287]:
                  - img [ref=e288]
                  - heading "Services Premium" [level=2] [ref=e290]
                - paragraph [ref=e291]: Boostez la performance de vos annonces avec nos services premium. Voici le détail des coûts en crédits.
              - generic [ref=e292]:
                - generic [ref=e294]:
                  - generic [ref=e295]:
                    - img [ref=e297]
                    - generic [ref=e300]:
                      - heading "Mise à la une" [level=3] [ref=e301]
                      - generic [ref=e302]: 7 jours
                  - paragraph [ref=e303]: Votre annonce en première position sur la page d'accueil
                  - generic [ref=e305]:
                    - generic [ref=e306]: 15 crédits
                    - generic [ref=e307]: ≈ 5,250 FCFA
                  - generic [ref=e308]:
                    - generic [ref=e309]: "Avantages :"
                    - list [ref=e310]:
                      - listitem [ref=e311]: Visibilité maximale
                      - listitem [ref=e313]: Première position
                      - listitem [ref=e315]: +300% de vues en moyenne
                - generic [ref=e318]:
                  - generic [ref=e319]:
                    - img [ref=e321]
                    - generic [ref=e324]:
                      - heading "Mise en tendance" [level=3] [ref=e325]
                      - generic [ref=e326]: 7 jours
                  - paragraph [ref=e327]: Annonce prioritaire dans les résultats de recherche
                  - generic [ref=e329]:
                    - generic [ref=e330]: 10 crédits
                    - generic [ref=e331]: ≈ 3,500 FCFA
                  - generic [ref=e332]:
                    - generic [ref=e333]: "Avantages :"
                    - list [ref=e334]:
                      - listitem [ref=e335]: Apparition prioritaire
                      - listitem [ref=e337]: Badge "Tendance"
                      - listitem [ref=e339]: +150% de contacts
                - generic [ref=e342]:
                  - generic [ref=e343]:
                    - img [ref=e345]
                    - generic [ref=e348]:
                      - heading "Mise en tendance courte" [level=3] [ref=e349]
                      - generic [ref=e350]: 3 jours
                  - paragraph [ref=e351]: Version courte de la mise en tendance
                  - generic [ref=e353]:
                    - generic [ref=e354]: 5 crédits
                    - generic [ref=e355]: ≈ 2,000 FCFA
                  - generic [ref=e356]:
                    - generic [ref=e357]: "Avantages :"
                    - list [ref=e358]:
                      - listitem [ref=e359]: Boost rapide
                      - listitem [ref=e361]: Idéal pour tester
                      - listitem [ref=e363]: +100% de visibilité
                - generic [ref=e366]:
                  - generic [ref=e367]:
                    - img [ref=e369]
                    - heading "Remonter une annonce" [level=3] [ref=e373]
                  - paragraph [ref=e374]: Remise en haut de liste instantanée
                  - generic [ref=e376]:
                    - generic [ref=e377]: 3 crédits
                    - generic [ref=e378]: ≈ 1,200 FCFA
                  - generic [ref=e379]:
                    - generic [ref=e380]: "Avantages :"
                    - list [ref=e381]:
                      - listitem [ref=e382]: Action immédiate
                      - listitem [ref=e384]: Fraîcheur retrouvée
                      - listitem [ref=e386]: Parfait pour relancer
                - generic [ref=e389]:
                  - generic [ref=e390]:
                    - img [ref=e392]
                    - heading "Assistant IA" [level=3] [ref=e396]
                  - paragraph [ref=e397]: Génération automatique de description optimisée
                  - generic [ref=e399]:
                    - generic [ref=e400]: 1 crédits
                    - generic [ref=e401]: ≈ 350 FCFA
                  - generic [ref=e402]:
                    - generic [ref=e403]: "Avantages :"
                    - list [ref=e404]:
                      - listitem [ref=e405]: Description professionnelle
                      - listitem [ref=e407]: Mots-clés optimisés
                      - listitem [ref=e409]: Gain de temps
              - generic [ref=e412]:
                - generic [ref=e413]:
                  - img [ref=e415]
                  - heading "Optimisez votre retour sur investissement" [level=3] [ref=e418]
                - generic [ref=e419]:
                  - generic [ref=e420]:
                    - heading "Stratégies recommandées :" [level=4] [ref=e421]
                    - list [ref=e422]:
                      - listitem [ref=e423]:
                        - text: Commencez par un
                        - strong [ref=e424]: boost simple (3 crédits)
                        - text: pour tester
                      - listitem [ref=e425]:
                        - text: Utilisez la
                        - strong [ref=e426]: mise en tendance 7j
                        - text: pour les annonces prioritaires
                      - listitem [ref=e427]:
                        - text: Réservez la
                        - strong [ref=e428]: mise à la une
                        - text: pour vos meilleures propriétés
                  - generic [ref=e429]:
                    - heading "Résultats moyens observés :" [level=4] [ref=e430]
                    - list [ref=e431]:
                      - listitem [ref=e432]:
                        - strong [ref=e433]: +300% de vues
                        - text: avec mise à la une
                      - listitem [ref=e434]:
                        - strong [ref=e435]: +150% de contacts
                        - text: avec mise en tendance
                      - listitem [ref=e436]:
                        - strong [ref=e437]: 70% de chances
                        - text: de location sous 15 jours
    - contentinfo [ref=e438]:
      - generic [ref=e439]:
        - generic [ref=e440]:
          - generic [ref=e441]:
            - img [ref=e442]
            - paragraph [ref=e452]: Trouve Ton Nkama simplifie la recherche, la location et la vente de biens immobiliers au Gabon.
          - navigation [ref=e453]:
            - heading "Liens utiles" [level=2] [ref=e454]
            - list [ref=e455]:
              - listitem [ref=e456]:
                - link "À propos" [ref=e457] [cursor=pointer]:
                  - /url: https://www.facebook.com/profile.php?id=61574099562451
              - listitem [ref=e458]:
                - link "Blog" [ref=e459] [cursor=pointer]:
                  - /url: /blog
              - listitem [ref=e460]:
                - link "Immobilier Gabon" [ref=e461] [cursor=pointer]:
                  - /url: /immobilier
              - listitem [ref=e462]:
                - link "Maisons à louer" [ref=e463] [cursor=pointer]:
                  - /url: /immobilier/location/maison
              - listitem [ref=e464]:
                - link "Maisons à vendre" [ref=e465] [cursor=pointer]:
                  - /url: /immobilier/vente/maison
              - listitem [ref=e466]:
                - link "Guide Immobilier" [ref=e467] [cursor=pointer]:
                  - /url: /guide-immobilier-gabon
              - listitem [ref=e468]:
                - link "Faire de la pub" [ref=e469] [cursor=pointer]:
                  - /url: /faire-de-la-pub
              - listitem [ref=e470]:
                - link "Demandes de recherche" [ref=e471] [cursor=pointer]:
                  - /url: /demandes-recherche
              - listitem [ref=e472]:
                - link "Politique de confidentialité" [ref=e473] [cursor=pointer]:
                  - /url: /privacy-policy
              - listitem [ref=e474]:
                - link "Conditions d'utilisation" [ref=e475] [cursor=pointer]:
                  - /url: /terms-of-use
              - listitem [ref=e476]:
                - link "Conditions annonceur" [ref=e477] [cursor=pointer]:
                  - /url: /announcer-terms
          - generic [ref=e478]:
            - heading "Contact" [level=2] [ref=e479]
            - generic [ref=e480]:
              - generic [ref=e481]:
                - img [ref=e482]
                - generic [ref=e485]: Libreville, Gabon
              - generic [ref=e486]:
                - img [ref=e487]
                - link "glenneriss@gmail.com" [ref=e490] [cursor=pointer]:
                  - /url: mailto:glenneriss@gmail.com
              - generic [ref=e491]:
                - img [ref=e492]
                - link "Suivez-nous sur Facebook" [ref=e494] [cursor=pointer]:
                  - /url: https://www.facebook.com/share/16beeh915e/
              - generic [ref=e495]:
                - img [ref=e496]
                - link "Contactez-nous sur WhatsApp" [ref=e498] [cursor=pointer]:
                  - /url: "#"
              - generic [ref=e499]:
                - img [ref=e500]
                - link "Rejoignez notre chaîne" [ref=e506] [cursor=pointer]:
                  - /url: https://whatsapp.com/channel/0029Vb8Pdzv3wtb4UbkmPX0z
              - generic [ref=e507]:
                - img [ref=e508]
                - link "Suivez-nous sur TikTok" [ref=e511] [cursor=pointer]:
                  - /url: https://www.tiktok.com/@tonnkama?is_from_webapp=1&sender_device=pc
        - separator [ref=e512]
        - generic [ref=e513]:
          - text: © 2026
          - link "Trouve Ton Nkama" [ref=e514] [cursor=pointer]:
            - /url: /
          - text: . Tous droits réservés.
    - region "Notifications (F8)":
      - list
  - alert [ref=e515]
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