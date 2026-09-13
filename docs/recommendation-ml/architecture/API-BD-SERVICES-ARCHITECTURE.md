# Architecture API, base de données et services

## Endpoint de recommandation

`POST /api/recommendations/listings`

Entrée : contexte (`home`, `search`, `similar`, `reel`), filtres, pagination, identifiant de
session et éventuellement annonce source. Le serveur déduit l'utilisateur depuis la session ;
il ne fait pas confiance à un UID fourni par le client.

Sortie : annonces, `recommendationRequestId`, variante, version de ranking et raisons publiques
limitées. Les scores internes complets ne sont pas exposés.

## Endpoint d'événements

`POST /api/recommendations/events`

Accepte un petit batch d'événements avec clé d'idempotence. Le serveur valide que l'annonce était
présente dans la requête de recommandation correspondante avant d'accepter une impression, un
clic ou une conversion attribuée.

Événements MVP : `impression`, `click`, `detail_view`, `favorite_add`, `favorite_remove`,
`contact_whatsapp`, `contact_phone`, `share`, `hide`.

## Flux de scoring

1. Authentifier ou résoudre la session anonyme.
2. Valider filtres et contexte.
3. Demander 50 candidats maximum à Algolia.
4. Enrichir avec des caractéristiques sûres et disponibles en batch.
5. Affecter une variante d'expérience stable.
6. Calculer les scores.
7. Appliquer contraintes, diversité, promotions et exploration contrôlée.
8. Persister la requête servie de façon non bloquante et retourner les résultats.
9. Accepter ensuite impressions et interactions corrélées.

## Autorisation

- recommandations : publiques avec rate limit ; personnalisation connectée uniquement depuis la
  session authentifiée ;
- événements : session signée ou token anti-abus, contrôle request/annonce ;
- publication de modèle : rôle interne dédié, jamais depuis l'application publique ;
- lecture des métriques : permissions analytics existantes ou permission dédiée.

## Idempotence

- `recommendationRequestId` unique par réponse ;
- `eventId` unique par événement client ;
- déduplication impression par request, annonce et fenêtre de visibilité ;
- activation modèle atomique via un pointeur vers une version immuable ;
- job d'entraînement identifié par fenêtre, code et configuration.

## Dépendances interdites

- le domaine de ranking ne dépend pas du SDK Firebase ou du client Algolia ;
- le modèle n'accède pas directement aux téléphones ou descriptions libres ;
- la collecte analytics ne peut pas faire échouer l'affichage ;
- les promotions ne sont pas encodées comme labels d'intérêt organique.

## Fallbacks

- Algolia indisponible : comportement actuel d'erreur/repli de recherche ;
- modèle absent, lent ou invalide : score déterministe ;
- profil absent : caractéristiques contextuelles et populaires normalisées ;
- historique trop court : exploration et récence ;
- événement non envoyé : aucun blocage de navigation.

