# FEATURE-004 - Devenir Annonceur

## 1. Contexte

Le modele RBAC defini dans le projet impose la regle suivante:

- un `Announcer` peut faire tout ce qu'un `User` peut faire
- un `User` simple ne peut pas acceder aux fonctionnalites annonceur

Donc la transition "devenir annonceur" ne doit pas remplacer le role `User`.
Elle doit ajouter `Announcer` tout en conservant `User`.

References:

- `documentation/uml/use-cases-utilisateur.puml`
- `documentation/uml/use-cases-annonceur.puml`
- `documentation/feature/users/README.md`
- `documentation/feature/users/gestion-du-profil/FEATURE-001-GESTION-PROFIL.md`

## 2. Objectif fonctionnel

Permettre a un utilisateur connecte avec role `User` de devenir `Announcer` via un parcours explicite et securise.

Resultat attendu:

- roles finaux: `[User, Announcer]`
- acces immediat aux routes/fonctions annonceur
- conservation de toutes les capacites user

## 3. RBAC et acces

### 3.1 Etat initial autorise

- utilisateur connecte avec `roles` contenant `User`
- `roles` ne contient pas encore `Announcer`

### 3.2 Etat final

- `roles` contient `User` et `Announcer`

### 3.3 Cas deja annonceur

- operation idempotente
- aucun changement de role
- reponse explicite `ALREADY_ANNOUNCER`

### 3.4 Hors scope RBAC

- role `Admin`
- suppression du role `Announcer`

## 4. Regles metier

1. Regle de role
- Toujours conserver `User`.
- Ajouter `Announcer` sans duplication.

2. Regle des conditions annonceur
- l'utilisateur doit accepter les conditions annonceur au moment de la transition.

3. Regle de securite minimale
- utilisateur authentifie obligatoire.
- mise a jour role uniquement cote serveur (jamais trust client).

4. Regle de traçabilite
- journaliser la transition avec `scope`, `uid`, ancien/nouveau role set.

5. Regle de non-regression session
- session NextAuth doit etre rafraichie apres mise a jour reussie.

## 5. Experience utilisateur cible

1. Depuis `/profil`, l'utilisateur clique sur "Devenir annonceur".
2. L'application affiche:
- benefices annonceur
- obligations legales
- case d'acceptation des conditions annonceur
3. L'utilisateur confirme.
4. Si succes:
- toast succes
- session mise a jour
- redirection vers espace annonceur (`/add-property` ou dashboard annonceur)

## 6. Routes et points d'entree

Routes UI cibles:

- entree: `/profil`
- ecran dedie: `/profil/devenir-annonceur` (ou modal depuis `/profil`)

Route API cible:

- `POST /api/users/become-announcer`

Payload minimal:

```json
{
  "acceptAnnouncerTerms": true
}
```

Response succes:

```json
{
  "success": true,
  "code": "BECOME_ANNOUNCER_SUCCESS",
  "roles": ["User", "Announcer"]
}
```

## 7. Gestion des erreurs

Codes metier proposes:

- `UNAUTHENTICATED`
- `FORBIDDEN_ROLE_STATE` (pas de role User initial)
- `ANNOUNCER_TERMS_REQUIRED`
- `ALREADY_ANNOUNCER`
- `USER_NOT_FOUND`
- `PERSISTENCE_ERROR`
- `SESSION_SYNC_ERROR`

Regles UX:

- message actionnable pour chaque code
- pas de details techniques bruts en UI

## 8. Observabilite et incident

Scopes de logs cibles:

- `users.become-announcer.ui`
- `users.become-announcer.hook`
- `users.become-announcer.service`
- `api.users.become-announcer`

Evenements a logger:

- tentative de transition
- refus precondition (`terms`, role state)
- succes de migration role
- erreur persistence/session

Context log minimal:

- `uid`
- `oldRoles`
- `newRoles`
- `resultCode`

## 9. Architecture cible (feature-based)

Arborescence cible:

- `src/features/users/become-announcer/services/`
- `src/features/users/become-announcer/hooks/`
- `src/features/users/become-announcer/ui/v1/`
- `src/features/users/become-announcer/__tests__/`

Composants cibles:

- `BecomeAnnouncerService`
- `useBecomeAnnouncer`
- `BecomeAnnouncerPageModern` (ou section integree profil)

Regles:

- la page `app/` reste un entrypoint
- pas d'appel DB direct depuis UI
- update roles centralise dans service

## 10. Impact donnees

Document `users/{uid}`:

- champ `roles`: ajouter `Announcer` si absent
- ne jamais supprimer `User`

Extensions recommandees:

- `metadata.becomeAnnouncerAt` (timestamp)
- `metadata.becomeAnnouncerSource` (`profile`)

## 11. Tests cibles

### 11.1 Unitaires service

- succes `User -> User+Announcer`
- refus sans acceptation conditions
- idempotence deja annonceur
- erreur persistence

### 11.2 Unitaires hook

- etats `loading/success/error`
- mapping erreur -> message
- synchro session apres succes

### 11.3 Integration

- parcours UI complet depuis `/profil`
- verification de redirection apres succes
- non-regression acces routes annonceur

## 12. Criteres d'acceptation

1. Metier
- un user simple devient annonceur avec roles finaux `[User, Announcer]`.
- un annonceur deja actif ne casse pas le parcours (idempotence).

2. Securite
- impossible de devenir annonceur sans etre authentifie.
- impossible de bypass l'acceptation des conditions annonceur.

3. UX
- parcours clair, etat de chargement visible, feedback succes/erreur explicite.

4. Technique
- logique metier extraite dans `src/features/users/become-announcer`.
- logs structures disponibles pour diagnostic incident.

## 13. Hors scope

- creation detaillee d'un `AnnouncerProfile`
- verification telephone obligatoire pendant la migration
- moderation manuelle admin
- downgrade de role

## 14. Plan de realisation

1. Documentation et validation fonctionnelle (ce document + diagrams)
2. Creation module `become-announcer` (service/hook/UI)
3. Wiring route API + update session
4. Integration `/profil` + route dediee
5. Tests unitaires/integration
6. Validation manuelle user journey
