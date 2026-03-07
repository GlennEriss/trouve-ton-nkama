# FEATURE-006 - Favoris Annonces

## 1. Contexte

Dans `/settings`, le parametre `isFavoris` existe deja pour les notifications.

Le point 4 relie ce parametre a un pipeline metier serveur Cloud Functions pour couvrir 2 evenements:

1. mise a jour d'une annonce en favoris
2. suppression d'une annonce en favoris

---

## 2. Objectif

Mettre en place un flux robuste de notifications "Favoris" avec:

1. respect strict de la preference `isFavoris`
2. notification in-app sur changements utiles de l'annonce
3. nettoyage automatique des favoris si annonce supprimee
4. execution non bloquante pour le flux principal annonceur

---

## 3. Regles metier v1

1. Canal v1: in-app uniquement.
2. Source evenement:
- `onUpdate(properties/{propertyId})`
- `onDelete(properties/{propertyId})`
3. Destinataires: utilisateurs ayant `propertyId` dans `favoris`.
4. Preference:
- `notificationParameter.isFavoris = true` => notification envoyee
- `false` => pas de notification
5. Changement pertinent (update):
- champs surveilles: `title`, `price`, `city`, `province`, `street`, `status`, `state`, `typeProperty`, `description`, `images`
- si aucun champ surveille ne change => aucune notification
6. Suppression:
- suppression automatique de `propertyId` dans `users.favoris`
- notification "annonce indisponible" vers `/favoris`

---

## 4. Architecture

Module cloud function:

- `functions/src/notification/index.ts`

Policy dediee:

- `functions/src/notification/favoris-property-policy.ts`

Triggers:

- `onPropertyFavorisUpdate`
- `onPropertyFavorisDelete`

---

## 5. Donnees

Entrees annonce:

- `id`
- `title`
- champs surveilles de comparaison

Entrees utilisateur:

- `uid`
- `favoris: string[]`
- `notificationParameter.isFavoris`

Sortie notification:

- `type: BOOKMARKING`
- `title`
- `message`
- `actionUrl` (`/houseDetails/:id` ou `/favoris`)
- `createdFor`

---

## 6. Erreurs et observabilite

Principes:

- echec de notification => non bloquant
- echec de nettoyage `favoris` => logge, puis continuation
- logs structures Cloud Functions avec `propertyId`, `notificationsCreated`, `recipientsSkipped`, `favorisCleaned`

---

## 7. Criteres d'acceptation

1. Une mise a jour pertinente d'annonce notifie les utilisateurs concernes ayant `isFavoris=true`.
2. Une mise a jour non pertinente n'envoie pas de notification.
3. La suppression d'annonce retire automatiquement l'annonce des favoris utilisateurs.
4. La suppression d'annonce notifie uniquement les utilisateurs ayant `isFavoris=true`.
5. Le traitement reste non bloquant en cas d'erreur partielle.

---

## 8. Hors scope

- push PWA
- envoi email automatique des changements favoris
- parametrage fin par type de changement (prix seulement, statut seulement, etc.)
