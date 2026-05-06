# Gestion des Annonces Admin - Specification Detaillee

## 1. Objectif

Definir, avant implementation, le scope complet du module **Annonces** du dashboard admin:

- lister les annonces
- paginer
- filtrer
- rechercher
- modifier une annonce
- changer l'etat d'une annonce
- traiter les annonces similaires (doublons)

Cette specification est **documentation-only** (pas de code dans ce document).

## 2. Sources metier de reference (projet `location-maison`)

La modelisation doit rester alignee sur les types utilises par la plateforme:

- `src/models/annonce.d.ts`
- `src/models/creation.d.ts`
- `src/models/schema.ts`
- `src/constantes/property-type.ts`
- `src/constantes/index.ts`

### 2.1 Types et enums existants a respecter

- `status`: `FOR_RENT | FOR_SALE`
- `state`: `IN_PROGRESS | ARCHIVED`
- `typeProperty`:
  - `Home`, `Studio`, `Apartment`, `Desk`, `Building`, `Shop`, `Kiosk`, `Room`, `Property`, `Logement`, `Villa`, `Land`
- contraintes globales:
  - `MAX_TAGS = 6`
  - `MAX_IMAGES_UPLOAD = 10`

## 3. Perimetre fonctionnel du module Annonces

## 3.1 Listing principal

- tableau des annonces admin
- pagination curseur
- tri multi-criteres
- filtres combines
- recherche plein texte admin
- export CSV

## 3.2 Fiche detail annonce

- visualiser tous les champs (communs + type-specifiques)
- historique de modifications
- historique de moderation
- informations createur (announcer/user)
- audit des actions admin sur l'annonce

## 3.3 Edition annonce

- edition des champs generaux
- edition des champs type-specifiques
- edition media (ajout/suppression images)
- edition localisation
- edition statut metier (rent/sale) et etat de publication (in_progress/archived)
- validation metier alignee sur `schema.ts`

## 3.4 Gestion etat/statut annonce

- bascule `state`:
  - `IN_PROGRESS -> ARCHIVED`
  - `ARCHIVED -> IN_PROGRESS`
- changement `status`:
  - `FOR_RENT <-> FOR_SALE`
- actions bulk sur selection multiple

## 3.5 Centre de doublons

- visualiser clusters d'annonces similaires
- score de similarite et raison de rapprochement
- actions:
  - ignorer (pas un doublon)
  - archiver une annonce
  - suppression definitive (restreinte)
  - marquer un cluster comme resolu

## 4. Ecrans cibles dashboard

## 4.1 `/dashboard/listings`

Composants:

- KPIs: total, actives, archivees, a louer, a vendre, suspects doublons
- barre recherche
- filtres
- tableau pagine
- actions bulk

Colonnes minimales:

- titre
- typeProperty
- status
- state
- prix
- surface
- localisation (province/city/street)
- createur
- createdAt
- updatedAt
- duplicateScore (si present)

## 4.2 `/dashboard/listings/[id]`

- panneau resume annonce
- onglet details
- onglet media
- onglet historique
- onglet doublons

## 4.3 `/dashboard/listings/duplicates`

- liste des clusters suspects
- niveau de confiance (high/medium/low)
- volume par cluster
- action rapide de resolution

## 5. Contrat de recherche / filtres / pagination

## 5.1 Recherche

Recherche combinee sur:

- `title`
- `description`
- `searchableName`
- `createdBy`
- `contact`
- `city`, `province`, `street`

## 5.2 Filtres

Filtres MVP:

- `typeProperty[]`
- `status[]`
- `state[]`
- `priceMin`, `priceMax`
- `areaMin`, `areaMax`
- `province[]`, `city[]`
- `createdBy`
- `dateFrom`, `dateTo`
- `hasPromotion` (bool)
- `duplicateState` (`none`, `suspected`, `confirmed`, `resolved`)

## 5.3 Tri

