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
