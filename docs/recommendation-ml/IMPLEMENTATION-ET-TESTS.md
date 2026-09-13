# Plan d'implémentation et de tests

## Prérequis

Ne pas commencer les phases ci-dessous avant d'avoir traité la
[checklist GO/NO-GO](./AVANT-IMPLEMENTATION.md#checklist-go--no-go). L'audit de phase 0 peut
commencer immédiatement ; la collecte et la personnalisation restent soumises aux décisions de
consentement, de contrat et de rétention.

## Phase 0 — Audit et baseline

- inventorier les surfaces et événements actuels ;
- vérifier Algolia Insights, Firebase Analytics, `property_statistics` et BigQuery ;
- mesurer trafic, conversions et couverture d'identification ;
- définir précisément impression visible et contact attribué ;
- construire le score déterministe hors production.

Tests : formules pures, contraintes strictes, stabilité du tri, absence de NaN, nouvelles annonces
et fallback sans historique.

## Phase 1 — Collecte

- ajouter request IDs, impressions visibles et interactions corrélées ;
- utiliser IntersectionObserver avec seuil et durée minimum pour une impression ;
- batcher les événements sans bloquer l'interface ;
- valider, dédupliquer et pseudonymiser côté serveur ;
- alimenter BigQuery via le pipeline analytics existant.

Tests unitaires : validation, sanitation PII, idempotence, visibilité, debounce, batch et retry.

Tests d'intégration : request servie puis impression/clic/contact valides ; refus d'un listing non
servi ; rejeu du même event ID ; événement tardif dans la fenêtre autorisée.

## Phase 2 — Baseline de ranking

- candidate generation Algolia inchangée ;
- calcul batch des features ;
- score pondéré configurable et versionné ;
- diversité par annonceur/catégorie et quota de nouvelles annonces ;
- séparation explicite des promotions ;
- expérience contrôle/baseline avec affectation stable.

Tests : aucune sortie hors filtre, déterminisme, pagination sans doublon, diversité, promotion,
cold start, timeout et retour au classement Algolia.

## Phase 3 — Dataset et entraînement

- construire des exemples impression/action avec coupure temporelle ;
- séparer train/validation/test par temps, pas aléatoirement ;
- entraîner régression logistique ;
- calibrer les probabilités ;
- mesurer AUC/PR-AUC, log loss, NDCG@10, calibration et métriques par segment ;
- vérifier biais de position, ville, catégorie et ancienneté.

Tests : reproductibilité, schéma des features, absence de fuite, valeurs manquantes, artefact et
checksum, refus automatique si métriques/garde-fous échouent.

## Phase 4 — Serving challenger

- charger une version immuable avec timeout court ;
- shadow mode sans modifier l'ordre ;
- canary faible pourcentage ;
- A/B test contre baseline ;
- augmentation progressive si métriques et garde-fous restent sains ;
- rollback automatique et manuel.

Tests : parité features entraînement/serving, modèle corrompu, timeout, version absente,
affectation stable, cache, concurrence et charge P95.

## Tests E2E critiques

1. un filtre Libreville ne retourne jamais Port-Gentil à cause du modèle ;
2. une annonce Mode ne traverse pas un filtre Immobilier ;
3. un utilisateur anonyme obtient un classement sans profil ;
4. un utilisateur connecté garde la même variante ;
5. une impression n'est envoyée qu'après visibilité réelle ;
6. favori et contact sont associés à la requête servie ;
7. les promotions restent identifiables et conformes aux règles ;
8. une panne modèle conserve des résultats ;
9. la pagination n'affiche pas deux fois la même annonce ;
10. aucune PII n'apparaît dans les événements ni logs.

## Rollout recommandé

```text
collecte seule -> score offline -> shadow -> 1 % -> 5 % -> 25 % -> 50 %
```

Chaque palier exige une fenêtre suffisante, aucune alerte de latence/erreur et une revue des
métriques par segment. Ne pas passer à 100 % : conserver un groupe contrôle permanent permet de
détecter la dérive.

## Définition de terminé

- contrats et tests verts ;
- dashboard qualité des événements ;
- dataset reproductible ;
- baseline et modèle versionnés ;
- fallback testé ;
- procédure de rollback exercée ;
- revue sécurité/confidentialité ;
- décision produit documentée sur la métrique principale.
