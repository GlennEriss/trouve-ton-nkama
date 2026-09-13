# MVP v1 figé — recommandation

## Dans le périmètre

- journaliser impressions et interactions au niveau annonce/session/contexte ;
- exclure robots, doublons évidents et interactions de l'annonceur sur sa propre annonce ;
- produire des candidats avec Algolia et les filtres métier actuels ;
- calculer un score déterministe explicable ;
- entraîner hors ligne une régression logistique comme modèle challenger ;
- servir contrôle, score déterministe ou modèle selon une affectation stable ;
- journaliser version, score, position et raison de classement ;
- mesurer CTR, favoris et contacts avec garde-fous de latence et diversité ;
- fallback automatique vers le classement déterministe.

## Hors périmètre

- réseau neuronal profond et entraînement temps réel ;
- embeddings propriétaires ou base vectorielle dédiée ;
- Kafka, feature store commercial ou infrastructure Kubernetes ;
- recommandations fondées sur téléphone, texte privé ou coordonnées exactes ;
- personnalisation du prix ou discrimination entre utilisateurs ;
- reprise automatique omnicanale entre personnes partageant un appareil ;
- remplacement d'Algolia comme moteur de recherche.

## Critères d'entrée du modèle entraîné

- au moins quatre semaines de données d'impression exploitables ;
- couverture d'impression supérieure à 95 % sur les surfaces du MVP ;
- taux d'événements invalides inférieur à 1 % ;
- volume minimal à fixer après baseline, avec au moins plusieurs milliers de conversions fortes ;
- absence de fuite temporelle et validation offline supérieure au score déterministe ;
- revue confidentialité et sécurité terminée.

## Critères de succès

- aucune violation des filtres obligatoires ;
- surcoût P95 du reranking inférieur à 100 ms côté serveur ;
- disponibilité du ranking supérieure à 99,9 %, fallback compris ;
- amélioration statistiquement crédible du taux de contact ou, à défaut, des favoris sans baisse
  du taux de contact ;
- aucune concentration injustifiée des impressions sur un petit groupe d'annonceurs.

## Gouvernance

Toute extension du périmètre exige une mise à jour de ce document, des risques, du contrat de
données et des tests. Un modèle ne passe en production qu'avec version, métriques offline,
fenêtre de données, propriétaire et procédure de rollback documentés.

