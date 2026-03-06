# Auth - Index Documentation

Cette section centralise la documentation des features d’authentification.

## Features

- FEATURE-001 Register: `FEATURE-001-REGISTER.md`
- FEATURE-002 Google OAuth: `FEATURE-002-GOOGLE-CONNEXION.md`
- FEATURE-003 Signin complet: `FEATURE-003-SIGNIN.md`
- FEATURE-004 Password Reset complet: `FEATURE-004-PASSWORD-RESET.md`

## Diagrammes

- Register sequence: `register-sequence-diagram.puml`
- Register activity: `register-activity-diagram.puml`
- Register activity (annonceur): `register-activity-diagram-annonceur.puml`
- Google signin sequence: `google-signin-sequence-diagram.puml`
- Signin sequence: `signin-sequence-diagram.puml`
- Signin activity: `signin-activity-diagram.puml`
- Password reset sequence: `password-reset-sequence-diagram.puml`
- Password reset activity: `password-reset-activity-diagram.puml`

## UX / UI

- Register UX: `ux.md`
- Register UI: `ui.md`
- Signin UX: `signin-ux.md`
- Signin UI: `signin-ui.md`

## Suivi d’avancement

- Progression register/signin: `PROGRESSION.md`
- Options register: `REGISTER_OPTIONS.md`
- Analyse existant: `ANALYSE_CODE_EXISTANT.md`

## Routage et protection d'accès

La protection des pages est centralisée dans:

- `src/middleware.ts`

### Catégories de routes

1. `protected` (connexion requise): préfixes `/property`, `/profil`, `/favoris`, `/settings`, `/list-notifications`, `/my-balance`, `/login-and-security`, `/verify-phone`, `/admin`.
2. `guest-only` (interdit si connecté): `/signin`, `/signup`, `/signin-signup`.
3. `profile-completion`: `/complete-profile` (accessible seulement si connecté).

### Règles de redirection

1. Non connecté + route protected => redirection `/signin?callbackUrl=<page demandée>`.
2. Non connecté + `/complete-profile` => redirection `/signin`.
3. Connecté + route guest-only => redirection `/property`.
4. Connecté mais profil incomplet + route protected/guest-only => redirection `/complete-profile`.
5. Connecté avec profil complet + `/complete-profile` => redirection `/property`.
