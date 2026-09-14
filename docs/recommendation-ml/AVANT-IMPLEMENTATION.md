# Préparation avant implémentation

## But

Ce document rassemble les décisions et vérifications à terminer avant de commencer le code du
système de recommandation. Il sépare les éléments réellement bloquants de ceux qui pourront être
ajustés après les premières mesures.

## Gate de démarrage

L'implémentation de la collecte peut commencer lorsque les décisions 1 à 5 ci-dessous sont
validées et consignées dans la table de décision en fin de document. L'entraînement d'un modèle
ne commence qu'après satisfaction des critères définis dans `MVP-V1-FIGE.md`.

## 1. Surfaces du MVP — bloquant

Décision recommandée :

- inclure la page d'accueil ;
- inclure les résultats de recherche classiques ;
- exclure temporairement recherche IA, similaires, Reels et notifications personnalisées.

Cette limite évite de mélanger plusieurs contextes et contrats de navigation pendant la mise au
point des impressions.

## 2. Objectif principal — bloquant

Décision recommandée : optimiser le taux de contact WhatsApp/appel par session ayant reçu des
recommandations.

Les clics, consultations et favoris restent des métriques intermédiaires. Le système ne doit pas
être déclaré performant sur le seul CTR si les contacts diminuent.

## 3. Définition d'une impression — bloquant

Décision recommandée : au moins 50 % de la carte visible pendant une seconde continue.

Une carte seulement présente dans le DOM, chargée hors écran ou traversée rapidement ne compte
pas comme impression. Une même annonce peut être dédupliquée par requête de recommandation et
fenêtre de visibilité.

## 4. Fenêtres d'attribution — bloquant

Valeurs initiales à valider :

| Action | Attribution proposée |
|---|---|
| Clic | Requête de recommandation source |
| Vue détail qualifiée | Même session, maximum 30 minutes |
| Favori | Maximum 24 heures après impression |
| Contact WhatsApp/appel | Maximum 24 heures après impression |
| Impression sans action | Exemple négatif après fermeture de la fenêtre de 24 heures |

Ces valeurs seront versionnées. Une modification ultérieure ne doit pas réinterpréter
silencieusement les datasets déjà produits.

## 5. Consentement et confidentialité — bloquant

Décision validée le 2026-09-13 :

