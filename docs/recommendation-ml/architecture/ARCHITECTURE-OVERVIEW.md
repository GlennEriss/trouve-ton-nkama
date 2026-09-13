# Architecture générale

## Flux cible

```text
requête utilisateur
  -> filtres et candidats Algolia
  -> extraction des caractéristiques
  -> score déterministe ou modèle versionné
  -> règles de promotion, diversité et fraîcheur
  -> résultats + recommendationRequestId
  -> impressions/interactions
  -> ingestion analytique
  -> dataset d'entraînement
  -> entraînement et évaluation hors ligne
  -> registre de modèles
```

## Décisions techniques

| Domaine | Choix | Décision | Justification | Réévaluation |
|---|---|---|---|---|
| Candidats | Algolia actuel | Use now | Filtres, index et recherche déjà en place | Si coût/limites bloquent le ranking |
| Données analytiques | BigQuery prévu | Use now | Requêtes historiques et entraînement offline | Si le pipeline analytics change |
| Événements temps réel | API Next.js puis ingestion existante | Use now | Faible complexité initiale | Pub/Sub si pertes ou débit deviennent significatifs |
| Modèle v1 | Régression logistique | Use now | Rapide, explicable, perte convexe | Gradient boosting si gain offline/online démontré |
| Baseline | Score pondéré déterministe | Use now | Fallback et contrôle A/B | Toujours conservé comme secours |
| Stockage modèle | Artefact versionné dans Cloud Storage | Use now | Simple et compatible GCP | Registre spécialisé avec plusieurs équipes/modèles |
| Service de scoring | Next.js/server runtime avec modèle chargé | Use now | Pas de nouveau service au MVP | Service dédié si latence ou mémoire l'exige |
| Feature store | Tables BigQuery + caractéristiques requête | Not now | Éviter un système distribué prématuré | Besoin de features temps réel cohérentes |
| Broker | Aucun nouveau broker | Not now | Volume inconnu, ingestion existante | Perte d'événements ou plusieurs consommateurs |
| Réseau neuronal | Aucun | Not now | Données insuffisantes, explicabilité faible | Gain net après maturité dataset |
| Base vectorielle | Aucune | Re-evaluate later | Algolia et attributs suffisent au MVP | Recherche sémantique catalogue à grande échelle |

## Modules

- `recommendation-candidates` : applique les contraintes et récupère les candidats ;
- `recommendation-features` : transforme contexte, profil et annonce en valeurs autorisées ;
- `recommendation-ranking` : baseline, modèle, diversité et promotions ;
- `recommendation-events` : valide et ingère impressions/conversions ;
- `recommendation-training` : construit dataset, entraîne, évalue et publie ;
- `recommendation-experiments` : affectation stable et mesure contrôle/challenger.

## Sécurité et confidentialité

- UID pseudonymisé dans le dataset d'entraînement ; session anonyme à durée limitée ;
- aucune description libre, téléphone ou adresse exacte ;
- contrôle serveur des événements pour limiter la fraude ;
- rétention différenciée entre événements bruts et agrégats ;
- droit de suppression propagé aux données utilisateur identifiables ;
- accès aux métriques et modèles limité aux rôles analytics autorisés.

## NFR

- reranking P95 inférieur à 100 ms, hors recherche Algolia ;
- réponse complète avec fallback même si le modèle échoue ;
- événement client non bloquant et idempotent ;
- fraîcheur des caractéristiques catalogue inférieure à 15 minutes ;
- modèle reproductible à partir d'une fenêtre de données et d'une configuration versionnées.

