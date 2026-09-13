# Système de recommandation ML

Ce dossier définit l'architecture cible d'un système de recommandation personnalisé pour Trouve
Ton Nkama. Il s'agit d'une base de décision avant implémentation, pas de la preuve que les données
actuelles suffisent déjà à entraîner un modèle fiable.

## Pour commencer

Le développeur doit suivre cet ordre :

1. [Vision produit](./VISION-PRODUIT.md) — comprendre le problème et les objectifs.
2. [Préparation avant implémentation](./AVANT-IMPLEMENTATION.md) — traiter les décisions
   bloquantes et compléter la checklist GO/NO-GO.
3. [MVP v1 figé](./MVP-V1-FIGE.md) — connaître précisément le périmètre inclus et exclu.
4. [Vue d'ensemble de l'architecture](./architecture/ARCHITECTURE-OVERVIEW.md) — comprendre les
   composants, décisions techniques et NFR.
5. [Architecture API, base de données et services](./architecture/API-BD-SERVICES-ARCHITECTURE.md)
   — implémenter les contrats et flux.
6. [Architecture des données](./architecture/DATABASE-ARCHITECTURE.md) — implémenter événements,
   features, labels et registre de modèles.
7. [Plan d'implémentation et de tests](./IMPLEMENTATION-ET-TESTS.md) — exécuter les phases dans
   l'ordre et appliquer les gates.
8. [Diagrammes UML](./architecture/uml/) — vérifier visuellement composants et dépendances.

## Carte documentaire

| Document | Question à laquelle il répond | Statut |
|---|---|---|
| `VISION-PRODUIT.md` | Pourquoi construire ce système ? | Proposition structurée |
| `AVANT-IMPLEMENTATION.md` | Que manque-t-il avant le code ? | Décisions à valider |
| `MVP-V1-FIGE.md` | Qu'allons-nous livrer ou exclure ? | Périmètre proposé à valider |
| `ARCHITECTURE-OVERVIEW.md` | Quelles briques et technologies ? | Architecture cible |
| `API-BD-SERVICES-ARCHITECTURE.md` | Quels contrats et flux runtime ? | Architecture cible |
| `DATABASE-ARCHITECTURE.md` | Quelles données pour apprendre correctement ? | Architecture cible |
| `IMPLEMENTATION-ET-TESTS.md` | Dans quel ordre coder et tester ? | Plan exécutable après GO |
| `architecture/uml/*.puml` | Comment les éléments interagissent-ils ? | Cohérent avec le MVP |

## Statut global

**État actuel (2026-09-13) : les 5 décisions bloquantes sont validées, GO pour l'audit et la
collecte. NO-GO pour l'entraînement et le serving personnalisé** tant que les critères d'entrée du
MVP (`MVP-V1-FIGE.md`) et le reste de la checklist (pipeline BigQuery audité, contrat
événementiel approuvé, index Algolia audité, baseline mesurable, kill switch, fixtures) ne sont
pas cochés.

## Décision directrice

Le moteur de recherche conserve les filtres obligatoires et produit les candidats. Le système de
recommandation reclasse seulement des annonces éligibles. Le MVP commence par collecter des
impressions fiables et déployer un score explicable ; le premier modèle entraîné ne sera activé
qu'après validation de la qualité et du volume des données.

## Raccourcis par rôle

- Produit : Vision → Avant implémentation §1–5, §12–14 → MVP.
- Développeur backend : Architecture générale → API/services → données → plan phases 1–4.
- Développeur frontend : Avant implémentation §3, §7–8 → API événements → plan phase 1.
- Data/ML : Données → critères d'entrée MVP → plan phases 3–4.
- QA : checklist GO/NO-GO → tests E2E → fallbacks et rollback.
- Sécurité/juridique : Avant implémentation §5 → sécurité/confidentialité → rétention.

## Règle de maintenance

Toute décision validée doit être mise à jour dans le registre de
`AVANT-IMPLEMENTATION.md`, puis répercutée dans le MVP et l'architecture concernée. Aucun choix
structurant ne doit rester uniquement dans une discussion ou une issue.
