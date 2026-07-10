# Architecture Base de Donnees

## 1. Strategie data

Architecture poly-store pragmatique:

- **Firestore**: donnees operationnelles transactionnelles du dashboard admin
- **Redis**: cache, presence temps reel, rate limit, lock court
- **BigQuery**: analytics historique et comparatifs

## 2. Store par cas d'usage

| Cas d'usage | Store principal | Remarques |
|---|---|---|
| Admins, roles, sessions | Firestore | Source de verite IAM admin |
| Utilisateurs/annonceurs (lecture admin) | Firestore | Donnees partagees avec `location-maison` |
| Moderation annonces | Firestore | Workflows statutaires |
| Credits, transactions, remboursements | Firestore | Mutations sensibles + audit |
| Presence online/offline | Redis + projection Firestore | Redis temps reel, Firestore historique |
| Recherches utilisateur | BigQuery (raw + daily) | Dashboard 7 jours par defaut |
| Visites Firebase/Vercel | BigQuery (raw + daily) | Comparatif cross-source |
| Audit log admin | Firestore (+ export BigQuery optionnel) | Long terme et compliance |

## 3. Collections Firestore (operationnel)

## 3.1 IAM et administration

- `admin_users`
- `admin_roles`
- `admin_role_bindings`
- `admin_invitations`
- `admin_sessions`
- `admin_presence_snapshots`

## 3.2 Operations metier

- `users` (lecture depuis domaine plateforme)
- `announcers`
- `listings`
- `listing_moderation_actions`
- `credit_wallets`
- `credit_transactions`
- `refund_requests`

## 3.3 Gouvernance

- `audit_logs`
- `idempotency_keys`
- `outbox_events`

## 4. Datasets BigQuery (analytics)

- Dataset: `admin_analytics`

Tables recommandees:

- `search_events_raw`
- `search_metrics_daily`
- `traffic_events_raw`
- `traffic_metrics_daily`
- `traffic_comparison_daily`
- `presence_events_raw` (optionnel si retention longue requise)

## 5. Patterns de coherence

- Pattern outbox pour publier les events apres mutation Firestore.
- Upsert idempotent pour ingestion analytics.
- Reconciliation nocturne pour detecter ecarts de volumes.

## 6. Indexation et performance

Firestore:

- Index composes sur champs de filtres admin frequents.
- Pagination par curseur sur listes volumineuses.

BigQuery:

- Partition par `date_key`.
- Cluster par `source`, `provider`, `query_text_normalized` selon table.

Redis:

- TTL explicite par type de cle.
- Cle presence: courte TTL + heartbeats.

## 7. Securite donnees

- Separation credentials par environnement.
- Chiffrement at-rest natif des plateformes cloud.
- Minimise PII dans analytics.
- Hash/salt des identifiants techniques non necessaires en clair.

## 8. Retention cible

- `admin_sessions`: 12 mois
- `audit_logs`: 24 mois minimum
- `search_events_raw`: 12 mois
- `traffic_events_raw`: 12 mois
- Aggregats `*_daily`: 24+ mois

## 9. SLO data

- Fraicheur presence: < 30 sec
- Fraicheur dashboard recherche: < 15 min
- Fraicheur dashboard visites: < 15 min
- Taux doublons ingestion: < 0.1%
