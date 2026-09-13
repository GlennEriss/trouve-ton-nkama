# Audit AdSense et plan d'optimisation des revenus

## 1. Objet

Ce document analyse l'intégration Google AdSense de `apps/location-maison` à la suite du constat
suivant : la plateforme reçoit un trafic significatif, mais les revenus publicitaires restent
faibles.

L'objectif n'est pas d'ajouter immédiatement davantage de publicités. Il faut d'abord déterminer
où se situe la perte entre trafic, requêtes publicitaires, remplissage, impressions visibles,
clics et RPM.

Statut : **audit code effectué ; analyse du compte AdSense et des données sur 30 jours requise
avant toute modification des emplacements**.

## 2. Périmètre

### Inclus

- chargement du script AdSense ;
- composants de rendu des unités manuelles ;
- emplacements accueil, recherche, immobilier, détail, recherche IA, footer et Reels ;
- coexistence AdSense/régie first-party ;
- variables d'environnement ;
- `ads.txt` ;
- événements internes de slots ;
- synchronisation des rapports AdSense ;
- consentement publicitaire visible dans le dépôt ;
- tests et plan d'expérimentation.

### Exclu à ce stade

- modification du compte AdSense ;
- création d'une unité Google ;
- modification de la densité en production ;
- clic réel sur une publicité ;
- promesse de revenu ou estimation sans données du compte ;
- refonte de la tarification de la régie first-party.

## 3. Architecture actuelle

```text
app/layout.tsx
  -> AdSenseRouteLoader
       -> charge adsbygoogle.js hors parcours de publication

pages/composants
  -> SponsoredSlot
       -> campagne first-party si disponible
       -> InlineAdUnit toujours rendu
            -> AdSenseBlock
                 -> <ins class="adsbygoogle">
                 -> adsbygoogle.push({})
                 -> observation data-ad-status

AdSense Reporting API
  -> Cloud Function syncAdSenseToAdminAnalytics
  -> adaptateur analytics admin
  -> rapports revenus/RPM/remplissage/visibilité
```

Fichiers structurants :

- `src/app/layout.tsx` ;
- `src/components/ads/AdSenseRouteLoader.tsx` ;
- `src/components/ads/AdSenseBlock.tsx` ;
- `src/components/ads/InlineAdUnit.tsx` ;
- `src/components/ads/SponsoredSlot.tsx` ;
- `src/lib/ads/config.ts` ;
- `src/features/analytics/ads/services/ads-slot-analytics.client.ts` ;
- `functions/src/analytics/adsense-sync.ts` ;
- `public/ads.txt`.

## 4. Éléments correctement implémentés

1. `ads.txt` existe et référence le compte éditeur utilisé par défaut.
2. Le script Google est chargé en `afterInteractive` et de façon asynchrone.
3. Les formulaires de création d'annonce possèdent un hard-stop publicitaire.
4. Les slots manuels utilisent `data-ad-client`, `data-ad-slot`, format et responsive.
5. Les slots `unfilled` et leurs conteneurs sont masqués pour éviter les blocs blancs.
6. Le double `adsbygoogle.push()` causé par la résolution de session a été corrigé et couvert par
   `adsense-block.test.tsx`.
7. Les identifiants de slots dédiés sont configurables par environnement.
8. La synchronisation AdSense demande les dimensions date, page, unité, pays et appareil.
9. Les métriques Google collectées couvrent revenus, pages vues, requêtes, requêtes remplies,
   impressions, clics, RPM et Active View.
10. La régie first-party possède une mesure séparée de ses impressions et clics.

Ces points rendent l'intégration exploitable. Ils ne garantissent pas que l'inventaire soit bien
valorisé ni que les métriques internes représentent exactement la mesure Google.

## 5. Constats et risques prioritaires

### 5.1 P0 — unité Reels dédiée absente de la configuration

Le code définit `NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE`, mais cette variable n'est présente dans
aucun des fichiers d'environnement inspectés. `ADSENSE_SLOTS.reelsInline` retombe donc sur le
slot Footer.

Conséquences :

- format Footer utilisé dans un contexte rectangle plein écran ;
- rapports AdSense incapables d'isoler proprement les Reels ;
- optimisation Google fondée sur un historique d'emplacement différent ;
- diagnostic RPM/viewability par surface faussé.

Action externe nécessaire : créer une unité AdSense destinée aux Reels, puis renseigner son ID
dans développement, préproduction et production. Le code ne peut pas inventer cet identifiant.

