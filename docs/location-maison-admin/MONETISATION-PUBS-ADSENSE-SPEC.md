# Monétisation Pubs (AdSense) - Suivi Revenus & Performance

## 1. Contexte et objectif

Constat actuel:

- des pubs AdSense sont deja integrees sur `location-maison`
- le revenu observe est faible (exemple mentionne: `1,40 EUR`)
- il manque une visibilite claire entre `trafic`, `placements pub` et `revenu`

Objectif:

- centraliser dans le dashboard admin un suivi business de la monetisation pub
- comprendre quels emplacements/pages rapportent vraiment
- piloter des optimisations mesurables pour augmenter le revenu

Ce document est **documentation-only** (pas de code).

## 2. Questions metier a repondre

- Combien la plateforme a genere aujourd'hui, sur 7 jours, 30 jours, MTD?
- Le revenu augmente-t-il avec le trafic ou non?
- Quelles pages ont du trafic mais un RPM faible?
- Quels emplacements pub ont de mauvaises performances (CTR, viewability, fill rate)?
- Quelles integrations pub doivent etre corrigees en priorite?

## 3. KPI monetisation (MVP)

## 3.1 KPI business (niveau direction)

- `estimated_earnings` (EUR) par jour / semaine / mois
- `page_views_rpm` (revenu pour 1000 pages vues)
- `impressions_rpm` (revenu pour 1000 impressions)
- `revenue_per_1k_sessions` (derive: revenus / sessions * 1000)

## 3.2 KPI performance pub (niveau optimisation)

- `ad_requests`
- `matched_ad_requests`
- `ad_requests_coverage` (fill rate)
- `total_impressions`
- `clicks`
- `ad_requests_ctr`
- `active_view_viewability`
- `active_view_measurability`

## 3.3 KPI diagnostic (niveau qualite integration)

- taux pages monétisées = pages avec au moins un slot pub visible / pages vues
- taux d'emplacements silencieux = slots rendus sans requete pub
- latence moyenne chargement pub par slot

## 4. Dimensions d'analyse

- periode: jour, semaine, mois
- environnement: `dev`, `prod` (reporting metier principal en `prod`)
- page: `page_path`, `page_template` (`home`, `catalog`, `detail_annonce`, etc.)
- emplacement pub: `slot_id`, `slot_position` (`top`, `in_feed`, `sidebar`, `footer`, etc.)
- device: `mobile`, `desktop`, `tablet`
- geo: `country`
- source trafic: `organic`, `direct`, `social`, `referral` (si disponible)

## 5. Architecture data cible

## 5.1 Sources

- AdSense Reporting API: source de verite revenus/monetisation
- Firebase/Vercel analytics: trafic sessions/pages
- Events internes plateforme: instrumentation slot-level (affichage, requete, rendu, clic)

## 5.2 Tables BigQuery proposees

### `adsense_reporting_raw`

But: stock brut des lignes de reporting AdSense.

Champs minimaux:

- `report_date` (date)
- `account_id` (string)
- `dimension_page_url` (string, nullable)
- `dimension_ad_unit` (string, nullable)
- `dimension_country` (string, nullable)
- `dimension_device` (string, nullable)
- `estimated_earnings` (numeric)
- `page_views` (int)
- `ad_requests` (int)
- `matched_ad_requests` (int)
- `total_impressions` (int)
- `clicks` (int)
- `page_views_rpm` (numeric)
- `impressions_rpm` (numeric)
- `active_view_viewability` (numeric)
- `active_view_measurability` (numeric)
- `loaded_at` (timestamp)

### `ads_slot_events`

But: observabilite fine de l'integration pub cote plateforme.

Champs minimaux:

- `event_id` (string, PK)
- `occurred_at` (timestamp)
- `date_key` (date)
- `session_id` (string)
- `page_path` (string)
- `page_template` (string)
- `slot_id` (string)
- `slot_position` (string)
- `event_name` (enum: `ad_slot_rendered`, `ad_request_sent`, `ad_filled`, `ad_impression`, `ad_click`)
- `latency_ms` (int, nullable)
- `is_authenticated` (bool, nullable)
- `country` (string, nullable)
- `device_category` (string, nullable)

### `ads_metrics_daily`