- `createdAt` desc (defaut)
- `updatedAt`
- `price`
- `area`
- `duplicateScore`

## 5.4 Pagination

- pagination curseur (pas offset)
- page size:
  - defaut: 25
  - options: 25, 50, 100

## 6. Regles metier d'etat annonce

## 6.1 Distinction importante

- `status` = type de transaction (louer/vendre)
- `state` = disponibilite/publication (active/archivee)

## 6.2 Transitions autorisees

- `state`: toggle bidirectionnel
- `status`: editable par admin autorise

## 6.3 Politique de suppression

- suppression logique par defaut (`state = ARCHIVED`)
- suppression definitive reservee `super_admin`
- toute suppression definitive doit etre auditee

## 7. Edition annonce - mapping champs

## 7.1 Champs communs

- `title`, `description`
- `price`, `area`
- `status`, `state`
- `tags` (max 6)
- `images` (max 10)
- `street`, `city`, `province`, `country`, `countryCode`
- `longitude`, `latitude`
- `provinceLon`, `provinceLat`, `cityLon`, `cityLat`, `streetLon`, `streetLat`
- `isLocExact`
- `contact`

## 7.2 Champs type-specifiques

- `Logement`:
  - `nbrRooms`, `nbrKitchens`, `nbrBathrooms`, `nbrToilets`
- `Home`:
  - logement + `nbrGarages`, `nbrFloors`, `nbrLivingRoom`
- `Studio`:
  - logement + `nbrFloorStudio`, `numeroStudio`
- `Apartment`:
  - logement + `nbrFloorApartment`, `numeroApartment`
- `Villa`:
  - logement + `nbrFloors`, `nbrPiscine`, `nbrGarages`
- `Desk`:
  - `nbrToilets`, `nbrRooms`
- `Building`:
  - `nbrApartments`, `nbrFloors`, `hasParking`
- `Shop`:
  - `nbrRooms`, `nbrToilet`
- `Kiosk`:
  - `kioskType`
- `Room`:
  - `roomType`

## 8. Doublons - technologies candidates

## 8.1 Option A - Regles deterministes (MVP low-cost)

Principe:

- normalisation texte + contact + zone + prix
- hash/fingerprint
- matching exact/near-exact

Avantages:

- simple
- peu couteux
- explicable

Limites:

- faible recall sur reformulations de texte

## 8.2 Option B - Fuzzy matching classique

Technos:

- similarite lexicale (Jaccard n-gram, cosine TF-IDF, Levenshtein, RapidFuzz)
- distance geographique (Haversine)

Avantages:

- meilleur recall que regles pures
- toujours interpretable

Limites:

- calibration de seuils necessaire

## 8.3 Option C - Embeddings semantiques

Technos:

- `Vertex AI Text Embeddings` + `BigQuery Vector Search`

Avantages:

- detecte les doublons "semantic equivalent"
- robuste aux reformulations

Limites:

- cout infra/model
- pipeline plus complexe

## 8.4 Recommandation retenue

Strategie **hybride en 2 phases**:

- Phase 1 (MVP): Option A + B
- Phase 2: ajout Option C pour renforcer la precision/recall

## 9. Design dedup recommande

## 9.1 Normalisation

Normaliser avant scoring:

- lower case
- suppression accents/punctuation
- standardisation abreviations (ex: "appt" -> "appartement")
- normalisation telephone
- bucketing prix/surface

## 9.2 Generation de candidats

Comparer seulement des annonces candidates proches:

- meme `typeProperty`
- meme `status`
- meme zone (`province/city` ou geohash voisin)
- plage prix proche (+/- 15%)
- plage surface proche (+/- 20%)

## 9.3 Scoring

Score final (0..1) via somme ponderee:

- similarite titre + description: 40%
- proximite localisation: 25%
- proximite prix/surface: 20%
- matching contact/createur: 15%

## 9.4 Seuils de decision

