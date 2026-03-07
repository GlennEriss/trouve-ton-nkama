# FEATURE-005 - Nouvelles Annonces

## 1. Contexte

Dans `/settings`, le parametre `isNewAnnouncement` existe deja mais n'etait pas relie a un pipeline metier robuste.

Le point 3 introduit un flux serveur Cloud Functions qui envoie des notifications in-app quand une nouvelle annonce est publiee et qu'elle correspond au profil de notification de l'utilisateur.

---

## 2. Objectif

Mettre en place un systeme fiable de notification "nouvelles annonces" avec:

1. preference utilisateur respectee (`isNewAnnouncement`)
2. matching region/criteres
3. idempotence (pas de doublons pour la meme annonce et le meme destinataire)
4. non blocage du flux de publication annonceur

---

## 3. Regles metier v1

1. Canal v1: in-app uniquement.
2. Source evenement: trigger Firestore `onCreate` sur `properties/{propertyId}`.
3. Destinataires: utilisateurs avec `notificationParameter.isNewAnnouncement = true`.
4. Exclusion: l'annonceur createur ne recoit pas sa propre notification.
5. Matching:
- si criteres explicites presents dans `metadata.newAnnouncementCriteria`, ils sont appliques
- sinon fallback sur `country.code` du profil utilisateur
- si aucun critere ni pays, match global
6. Dedupe: cle `propertyId + uid` dans collection technique.

---

## 4. Architecture

Module cloud function:

- `functions/src/notification/index.ts` (trigger `onPropertyCreateNewAnnouncement`)

Composants:

- policy de matching region/criteres (dans le trigger)
- dispatch in-app vers collection `notifications`
- dedupe via collection `new_announcement_dispatch`

---

## 5. Donnees

Entrees minimales annonce:

- `id`
- `createdBy`
- `countryCode`
- `province`
- `city`
- `typeProperty`

Entrees utilisateur:

- `uid`
- `notificationParameter.isNewAnnouncement`
- `country.code`
- `metadata.newAnnouncementCriteria` (optionnel)

Sortie notification:

- `type: ANNOUNCEMENT`
- `title`
- `message`
- `actionUrl` vers `/houseDetails/:id`
- `createdFor`

---

## 6. Erreurs et observabilite

Scopes logger:

- `notification.onPropertyCreateNewAnnouncement` (Cloud Functions logs)

Principes:

- echec notification => non bloquant pour publication annonce
- logs structures avec `propertyId`, `publishedByUid`, compteurs de dispatch

---

## 7. Criteres d'acceptation

1. Une annonce publiee declenche automatiquement le trigger Cloud Functions.
2. Seuls les utilisateurs eligibles recoivent la notification.
3. Un meme utilisateur ne recoit pas deux fois la meme annonce.
4. `isNewAnnouncement = false` bloque la reception.
5. Le createur de l'annonce est exclu.

---

## 8. Hors scope

- push PWA
- envoi email systematique des nouvelles annonces
- UI de parametrage avance des criteres (v2)
