# Firestore Indexes — Module Listings Admin

## Objectif
Garantir les requêtes de modération et d'historique sans erreur d'index en dev/prod.

## Index requis
Source de vérité: `location-maison/firestore.indexes.json`

- `listing_moderation_decisions`
  - `propertyId ASC`
  - `createdAt DESC`

- `audit_logs`
  - `resource ASC`
  - `resourceId ASC`
  - `createdAt DESC`

## Déploiement indexes
Depuis le repo `location-maison`:

```bash
cd /Users/glenneriss/Documents/projets/location-maison

# DEV
firebase use dev
firebase deploy --only firestore:indexes

# PROD
firebase use prod
firebase deploy --only firestore:indexes
```

## Vérification rapide
1. Ouvrir `location-maison-admin` et accéder à `/dashboard/listings/[id]`.
2. Onglet `Historique`:
- vérifier que la timeline `Décisions modération` charge.
- vérifier que la timeline `Audit technique` charge.
3. Vérifier l'absence d'erreur Firestore liée aux indexes.