- `>= 0.92`: suspect fort
- `0.80 - 0.92`: suspect moyen
- `< 0.80`: non suspect

## 9.5 UX de traitement

- cluster des annonces similaires
- affichage des champs differenciants
- action admin:
  - conserver
  - archiver doublon
  - supprimer definitif (si permission)

## 10. Donnees a ajouter (spec cible)

## 10.1 Firestore `properties` (meta admin dedup)

Champs proposes:

- `dedup`
  - `fingerprintVersion`
  - `fingerprintStrict`
  - `duplicateScore`
  - `duplicateClusterId`
  - `duplicateState` (`none`, `suspected`, `confirmed`, `resolved`)
  - `duplicateReviewedBy`
  - `duplicateReviewedAt`

## 10.2 Collections dediees

- `listing_duplicate_clusters`
- `listing_duplicate_reviews`

## 10.3 BigQuery (analyse et tuning)

Tables recommandees:

- `listing_similarity_candidates`
- `listing_similarity_reviews`
- `listing_similarity_metrics_daily`

## 11. APIs admin cibles (spec v1)

## 11.1 Listing principal

- `GET /api/admin/v1/listings`
- `GET /api/admin/v1/listings/export`

## 11.2 Detail / edition

- `GET /api/admin/v1/listings/{id}`
- `PATCH /api/admin/v1/listings/{id}`
- `PATCH /api/admin/v1/listings/{id}/state`
- `PATCH /api/admin/v1/listings/{id}/status`

## 11.3 Bulk

- `POST /api/admin/v1/listings/bulk/state`
- `POST /api/admin/v1/listings/bulk/archive`
- `POST /api/admin/v1/listings/bulk/delete` (restreint)

## 11.4 Doublons

- `GET /api/admin/v1/listings/duplicates`
- `GET /api/admin/v1/listings/duplicates/{clusterId}`
- `POST /api/admin/v1/listings/duplicates/{clusterId}/resolve`
- `POST /api/admin/v1/listings/duplicates/recompute`

## 12. Permissions RBAC a prevoir

Voir la matrice ecran/action dediee:

- `./MATRICE-PERMISSIONS-ANNONCES-ECRANS-ACTIONS.md`

Nouvelles permissions module annonces:

- `listings.read`
- `listings.search`
- `listings.update`
- `listings.state.update`
- `listings.status.update`
- `listings.archive`
- `listings.unarchive`
- `listings.delete.hard`
- `listings.bulk.update`
- `listings.duplicates.read`
- `listings.duplicates.resolve`
- `listings.duplicates.recompute`

## 13. Audit et conformite

Actions a auditer obligatoirement:

- edition annonce
- changement `status`
- changement `state`
- bulk actions
- resolution de doublon
- suppression definitive

Format minimal audit:

- actor
- action
- resourceId
- before/after
- justification (optionnelle selon action)
- timestamp

## 14. KPIs du module annonces

Operational:

- volume total annonces
- taux annonces actives/archives
- delai median de traitement moderation
- nombre de modifications admin/jour

Doublons:

- taux de doublons suspects
- taux confirmation doublons
- taux faux positifs
- temps moyen de resolution cluster

## 15. Plan d'implementation recommande

## Sprint A - Foundations listings

- listing pagine
- filtres/recherche
- detail annonce
- export CSV

## Sprint B - Edition et etats

- edition complete annonce
- changement status/state
- bulk operations
- audit renforcé

## Sprint C - Dedup MVP

- fingerprint + fuzzy matching
- ecran clusters
- workflow resolution

## Sprint D - Dedup avance

- embeddings semantiques
- tuning seuils
- monitoring precision/recall

## 16. Decisions de gouvernance

- pas de suppression definitive par defaut
- dedup en mode "aide a la decision", pas suppression automatique
- toute automation destructive necessite validation explicite admin

## 17. Hors scope immediat

- fusion automatique de deux annonces
- correction automatique des champs metier
- suppression auto sans validation humaine