But: table agregee dashboard.

Champs minimaux:

- `date_key` (date)
- `page_template` (string)
- `slot_id` (string, nullable)
- `device_category` (string, nullable)
- `country` (string, nullable)
- `estimated_earnings` (numeric)
- `page_views` (int)
- `sessions` (int)
- `ad_requests` (int)
- `matched_ad_requests` (int)
- `total_impressions` (int)
- `clicks` (int)
- `fill_rate` (numeric)
- `ctr` (numeric)
- `page_views_rpm` (numeric)
- `impressions_rpm` (numeric)
- `active_view_viewability` (numeric)
- `updated_at` (timestamp)

### `ads_revenue_vs_traffic_daily`

But: comparer revenu et trafic sur une meme timeline.

Champs minimaux:

- `date_key` (date)
- `estimated_earnings` (numeric)
- `sessions` (int)
- `page_views` (int)
- `revenue_per_1k_sessions` (numeric)
- `page_views_rpm` (numeric)
- `delta_revenue_vs_prev_day` (numeric)
- `delta_rpm_vs_prev_day` (numeric)

## 6. Ecrans dashboard admin (module monetisation)

## 6.1 Vue "Revenus Pubs"

- KPI cards: revenus jour, 7j, 30j, MTD
- courbe revenus journaliers
- courbe RPM (pages/impressions)
- comparaison revenus vs trafic

## 6.2 Vue "Performance Emplacements"

- tableau par `slot_id` et `slot_position`
- colonnes: requests, fill rate, impressions, CTR, RPM, viewability
- tri pour identifier rapidement les emplacements faibles

## 6.3 Vue "Pages Monétisation"

- performance par `page_template` et `page_path`
- identification des pages a fort trafic et faible revenu
- priorisation des optimisations par impact potentiel

## 6.4 Vue "Alertes"

- baisse revenu > seuil sur 3 jours
- chute fill rate
- chute viewability
- chute CTR
- alerte absence de donnees AdSense (pipeline KO)

## 7. Regles metier et garde-fous

- Les revenus AdSense recents sont des estimations et peuvent etre ajustes.
- Le pilotage de reference hebdomadaire se fait sur `J-1` minimum.
- Aucun arbitrage de revenu sans regarder en meme temps la qualite UX.
- Toute modification majeure placement pub doit etre tracee (changelog).

## 8. Boucle d'optimisation recommandee

Hebdo:

1. Identifier top 3 pages a fort trafic et RPM faible.
2. Identifier top 3 slots a fill rate/viewability faible.
3. Definir 1 a 2 hypotheses d'amelioration maximum.
4. Tester sur une periode courte (7 a 14 jours).
5. Mesurer impact (revenu, RPM, CTR, UX) avant generalisation.

## 9. Scope MVP vs Phase 2

MVP:

- collecte revenus AdSense journaliere
- dashboard revenus + RPM + comparaison trafic
- performance par page_template
- alertes simples de chute

Phase 2:

- performance fine par slot_id complet
- experimentation A/B sur placements
- recommandations automatiques d'optimisation

## 10. Permissions RBAC a prevoir

- `ads_analytics.read`
- `ads_analytics.export`
- `ads_analytics.alerts.read`
- `ads_analytics.alerts.manage` (super_admin / operations_admin)

## 11. Endpoints cibles (fonctionnels)

- `GET /api/admin/v1/analytics/ads/overview?range=7d`
- `GET /api/admin/v1/analytics/ads/revenue-timeseries?range=30d`
- `GET /api/admin/v1/analytics/ads/placements?range=30d`
- `GET /api/admin/v1/analytics/ads/pages?range=30d`
- `GET /api/admin/v1/analytics/ads/alerts?range=30d`
- `GET /api/admin/v1/analytics/ads/export?range=30d&format=csv`

## 12. Strategie d affichage AdSense (operatoire 2026)

Contexte actuel:

- Le mode `Par site` (Auto ads) est actif et genere des placements juges trop intrusifs/desordonnes.
- Le mode `Par bloc d annonces` est plus controle et mieux aligne avec le design du produit.

Decision recommandee (priorite UX + controle):

- Basculer en strategie `Ad units first`.
- `Par site` (Auto ads): desactive pour `tonnkama.com`.
- `Par bloc d annonces`: conserve et pilote par slot/page.