Tests après configuration : vérifier `data-ad-slot` en environnement cible, statut `filled` ou
`unfilled`, absence de warning console, fallback après 6,5 secondes et absence de rupture du
scroll vertical.

### 5.2 P0 — `filled` est enregistré comme une impression interne

Le `MutationObserver` de `AdSenseBlock` émet `ad_filled` puis immédiatement `ad_impression`
lorsque Google pose `data-ad-status="filled"`.

Or `filled` prouve qu'une création a été servie dans le slot, pas que l'utilisateur l'a vue. La
mesure Active View de Google considère une publicité visible lorsque 50 % de sa surface reste à
l'écran pendant au moins une seconde.

Conséquence : l'analytics interne peut surestimer les impressions et sous-estimer artificiellement
CTR ou revenu par impression lorsque comparé aux rapports Google.

Action recommandée :

- conserver `ad_filled` sur changement d'attribut ;
- émettre une métrique distincte `ad_viewable_impression` via `IntersectionObserver` avec seuil
  0,5 et temporisation continue d'une seconde ;
- réserver `ad_impression` à une définition explicitement choisie, ou le renommer pour éviter
  l'ambiguïté ;
- considérer AdSense Reporting comme source de vérité financière.

Référence officielle :
https://support.google.com/adsense/answer/3481946?hl=en

### 5.3 P0 — manque de classification analytics pour Reels et certains écrans

`inferPageTemplate` ne possède pas de cas Reels et retourne `other`. `inferSlotPosition` ne
reconnaît pas les clés `ad-*` des diapositives Reels et retourne souvent `unknown`.

Le `source` réutilise une taxonomie de présence/recherche ne contenant que trois valeurs ; les
pages accueil, détail et Reels peuvent donc recevoir une source techniquement valide mais
sémantiquement imprécise.

Action recommandée : créer une taxonomie publicitaire propre :

```text
page_template: home | catalog_search | immobilier_landing | property_detail |
               search_with_ia | reels_feed | blog | other
slot_position: home_inline | in_feed | detail_inline | reels_fullscreen |
               footer | other
```

Les changements doivent être propagés au schéma Zod de la route, à l'adaptateur admin, aux tables
et aux tests avant leur émission par le client.

### 5.4 P1 — campagne maison et AdSense systématiquement empilés

`SponsoredSlot` affiche une campagne first-party éligible puis rend toujours l'unité AdSense.
AdSense n'est donc pas un fallback : deux publicités peuvent se suivre.

Risques :

- l'unité Google est poussée plus bas et devient moins visible ;
- densité publicitaire et fatigue utilisateur ;
- comparaison économique impossible entre inventaire vendu directement et AdSense ;
- une campagne maison peut capter l'attention et réduire le CTR Google.

Aucune modification ne doit être faite sans expérience. Comparer au minimum :

- A : empilement actuel ;
- B : alternance first-party/AdSense ;
- C : emplacements réservés à chaque inventaire ;
- D : first-party prioritaire et AdSense seulement sans campagne.

La métrique de décision doit être le revenu total par mille sessions, incluant revenu direct
amorti de la campagne maison et revenu AdSense, avec garde-fous UX.

### 5.5 P1 — Footer utilisé comme fallback générique

Le slot Footer est réutilisé par défaut lorsque certains slots manquent. Il sert explicitement à
l'accueil mobile et implicitement aux Reels faute de configuration.

Une publicité de footer est généralement moins visible si l'utilisateur ne termine pas la page.
Elle ne doit pas devenir l'identité générique d'emplacements plus stratégiques.

Action : interdire les fallbacks silencieux en production. La configuration doit échouer au build
ou produire une alerte explicite lorsqu'un slot requis manque. Un fallback ne peut être accepté
que pour développement/test.

### 5.6 P1 — couverture de l'accueil à confirmer

Un emplacement explicite a été trouvé dans `HomePageMobileComponent`. L'équivalence desktop et
la part réelle de trafic passant par chaque composant doivent être vérifiées avec rendu et
analytics.

Action : établir une matrice route × breakpoint × slot rendu. Une page vue ne doit être qualifiée
de monétisée que si au moins une requête publicitaire a réellement été envoyée.

### 5.7 P1 — consentement/CMP non visible dans le dépôt

Aucun composant CMP, Consent Mode ou dialogue publicitaire n'a été identifié dans le code audité.
Une CMP peut toutefois être configurée directement dans l'interface AdSense ; ce point doit donc
être vérifié dans le compte avant de conclure à une absence réelle.

Pour les utilisateurs de l'EEE, du Royaume-Uni et de Suisse, Google exige une CMP certifiée
intégrée au TCF pour servir des publicités personnalisées.

