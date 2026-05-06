# Schéma de Données Analytics (Recherches, Présence, Visites, Monétisation Pubs)

## Objectif

Définir le modèle de données analytics pour:

- présence admins/utilisateurs (en ligne + dernière activité)
- recherches utilisateurs (7 jours par défaut)
- visites de la plateforme (centralisation Firebase + Vercel)
- monétisation pubs AdSense (revenus + performance)

## Portée du schéma

Le schéma est logique et peut être implémenté dans Firestore, BigQuery ou un entrepôt hybride.

## Principes

- Normaliser les événements avec un `event_name` et un `occurred_at`.
- Conserver la source (`firebase`, `vercel`, `search_page`, `search_bar`, `adsense`).
- Séparer les tables brutes (events) des tables agrégées (reporting rapide).
- Utiliser UTC pour stockage; conversion fuseau à l'affichage.

## 1) Présence admins et utilisateurs

## 1.1 Table `presence_sessions`

But: suivre qui est en ligne et la dernière activité.

Champs:

- `session_id` (string, PK)
- `actor_type` (enum: `admin`, `user`)
- `actor_id` (string)
- `role` (nullable, string, seulement pour admin)
- `status` (enum: `online`, `offline`)
- `connected_at` (timestamp)
- `last_seen_at` (timestamp)
- `disconnected_at` (timestamp, nullable)
- `ip_hash` (string, nullable)
- `device_type` (string, nullable)
- `user_agent` (string, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Index recommandés:

- (`actor_type`, `status`, `last_seen_at` desc)
- (`actor_id`, `last_seen_at` desc)

## 1.2 Table `presence_events`

But: historique détaillé des événements de présence.

Champs:

- `event_id` (string, PK)
- `session_id` (string)
- `actor_type` (enum: `admin`, `user`)
- `actor_id` (string)
- `event_name` (enum: `session_started`, `heartbeat`, `session_ended`, `session_expired`)
- `occurred_at` (timestamp)
- `metadata_json` (json, nullable)

## 1.3 Règles de calcul statut en ligne

- `online` si dernière heartbeat < seuil d'inactivité (ex: 5 min).
- `offline` sinon.
- Dernière connexion admin = max(`connected_at`) de ses sessions.
- Dernière activité user = max(`last_seen_at`).

## 2) Recherches utilisateurs

## 2.1 Sources obligatoires

- `catalog_search_page`: recherches depuis `https://www.tonnkama.com/search`
- `location_maison_search_bar`: recherches depuis la barre de recherche du projet `location-maison`

## 2.2 Table `search_events`

But: stocker chaque recherche exécutée.

Champs:

- `search_event_id` (string, PK)
- `occurred_at` (timestamp)
- `date_key` (date)
- `source` (enum: `catalog_search_page`, `location_maison_search_bar`)
- `session_id` (string, nullable)
- `user_id` (string, nullable)
- `is_authenticated` (boolean)
- `query_text_raw` (string)
- `query_text_normalized` (string)
- `search_filters_json` (json): type logement, ville, quartier, min/max prix, chambres, etc.
- `results_count` (int)
- `has_results` (boolean)
- `result_ids_sample` (array<string>, nullable, max 20)
- `latency_ms` (int, nullable)
- `created_at` (timestamp)

Index recommandés:

- (`date_key`, `source`)
- (`query_text_normalized`, `date_key`)
- (`has_results`, `date_key`)

## 2.3 Table agrégée `search_metrics_daily`

But: accélérer les dashboards et garantir le défaut 7 jours.

Champs:

- `date_key` (date)
- `source` (enum)
- `total_searches` (int)
- `searches_with_results` (int)
- `searches_without_results` (int)
- `success_rate` (float)
- `avg_results_count` (float)
- `top_queries_json` (json)
- `top_property_types_json` (json)
- `top_price_ranges_json` (json)
- `updated_at` (timestamp)

## 2.4 KPI clés recherches

- Volume total de recherches
- Taux de recherches avec résultats
- Taux de recherches sans résultats
- Top intentions (mots-clés)
- Top types de logement
- Top fourchettes de prix

## 3) Visites plateforme (Firebase + Vercel)

## 3.1 Table `traffic_events_raw`

But: centraliser les événements de visites issus des providers.

Champs:

- `traffic_event_id` (string, PK)
- `provider` (enum: `firebase`, `vercel`)
- `provider_event_id` (string)
- `occurred_at` (timestamp)
- `date_key` (date)
- `metric_name` (string)
- `metric_value` (float)
- `page_path` (string, nullable)
- `country` (string, nullable)
- `device_category` (string, nullable)
- `source_json` (json, payload brut utile)
- `created_at` (timestamp)

Contrainte:

- Unicité (`provider`, `provider_event_id`) pour éviter les doublons.

## 3.2 Table agrégée `traffic_metrics_daily`

But: vue consolidée pour comparaison simple et rapide.

Champs:

- `date_key` (date)
- `provider` (enum: `firebase`, `vercel`)
- `visits` (int)
- `unique_visitors` (int)
- `page_views` (int)
- `bounce_rate` (float, nullable)
- `avg_session_duration_sec` (float, nullable)
- `top_pages_json` (json)
- `updated_at` (timestamp)

## 3.3 Table agrégée `traffic_comparison_daily`

But: comparer Firebase vs Vercel sur une même période dans un seul écran.

Champs:

- `date_key` (date)
- `firebase_visits` (int)
- `vercel_visits` (int)
- `delta_visits` (int)
- `delta_percent` (float)
- `firebase_page_views` (int)
- `vercel_page_views` (int)
- `updated_at` (timestamp)

## 4) Monétisation pubs (AdSense)

## 4.1 Table `adsense_reporting_raw`

But: centraliser les métriques de revenu et de performance AdSense.

Champs:

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
- `active_view_viewability` (numeric, nullable)
- `active_view_measurability` (numeric, nullable)
- `loaded_at` (timestamp)

## 4.2 Table `ads_slot_events`

But: mesurer la qualité réelle de l'intégration pub sur la plateforme.

Champs:

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
- `country` (string, nullable)
- `device_category` (string, nullable)
- `created_at` (timestamp)

## 4.3 Table agrégée `ads_metrics_daily`

But: alimenter les écrans dashboard monétisation.

Champs:

- `date_key` (date)
- `page_template` (string)
- `slot_id` (string, nullable)
- `slot_position` (string, nullable)
- `device_category` (string, nullable)
- `country` (string, nullable)
- `estimated_earnings` (numeric)
- `sessions` (int)
- `page_views` (int)
- `ad_requests` (int)
- `matched_ad_requests` (int)
- `total_impressions` (int)
- `clicks` (int)
- `fill_rate` (numeric)
- `ctr` (numeric)
- `page_views_rpm` (numeric)
- `impressions_rpm` (numeric)
- `active_view_viewability` (numeric, nullable)
- `updated_at` (timestamp)

## 4.4 Table agrégée `ads_revenue_vs_traffic_daily`

But: comparer revenu pub et trafic dans une seule vue.

Champs:

- `date_key` (date)
- `estimated_earnings` (numeric)
- `sessions` (int)
- `page_views` (int)
- `revenue_per_1k_sessions` (numeric)
- `page_views_rpm` (numeric)
- `delta_revenue_vs_prev_day` (numeric)
- `delta_rpm_vs_prev_day` (numeric)

## 5) Pipeline d'ingestion analytics

Étapes:

1. Extraction Firebase Analytics
2. Extraction Vercel Analytics
3. Extraction AdSense Reporting API
4. Ingestion des events slot-level depuis la plateforme
5. Normalisation format commun
6. Upsert dans tables `*_raw`
7. Agrégation quotidienne dans `*_daily`
8. Vérification qualité (doublons, trous de données, latence)

Fréquence recommandée:

- Ingestion brute trafic/recherche/présence: toutes les 15 minutes
- Ingestion AdSense: toutes les 6 heures + consolidation quotidienne
- Agrégation daily: toutes les heures + recalcul nocturne

## 6) Contrat API du dashboard (niveau fonctionnel)

Endpoints attendus (fonctionnels, sans code):

- Présence:
- `GET /admin/analytics/presence/admins-online`
- `GET /admin/analytics/presence/users-online`
- `GET /admin/analytics/presence/admins-last-login`
- `GET /admin/analytics/presence/users-last-seen`

- Recherches:
- `GET /admin/analytics/searches?range=7d` (par défaut 7d)
- `GET /admin/analytics/searches/top-queries?range=7d`
- `GET /admin/analytics/searches/result-rate?range=7d`

- Visites:
- `GET /admin/analytics/traffic?range=7d`
- `GET /admin/analytics/traffic/compare?providers=firebase,vercel&range=7d`

- Monétisation pubs:
- `GET /admin/analytics/ads/overview?range=7d`
- `GET /admin/analytics/ads/revenue-timeseries?range=30d`
- `GET /admin/analytics/ads/placements?range=30d`
- `GET /admin/analytics/ads/pages?range=30d`
- `GET /admin/analytics/ads/alerts?range=30d`

Référence détaillée:
- `./MONETISATION-PUBS-ADSENSE-SPEC.md`

## 7) Rétention des données

- `presence_events`: 90 jours
- `search_events`: 12 mois
- `traffic_events_raw`: 12 mois
- `adsense_reporting_raw`: 24 mois
- `ads_slot_events`: 12 mois
- `*_daily`: conservation longue (24+ mois)

## 8) Qualité et gouvernance

- Horodatage obligatoire sur tous les événements.
- `source/provider` obligatoire.
- Requêtes vides ou invalides: conserver avec flag qualité.
- Audit des jobs d'ingestion (succès, erreurs, volumes).
- Réconciliation quotidienne revenus AdSense vs agrégats dashboard.