Option de secours (si Auto ads doit rester active pour test):

- Couper `Overlay formats` en premier: `Anchor`, `Vignette`, `Side rail`.
- Couper `Optimize existing ads` pour eviter les collisions avec nos blocs manuels.
- Mettre une `ad load` faible et utiliser `Page exclusions` + `Excluded areas`.

References Google (officielles):

- `Set up ads on your site` (choix Auto ads vs ad units): https://support.google.com/adsense/answer/7037624?hl=en
- `Auto ads settings` (off switch + overlay/in-page controls): https://support.google.com/adsense/answer/9305577?hl=en
- `Exclude specific pages`: https://support.google.com/adsense/answer/9262311?hl=en
- `Exclude areas`: https://support.google.com/adsense/answer/12626543?hl=en
- `Use data-ad-status for unfilled`: https://support.google.com/adsense/answer/10762946?hl=en

## 13. Matrice des pages monetisables (source de verite produit)

Regle globale:

- On monetise les pages de consultation de contenu (intention immobiliere).
- On evite les pages de tunnel, compte, moderation, formulaires et ecrans a faible valeur contenu.

Pages avec annonces (OUI):

- `/` (home): 1 slot footer max.
- `/search`: in-feed (slots manuels) + footer discret.
- `/houseDetails/[id]`: 1 slot inline dans le flux contenu.
- `/immobilier/*`: in-feed dans la grille + footer discret.
- `/blog` et `/blog/*`: footer discret (phase 1), puis In-Article (phase 2).
- `/search-with-ia`: 1 slot apres grille resultats (pas dans la zone chat).

Pages sans annonces (NON):

- `/signin`, `/signup`, `/signin-signup`, `/complete-profile`, reset password.
- `/property/*` (back-office annonceur, creation, modification, stats).
- `/profil/*`, `/my-balance/*`, pages de support interne/admin.
- Ecrans "dead-end" et ecrans de communication privee.

Reference policy (inventory value):

- https://support.google.com/publisherpolicies/answer/11112688?hl=en-GB
- https://support.google.com/adsense/answer/1346295?hl=en

## 14. Matrice par device (Desktop / Tablet / Mobile)

Note:

- AdSense ne se configure pas par OS (iOS vs Android) au niveau "type d annonce". Le pilotage principal se fait par layout responsive + viewport.
- iOS/Android restent des sous-cas QA UX (safe-area, viewport, overlap), pas des placements AdSense distincts.

### 14.1 Desktop (>= 1024px)

- `/search`: premiere insertion apres 8e carte environ, puis toutes les 12 cartes.
- `/immobilier/*`: premiere insertion apres 8e carte environ, puis toutes les 14 cartes.
- `/houseDetails/[id]`: 1 bloc entre detail et recommandations.
- `/blog/*`: footer discret; pas d overlay.
- Overlay Auto ads: OFF (Anchor/Vignette/Side rail) si mode manuel.

### 14.2 Tablet (768px - 1023px)

- Meme slots que desktop mais cadence equivalent mobile (densite plus faible).
- Pas d empilement de 2 pubs consecutives.
- Priorite a la lisibilite de la carte annonce (photo + prix + CTA).

### 14.3 Mobile (<= 767px)

- `/search`: premiere insertion apres 6e carte environ, puis toutes les 10 cartes.
- `/immobilier/*`: meme logique que search mobile, avec ecart suffisant.
- `/houseDetails/[id]`: 1 bloc compact apres la section hero/details.
- `/search-with-ia`: pas de pub dans la conversation; pub uniquement apres resultats.
- Overlay formats: OFF recommande (surtout vignette) pour limiter fatigue UX.

### 14.4 iOS vs Android (regles QA)

- Regle business identique (pas de slots differents par OS).
- QA iOS Safari: verifier safe-area bottom et absence de chevauchement CTA sticky/navigation.
- QA Android Chrome: verifier hauteur viewport dynamique et sauts de layout.
- Dans tous les cas: conserver des slots responsive et eviter tailles fixes agressives.

Reference formats:

