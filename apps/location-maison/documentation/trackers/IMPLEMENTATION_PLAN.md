# Plan d'Implementation Trackers (3 etapes)

## Contexte

Le projet dispose deja de briques de tracking:

- tracking metier "property statistics" via API/Firestore

Le besoin actuel est d'industrialiser le tracking global produit:

1. top pages vues
2. top boutons cliques
3. suivi des parcours et conversions

## Strategie retenue

Approche simple:

- Google Analytics 4 (Firebase Analytics) comme socle unique de tracking web
- tracking metier interne conserve pour les stats annonces deja en place

## Decoupage en 3 etapes

### Etape 1 - Taxonomie & gouvernance des evenements

Document: `STEP-1-EVENT-TAXONOMY.md`

But:
- eviter les noms d'evenements incoherents
- fixer un contrat de donnees stable

Sortie:
- dictionnaire d'evenements versionne
- regles de nommage et proprietes obligatoires

### Etape 2 - Couche technique de tracking (feature-based)

Document: `STEP-2-TRACKING-LAYER.md`

But:
- centraliser l'emission d'evenements
- supprimer le tracking eparpille dans les composants

Sortie:
- module `src/features/analytics/tracking/*`
- wrappers `trackPageView` / `trackClick` / `trackBusinessEvent`

### Etape 3 - Dashboards, alerting, qualite des donnees

Document: `STEP-3-DASHBOARD-OPERATIONS.md`

But:
- rendre les metrics lisibles et actionnables
- ajouter une routine d'exploitation produit

Sortie:
- dashboards "Acquisition", "Activation", "Conversion"
- checklist qualite des donnees + revue hebdo

## Priorite d'execution

1. Etape 1 (obligatoire)
2. Etape 2
3. Etape 3

## Risques principaux

- sur-tracking sans valeur metier
- evenements dupliques ou mal nommes
- donnees sensibles envoyees par erreur

## Mitigations

- revue schema evenement avant merge
- idempotence sur evenements critiques
- redaction/sanitation du payload avant emission
