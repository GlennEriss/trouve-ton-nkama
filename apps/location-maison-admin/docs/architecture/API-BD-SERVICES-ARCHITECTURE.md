# Architecture API / BD / Services

## 1. Style d'architecture applicative

Nous adoptons une architecture **modulaire par domaine** avec couches internes:

- Presentation
- Application
- Domain
- Infrastructure

Chaque module metier suit le meme schema pour maitriser la complexite.

## 2. Modules metier cibles

- `iam` (identity and access management)
- `admin_management`
- `user_management`
- `announcer_management`
- `listing_moderation`
- `finance_credits`
- `analytics_insights`
- `audit_compliance`
- `platform_settings`

## 3. Structure logique recommandee

```text
src/
  modules/
    iam/
      presentation/
      application/
      domain/
      infrastructure/
    admin_management/
    user_management/
    listing_moderation/
    finance_credits/
    analytics_insights/
    audit_compliance/
  shared/
    kernel/
    observability/
    security/
```

## 4. Flux standard d'une requete

1. UI admin appelle route BFF (`/api/admin/...`).
2. Route Handler valide auth + role + permission.
3. Application Service orchestre le use case.
4. Domain Policy applique regles metier.
5. Repository lit/ecrit dans Firestore (et Redis si necessaire).
6. Audit Service journalise l'action si sensible.
7. Event Publisher diffuse un event metier asynchrone si requis.

## 5. Contrat des APIs admin

- Prefixe unique: `/api/admin/*`
- Versionnement: `/api/admin/v1/*`
- Reponse standard: `success` (bool), `data` (payload), `error` (`code`, `message`, `details`)
- Correlation id obligatoire pour tracing.

## 6. Gouvernance RBAC dans le pipeline API

Ordre de verification:

1. Authentification admin valide
2. Compte admin actif (non suspendu)
3. Permission explicite (`resource.action`)
4. Condition metier contextuelle (ex: seuil remboursement)
5. Audit log mutation

## 7. Service boundaries (responsabilites)

### 7.1 IAM Service

- Gerer login admin, sessions, MFA, revocation.
- Exposer status online/offline admin.

### 7.2 Admin Management Service

- Lister admins.
- Inviter/activer/suspendre/revoquer.
- Assigner roles.

### 7.3 User Management Service

- Lister/rechercher utilisateurs.
- Suspendre/reactiver selon policy.
- Exposer presence utilisateurs.

### 7.4 Listing Moderation Service

- Moderer annonces.
- Actions bulk.
- Historiser decisions.

### 7.5 Finance Credits Service

- Packs credits.
- Attribution manuelle.
- Transactions et remboursements.

### 7.6 Analytics Insights Service

- Aggregations recherches 7j par defaut.
- Resultats avec/sans annonces.
- Consolidation visites Firebase/Vercel.

### 7.7 Audit Compliance Service

- Journal inviolable des actions sensibles.
- Export audit logs.

## 8. Pattern de persistence

- Repositories par aggregate racine.
- Transactions Firestore pour mutations critiques.
- Idempotency key pour operations sensibles (refunds, credits grant).
- Cache-aside Redis pour KPI et vues couteuses.

## 9. Pattern asynchrone

Events publies par les services applicatifs:

- `admin.invited`
- `admin.role_changed`
- `user.suspended`
- `listing.moderated`
- `credits.granted`
- `refund.approved`
- `search.event_ingested`
- `traffic.metric_ingested`

Broker MVP: Pub/Sub.

## 10. Observabilite et resilence

- Sentry: erreurs FE/BE et alertes sur endpoints critiques.
- Logs structures: `timestamp`, `level`, `scope`, `actor_id`, `correlation_id`.
- Metrics: latence p95 par endpoint, taux d'erreurs par module, backlog ingestion analytics.

## 11. Regles de design

- Interdiction d'acces direct DB depuis la couche UI.
- Interdiction de logique metier dans les Route Handlers.
- Domain policies testables et sans dependance infrastructure.
- Toute mutation sensible doit passer par Application Service + Audit Service.