- Display responsive: https://support.google.com/adsense/answer/9274025?hl=en
- Responsive behavior: https://support.google.com/adsense/answer/9183362?hl=en
- In-feed: https://support.google.com/adsense/answer/9189557?hl=en
- Placement In-feed: https://support.google.com/adsense/answer/9189560?hl=en
- In-article: https://support.google.com/adsense/answer/9274522?hl=en
- Multiplex: https://support.google.com/adsense/answer/9189566?hl=en

## 15. Slots standards a maintenir (naming + env)

Slots actifs cibles:

- `NEXT_PUBLIC_ADSENSE_CLIENT`
- `NEXT_PUBLIC_ADSENSE_SLOT_FOOTER`
- `NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_INLINE`
- `NEXT_PUBLIC_ADSENSE_SLOT_PROPERTY_DETAIL`
- `NEXT_PUBLIC_ADSENSE_SLOT_SEARCH_AI`
- `NEXT_PUBLIC_ADSENSE_SLOT_IMMOBILIER_INLINE`

Convention de nommage AdSense recommandee:

- `LM_FOOTER_DISPLAY_H`
- `LM_SEARCH_INLINE_DISPLAY_H`
- `LM_PROPERTY_DETAIL_DISPLAY_H`
- `LM_SEARCH_AI_DISPLAY_H`
- `LM_IMMOBILIER_INLINE_DISPLAY_H`

Regle:

- 1 emplacement produit = 1 ad unit AdSense dediee.
- Format `Display` responsive par defaut pour les emplacements actuels.

## 16. Checklist de configuration AdSense (pas a pas)

### 16.1 Onglet `Par site` (tonnkama.com)

Scenario recommande (controle maximal):

1. `Ads` -> `Par site` -> `tonnkama.com` -> `Edit`.
2. `Auto ads` -> OFF.
3. `Apply to site` -> `Apply now` -> `Save`.

Scenario hybride (si tu gardes Auto ads pour test):

1. `Overlay formats`: OFF (`Anchor`, `Vignette`, `Side rail`).
2. `In-page formats`: OFF `Banner` et OFF `Multiplex` (car on gere via blocs manuels).
3. `Optimize existing ads`: OFF.
4. `Page exclusions`: ajouter les sections non monetisables.
5. `Excluded areas`: exclure header/nav/hero si necessaire.
6. `Apply to site`.

### 16.2 Onglet `Par bloc d annonces`

1. Verifier que chaque slot cle existe et n est pas archive.
2. Garder `Display` responsive pour les slots deja implementes.
3. Ouvrir `View report` par ad unit et suivre `impressions`, `CTR`, `page RPM`, `coverage`.

## 17. Exclusions de pages recommandes (si Auto ads reste ON)

Ajouter au minimum:

- `https://www.tonnkama.com/signin`
- `https://www.tonnkama.com/signup`
- `https://www.tonnkama.com/signin-signup`
- `https://www.tonnkama.com/complete-profile`
- `https://www.tonnkama.com/property`
- `https://www.tonnkama.com/property/add`
- `https://www.tonnkama.com/property/modify`
- `https://www.tonnkama.com/profil`
- `https://www.tonnkama.com/my-balance`

Important:

- Les exclusions Auto ads n acceptent pas les URL avec query params/fragment.
- Distinguer `This page only` vs `All pages under this section`.
- Delai de propagation annonce par Google: jusqu a ~1h.

Reference:

- https://support.google.com/adsense/answer/9262311?hl=en

## 18. Plan de suivi post-config (14 jours)

Objectif:

- Verifier qu on a moins de bruit visuel et un RPM plus stable.

Semaine 1:

1. Appliquer la configuration cible.
2. Laisser tourner 3-4 jours sans autre changement.
3. Relever KPI par slot: impressions, CTR, RPM, coverage.

Semaine 2:

1. Ajuster 1 seule variable a la fois (cadence in-feed OU ajout In-Article blog).
2. Mesurer impact 7 jours complets.
3. Conserver uniquement les changements avec gain net revenu + UX.

## 19. Rappels de conformite

- Eviter les placements sur ecrans pauvres en contenu ou ecrans de fin.
- Eviter les superpositions qui degradent la consommation du contenu.
- Toute modif de strategie pubs doit etre loggee (date, auteur, hypothese, resultat).
