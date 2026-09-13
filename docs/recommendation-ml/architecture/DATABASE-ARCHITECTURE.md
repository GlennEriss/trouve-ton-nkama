# Architecture des données

## Événements bruts

Table logique `recommendation_events` :

| Champ | Rôle |
|---|---|
| `event_id` | idempotence |
| `occurred_at` | temps événementiel |
| `received_at` | temps d'ingestion |
| `anonymous_subject_id` | utilisateur/session pseudonymisé |
| `recommendation_request_id` | attribution à une liste servie |
| `listing_id` | annonce concernée |
| `event_name` | impression ou interaction |
| `context` | home/search/similar/reel |
| `position` | position effectivement affichée |
| `ranking_variant` | contrôle/baseline/modèle |
| `ranking_version` | version exacte |
| `query_id` | corrélation Algolia si disponible |
| `device_class` | classe générique, non fingerprintante |

Partitionner par date d'événement et clusteriser par événement, contexte et annonce. Définir la
rétention brute après revue légale ; conserver plus longtemps les agrégats anonymisés.

## Requêtes servies

`recommendation_requests` contient request ID, contexte, filtres normalisés, variante, version,
liste des candidats servis, positions et raisons techniques minimales. Les filtres ne doivent pas
inclure d'adresse libre.

## Caractéristiques

### Utilisateur/session

- catégories, zones et tranches de prix récemment consultées ;
- compteurs décroissants dans le temps pour clics, favoris et contacts ;
- nouveauté du profil et nombre d'interactions fiables.

### Annonce

- catégorie, zone, tranche de prix, attributs structurés ;
- âge, nombre/qualité technique des images ;
- taux d'interaction lissé et corrigé par impressions ;
- statut de modération et disponibilité ;
- indicateur nouvelle annonce pour garantir l'exploration.

### Contexte croisé

- distance relative au budget ;
- correspondance zone/catégorie/attribut ;
- similarité avec les interactions récentes ;
- récence depuis la dernière exposition.

Toutes les caractéristiques portent `computed_at`, version de définition et fenêtre de calcul.

## Labels

Le MVP produit deux labels :

- `engaged`: clic qualifié, favori ou consultation suffisamment longue ;
- `contacted`: WhatsApp ou appel après exposition attribuable.

Une impression sans action dans la fenêtre devient un exemple négatif seulement après fermeture
de cette fenêtre. Les retraits favoris et masquages restent des signaux séparés. Les données après
la date de prédiction ne peuvent jamais entrer dans les caractéristiques de cette prédiction.

## Biais à contrôler

- biais de position : les premiers résultats reçoivent naturellement plus de clics ;
- biais de popularité et d'ancienneté ;
- promotions payantes ;
- annonces sans historique ;
- actions du propriétaire ;
- bots, rafraîchissements et doubles événements ;
- domination d'une grande ville ou catégorie.

Conserver position et variante permet une correction ultérieure. Une petite exploration
contrôlée est nécessaire pour obtenir des données moins biaisées.

## Modèle et registre

Chaque artefact immuable contient : version, date, commit, fenêtre de données, définitions des
features, hyperparamètres, métriques, seuils de validation et checksum. Un document de
configuration atomique désigne la version active et la proportion de trafic.