Actions :

- vérifier `Privacy & messaging` dans AdSense ;
- mesurer la part de trafic EEE/Royaume-Uni/Suisse ;
- vérifier taux de consentement et part personnalisée/non personnalisée ;
- documenter le comportement avant consentement ;
- ajouter un E2E géolocalisé ou simulé si une CMP est utilisée.

Références officielles :

- https://support.google.com/adsense/answer/13554020?hl=en
- https://support.google.com/adsense/answer/7670013?hl=en-GB

### 5.8 P1 — fréquences définies sans preuve expérimentale

Cadences actuelles :

| Surface | Première publicité | Récurrence |
|---|---:|---:|
| Recherche mobile | après la 6e annonce | toutes les 10 annonces |
| Recherche desktop | après la 8e annonce | toutes les 12 annonces |
| Pages immobilier | après la 8e annonce | toutes les 14 annonces |
| Reels | après 4 vidéos | toutes les 4 vidéos, alternance Google/maison |

Ces valeurs sont plausibles mais ne sont pas validées par une expérience contrôlée. Ne pas les
modifier toutes simultanément.

Google permet de tester Auto Ads, formats et charge publicitaire avec ses expérimentations :
https://support.google.com/adsense/answer/6321879?hl=en

## 6. Modèle de diagnostic financier

```text
revenu = pages vues
       × requêtes publicitaires par page
       × taux de remplissage
       × taux d'impressions rendues
       × valeur moyenne de l'impression
```

Le revenu peut rester faible malgré de nombreux visiteurs si les sessions ont peu de pages, si
les slots sont sous la ligne de flottaison, si le trafic est principalement mobile, si la demande
annonceur est faible dans le pays ou si une part importante des requêtes n'est pas remplie.

Ne pas conclure que « le Gabon paie peu » sans segmenter les rapports par pays. Cette hypothèse
doit être mesurée par `dimension_country`, RPM et match rate.

## 7. Données indispensables sur 30 jours

Extraire J-1 à J-30 par unité, page, pays et appareil :

| KPI | Calcul/Source | Diagnostic |
|---|---|---|
| Pages vues | AdSense + trafic interne | taille monétisable |
| Sessions | analytics plateforme | profondeur de visite |
| Requêtes | AdSense | pression publicitaire |
| Match rate | matched requests / requests | demande/remplissage |
| Impressions | AdSense | créations réellement comptées |
| Pages monétisées | pages avec requête / pages vues | couverture technique |
| Active View | AdSense | visibilité réelle |
| CTR | clics / impressions | interaction |
| CPC moyen | revenus CPC / clics si disponible | valeur du clic |
| Impression RPM | AdSense | valeur d'inventaire |
| Page RPM | AdSense | rendement global page |
| Revenu/1 000 sessions | revenu / sessions | KPI produit transversal |

Vérifier également : restrictions de diffusion, trafic invalide, ad blockers estimés, statut du
site, alertes de politique et évolution quotidienne.

## 8. Arbre de décision

```text
Peu de requêtes par page ?
  -> vérifier couverture des routes et slots réellement montés

Beaucoup de requêtes mais faible match rate ?
  -> vérifier consentement, restrictions, pays, formats et demande

Bon match rate mais peu d'impressions ?
  -> vérifier rendu, navigation SPA, slots unfilled et erreurs console

Bonnes impressions mais faible Active View ?
  -> déplacer/tester les emplacements, améliorer vitesse et éviter empilement

Bonne visibilité mais faible CTR ?
  -> formats/contexte/qualité audience, sans incitation au clic

CTR correct mais RPM faible ?
  -> valeur géographique/annonceurs, catégories bloquées, concurrence de demande
```

## 9. Plan d'intervention

### Lot 0 — vérité des données

1. Vérifier que la synchronisation quotidienne AdSense termine avec des lignes.
2. Comparer un jour du dashboard admin au rapport officiel AdSense.
3. Corriger taxonomie Reels/page/position.
4. Séparer `filled` et impression visible.
5. Produire le rapport de référence sur 30 jours.

Gate : écart financier et d'impressions compris et documenté.

### Lot 1 — configuration

1. Créer le slot Reels dans AdSense.
2. Renseigner `NEXT_PUBLIC_ADSENSE_SLOT_REELS_INLINE` partout.
3. Ajouter une validation de configuration par environnement.
4. Vérifier CMP et éventuelles limitations du compte.

Gate : chaque surface possède un slot identifiable et aucun fallback silencieux en production.