- base de consentement : intérêt légitime (mesure d'audience/amélioration produit) avec réglage
  « Personnalisation » désactivable dans les paramètres du compte ; pas de bandeau bloquant à
  l'inscription ;
- personnalisation refusée/désactivée : l'utilisateur garde le score déterministe non
  personnalisé (pertinence, proximité budget, zone, récence, qualité) — pas de dégradation vers
  le classement Algolia brut, seules les features basées sur l'historique personnel sont exclues ;
- rétention des événements bruts : 90 jours puis purge ;
- rétention des agrégats anonymisés : 2 ans ;
- durée de la session anonyme : 30 jours ;
- pseudonymisation : UID hashé (hash + sel) avant écriture dans BigQuery, jamais l'UID brut ;
- suppression de l'historique à la demande : propagée aux événements bruts et à l'identifiant
  pseudonymisé associé ;
- lecture des données et métriques : rôles analytics existants du projet, pas d'accès public.

Valeurs interdites dans les événements et features : téléphone, description libre, adresse
exacte, coordonnées exactes, URL Storage, nom de fichier et identifiant Firebase brut dans les
tables d'entraînement.

## 6. Vérification du pipeline BigQuery

Confirmer par environnement :

- projet et dataset réellement créés ;
- tables et schémas disponibles ;
- événements qui arrivent déjà ;
- permissions des comptes de service ;
- séparation développement/production ;
- rétention, partitionnement et estimation de coût ;
- chemin de suppression d'un sujet pseudonymisé.

La documentation d'architecture admin existante est une cible ; elle ne constitue pas à elle
seule une preuve que le pipeline est déployé et alimenté.

## 7. Audit des signaux existants

État initial observé :

| Signal | Présent | Corrélé à une liste servie | Prêt pour ML |
|---|---:|---:|---:|
| Clic carte | Oui | À vérifier selon surface | Partiel |
| Vue détail | Oui | Pas systématiquement | Partiel |
| Favori | Oui | Pas systématiquement | Partiel |
| WhatsApp/appel | Oui | Pas systématiquement | Partiel |
| Statistiques agrégées par annonce | Oui | Non | Non pour entraîner par exposition |
| Clic Algolia recherche IA | Oui | Oui via query ID | Limité à cette surface |
| Impression réellement visible | Non | Non | Non |
| Position servie | Partielle | Partielle | Insuffisant |
| Masquage explicite | Non | Non | Non |

Livrable attendu : une matrice par composant indiquant événement, payload, destination,
déduplication, consentement et tests actuels.

## 8. Contrat événementiel

Figer avant l'instrumentation frontend :

- `eventId` et clé d'idempotence ;
- `recommendationRequestId` ;
- annonce, contexte et position ;
- variante et version de ranking ;
- temps événementiel et temps d'ingestion ;
- sujet pseudonymisé ou session anonyme ;
- query ID Algolia lorsqu'il existe ;
- règles de visibilité, déduplication et retard accepté ;
- liste blanche des propriétés autorisées.

Le contrat doit être compatible web, future application mobile, API d'ingestion et BigQuery.

## 9. Audit de l'index Algolia

Vérifier que chaque candidat fournit ou permet de joindre : catégorie, type, zones, prix,
attributs structurés, date, annonceur, nombre/qualité des images, promotion, disponibilité et
modération.

Un champ manquant doit être ajouté et réindexé avant d'être utilisé comme feature. Le service de
ranking ne doit pas faire une lecture Firestore par candidat.

## 10. Baseline déterministe

Figer les composantes, leur normalisation et leurs poids initiaux : pertinence Algolia,
proximité budget, correspondance géographique, récence, qualité, engagement lissé et exploration
des nouvelles annonces.

Chaque configuration reçoit une version. Le score doit rester pur, déterministe et testable avec
des fixtures.

## 11. Contraintes obligatoires

Écrire sous forme de tests les règles que le modèle ne peut jamais contourner : catégorie, zone,
budget explicitement strict, état actif, modération approuvée, disponibilité, blocage ou
signalement, exclusions utilisateur et règles de promotion.

## 12. Diversité et exploration

Valeurs initiales proposées :

- pas plus de deux annonces consécutives du même annonceur ;
- quota mesuré pour les nouvelles annonces ;
- réduction de répétition d'une annonce déjà vue ;
- exploration faible et journalisée ;
- analyse de concentration par ville, catégorie et annonceur.

Les valeurs définitives dépendront de la distribution réelle du catalogue.

## 13. Expérimentation

Premier test recommandé : 80 % classement actuel, 20 % baseline déterministe, avec affectation
stable par sujet/session. Le modèle entraîné commence ensuite en shadow mode, puis 1 %, 5 %, 25 %
et 50 %. Un groupe contrôle permanent est conservé.

**Décision produit du 2026-09-14 : appliqué à 100 % dès le lancement de la baseline**
(`RECOMMENDATION_BASELINE_TRAFFIC_PERCENT=100`), sans groupe témoin — écart assumé par rapport à
la recommandation ci-dessus. Conséquence explicite : aucune comparaison avant/après possible tant
qu'aucun trafic n'est repassé en `control`. Le mécanisme d'affectation par pourcentage reste en
place (variable d'environnement, kill switch à 0 %) si un groupe témoin doit être réintroduit plus
tard.

Définir avant lancement : durée minimale, taille minimale, métrique principale, garde-fous,
critère d'arrêt et personne habilitée à augmenter le trafic.

## 14. Baseline actuelle

Mesurer avant modification : CTR, favoris par impression, contacts par session, temps jusqu'au
contact, absence d'interaction, latence P50/P95 et distribution des impressions entre annonces
et annonceurs.

Sans impressions historiques fiables, commencer la baseline à partir du déploiement de la phase
de collecte et ne pas fabriquer de négatifs à partir des seules vues agrégées.

## 15. Environnements et rollback

Préparer : données synthétiques en développement, tables BigQuery séparées, feature flag,
version de ranking, kill switch vers Algolia, modèle immuable, dashboard erreurs/latence et
procédure de rollback testée.

## 16. Fixtures et couverture de tests

Créer des jeux de données couvrant immobilier, Mode, anonyme, connecté sans historique, connecté
avec historique, annonce nouvelle, promotion, modèle indisponible, pagination, filtres stricts,
événements rejoués et interactions du propriétaire à exclure.

## Registre des décisions

| Décision | Recommandation | Responsable | Statut | Preuve/lien |
|---|---|---|---|---|
| Surfaces MVP | Accueil + recherche classique | Produit | Validée | Conversation 2026-09-13 |
| Métrique principale | Contacts/session exposée | Produit/Data | Validée | Conversation 2026-09-13 |
| Impression | 50 % pendant 1 seconde | Produit/Data | Validée | Conversation 2026-09-13 |
| Attribution | 30 min vue, 24 h favori/contact | Produit/Data | Validée | Conversation 2026-09-13 |
| Consentement/rétention | Intérêt légitime + opt-out, 90j bruts/2 ans agrégats, UID hashé | Produit/Juridique | Validée | Conversation 2026-09-13 |
| Pipeline BigQuery | Réutiliser l'existant s'il est déployé | Tech/Data | À auditer | — |
| Baseline ranking | Score déterministe versionné | Tech/Produit | Proposé | — |
| Modèle v1 | Régression logistique offline | Tech/Data | Proposé | — |
| Expérience initiale | 100 % baseline, pas de groupe témoin | Produit/Data | Validée (écart assumé) | Conversation 2026-09-14 |

## Checklist GO / NO-GO

- [x] Surfaces MVP validées.
- [x] Métrique principale validée.
- [x] Définition d'impression validée.
- [x] Fenêtres d'attribution validées.
- [x] Consentement, rétention et suppression validés.
- [ ] Pipeline BigQuery audité.
- [ ] Matrice des événements actuels produite.
- [ ] Contrat événementiel version 1 approuvé.
- [ ] Index Algolia audité.
- [ ] Baseline actuelle mesurable.
- [ ] Kill switch et propriétaire du rollout identifiés.
- [ ] Fixtures de test préparées.
