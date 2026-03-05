# FEATURE-002 : Connexion Google (OAuth)

> **Périmètre** : authentification Google via NextAuth + Firebase Auth  
> **Statut** : cadrage validé (implémentation/refactor à enchaîner)  
> **Dernière mise à jour** : 2026-03-05

---

## 🎯 Objectif

Définir un flux Google cohérent avec la stratégie auth actuelle:

- séparation claire entre authentification et gestion de profil
- cohérence des rôles `User` / `Announcer`
- gestion propre des cas "mauvais provider"
- onboarding Google lisible et testable

---

## ✅ Décisions Produit (cohérence demandée)

### 1) Si un utilisateur crée un compte avec Google, quel type de compte est créé ?

**Décision** : un compte Google créé pour la première fois est un compte **`User`**.

- rôles créés : `['User']`
- provider initial : `['GOOGLE']`
- complétion de profil obligatoire (`/complete-profile`) si infos manquantes

### 2) Si un annonceur veut créer son compte avec Google, que propose-t-on ?

**Décision** : parcours en 2 temps.

1. authentification Google + création de compte en `User`
2. activation du rôle annonceur via la feature dédiée (migration / gestion profil annonceur), hors scope de FEATURE-002

Ce choix évite de mélanger OAuth, obligations annonceur et gestion de profil dans un seul flux.

---

## 🧭 Flux fonctionnels

### Flux A - Nouvel utilisateur Google

1. clic "Continuer avec Google" (signin/signup)
2. callback NextAuth Google
3. si email inexistant: création compte auth + document user minimal
4. session ouverte
5. middleware redirige vers `/complete-profile` tant que profil incomplet
6. après complétion: accès au parcours normal

### Flux B - Compte existant déjà lié à Google

1. connexion Google
2. session ouverte
3. redirection normale (pas de recréation de compte)

### Flux C - Email existant mais provider différent (credentials only)

1. tentative Google
2. refus avec `wrong_provider`
3. message utilisateur: se connecter avec le provider initial
4. liaison de provider depuis "Login & Security"

### Flux D - Provider Google Firebase désactivé

1. callback OAuth Google réussi côté NextAuth
2. échec Firebase `auth/operation-not-allowed`
3. redirection contrôlée vers `/signin?error=google_provider_disabled`
4. toast explicite côté UI (action: activer Google provider dans Firebase Auth)

---

## 📐 Règles métier à respecter

- FEATURE-002 ne crée pas `AnnouncerProfile`.
- FEATURE-002 ne déclenche pas la migration `User -> Announcer`.
- un compte `Announcer` conserve toujours les capacités `User` (rôles `['User', 'Announcer']`) mais cette attribution n'est pas gérée ici.

---

## 🔎 État actuel du code

Fichier principal: `src/next-auth/auth.config.ts`

État après refactor en cours:

- logique Google extraite dans `src/features/auth/services/oauth-google.service.ts`
- création Google alignée sur `roles: ['User']`
- callback NextAuth Google aligné sur `features/auth/repositories/user.repository`
- flux Facebook reste partiellement sur `src/db/user.db.ts` (hors scope immédiat FEATURE-002)

Points déjà en place et réutilisables:

- redirection vers `/complete-profile` pour profil incomplet (`src/middleware.ts`)
- écran de complétion profil (`src/app/(auth)/complete-profile/page.tsx`)
- gestion `wrong_provider` côté UI signin

---

## 🏗️ Cible technique (refactor)

### Structure cible

```
src/features/auth/
├── services/
│   └── oauth-google.service.ts
├── repositories/
│   └── user.repository.ts
├── hooks/
│   └── useGoogleAuth.ts
└── __tests__/
    ├── oauth-google.service.test.ts
    └── oauth-google.integration.test.ts
```

### Comportement cible de création user Google

- `roles: ['User']`
- `providers: ['GOOGLE']`
- `metadata.needsProfileCompletion: true` tant que profil incomplet
- jamais de création `AnnouncerProfile` dans ce flux

---

## ✅ Checklist FEATURE-002

### Phase 1 - Cadrage

- [x] Règle métier `Google => User` validée
- [x] Règle métier "Announcer via Google = migration dédiée" validée
- [x] Hors scope `AnnouncerProfile` explicité

### Phase 2 - Refactor OAuth Google

- [x] Extraire la logique Google de `next-auth/auth.config.ts` vers un service dédié
- [x] Remplacer le champ legacy `role` par `roles` (flux Google)
- [x] Créer les nouveaux comptes Google avec `roles: ['User']`
- [x] Aligner l'accès Firestore Google avec le repository auth refactoré

### Phase 3 - UX et erreurs

- [x] Uniformiser les erreurs `wrong_provider` (codes + messages)
- [x] Ajouter un message explicite "connectez-vous puis liez Google dans Login & Security"
- [x] Garder la redirection `/complete-profile` pour données manquantes

### Phase 4 - Tests

- [x] Unit tests service OAuth Google
- [x] Integration tests NextAuth callback + persistence user
- [x] E2E partiel: déclenchement endpoint Google depuis signup (`/api/auth/signin/google`)
- [ ] E2E: signin Google nouveau user + user existant + wrong provider

---

## 🧪 Critères d'acceptation

- un nouvel utilisateur Google n'est jamais créé directement annonceur
- un annonceur existant peut lier Google sans perdre ses rôles
- aucun flux Google ne crée `AnnouncerProfile`
- les cas `wrong_provider` sont gérés de manière compréhensible côté UI

---

## 🔗 Diagramme de séquence

Voir: [`google-signin-sequence-diagram.puml`](./google-signin-sequence-diagram.puml)