### Lot 2 — visibilité

1. Mesurer chaque slot avec IntersectionObserver interne.
2. Identifier les pages à fort trafic et faible Active View.
3. Choisir un seul changement de placement.
4. Exécuter une expérience 7 à 14 jours minimum, plus longtemps si volume insuffisant.

Google recommande de placer les annonces dans des zones riches en contenu et d'analyser la ligne
de flottaison et les tailles d'écran :
https://support.google.com/adsense/answer/6219980?hl=en

### Lot 3 — arbitrage régie maison/Google

Comparer empilement, alternance et inventaire réservé avec revenu total, CTR, Active View,
performance des campagnes maison, engagement produit et Core Web Vitals.

### Lot 4 — expérimentation AdSense

Tester une variation à la fois : Auto Ads contrôlé, formats, charge ou placement. Ne pas activer
automatiquement tous les formats overlay. Utiliser exclusions de pages et zones pour protéger les
formulaires et parcours sensibles.

Référence Auto Ads : https://support.google.com/adsense/answer/9305577?hl=en

## 10. Tests à préserver

- `__tests__/components/adsense-block.test.tsx` : push unique et nouveau slot ;
- `__tests__/components/advertising-serving.test.tsx` : coexistence inventaires ;
- `__tests__/api/advertising-serving.test.ts` : serving first-party ;
- `__tests__/api/analytics-adsense-report.test.ts` : forwarding rapports ;
- tests de routes/formulaires sans AdSense ;
- tests Reels fallback `unfilled` ;
- tests E2E qui ne cliquent jamais une vraie publicité.

## 11. Nouveaux tests nécessaires

### Configuration

1. toutes les variables requises existent en production ;
2. le slot Reels ne retombe pas sur Footer ;
3. les IDs attendus sont distincts ;
4. aucune valeur de test n'est utilisée en production.

### Rendu

1. `filled` émet `ad_filled`, pas une vue par défaut ;
2. 50 % visible moins d'une seconde n'émet pas de vue ;
3. 50 % visible pendant une seconde émet une seule vue ;
4. sortie puis retour dans le viewport ne duplique pas l'événement dans la fenêtre ;
5. démontage nettoie observer et timer ;
6. `unfilled` reste masqué ;
7. navigation SPA crée un nouveau slot sans double push.

### Taxonomie

1. `/reels` devient `reels_feed/reels_fullscreen` ;
2. `/annonce/{id}` devient `property_detail/detail_inline` ;
3. `/search` mobile et desktop deviennent `catalog_search/in_feed` ;
4. accueil, blog et footer sont distingués ;
5. schémas client, route et admin acceptent exactement les mêmes valeurs.

### E2E

1. slots présents aux cadences attendues ;
2. aucun slot sur création/modification d'annonce ;
3. Reels rempli n'affiche pas le fallback ;
4. Reels non rempli affiche le fallback après délai ;
5. campagne maison et AdSense suivent la variante expérimentale ;
6. aucune erreur `already have ads in them` ;
7. aucun clic automatisé sur une création Google.

## 12. Garde-fous

- Ne jamais inciter l'utilisateur à cliquer sur une publicité Google.
- Ne jamais cliquer sur les annonces réelles pendant les tests.
- Ne pas augmenter simultanément densité et formats overlay.
- Ne pas mélanger revenus estimés AdSense et revenus first-party sans convention comptable.
- Ne pas optimiser uniquement le CTR : surveiller départs, durée, conversion produit et CWV.
- Conserver les formulaires et paiements sans publicité.
- Utiliser le rapport Google comme source de vérité financière.

## 13. Checklist avant implémentation

- [ ] Rapport AdSense 30 jours exporté par unité/pays/appareil/page.
- [ ] Synchronisation admin comparée au rapport Google.
- [ ] Match rate, Active View, page RPM et impression RPM analysés.
- [ ] Part mobile et pays principaux identifiés.
- [ ] Alertes de politique et trafic invalide vérifiées.
- [ ] CMP AdSense ou tierce vérifiée.
- [ ] Slot Reels créé dans le compte Google.
- [ ] Hypothèse du premier test choisie.
- [ ] Métrique principale et garde-fous définis.
- [ ] Durée et seuil de décision de l'expérience définis.

## 14. Décision recommandée à ce stade

Ne pas augmenter la quantité de publicités avant le lot 0. Commencer par fiabiliser la mesure et
segmenter les revenus. Le premier correctif technique probable est le slot Reels dédié ; le
premier test produit probable est l'alternance régie maison/AdSense contre l'empilement actuel.

