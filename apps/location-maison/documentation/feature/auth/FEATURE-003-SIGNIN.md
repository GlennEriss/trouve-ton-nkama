# FEATURE-003 : Signin (Session, Token, Refresh Token)

> **Périmètre** : page `/signin`, callbacks NextAuth, hooks session/auth  
> **Branche** : `feature/FEATURE-003-signin`  
> **Statut** : implémentation principale terminée, validation E2E à compléter  
> **Dernière mise à jour** : 2026-03-05

---

## 📋 Résumé exécutif

La feature 003 standardise complètement le signin:

- UI signin desktop/mobile alignée sur le design moderne du signup
- logique signin centralisée dans `useSignin` (credentials + OAuth)
- erreurs utilisateur unifiées (codes, messages, niveau de sévérité)
- gestion token OAuth Google avec refresh automatique côté callback JWT
- exposition d’un état session/token sécurisé côté client (`session.auth`)
- observabilité renforcée via logger structuré JSON

---

## 🎯 Objectifs

1. Unifier le comportement signin desktop/mobile (plus de divergence de logique).
2. Garantir une gestion robuste des tokens OAuth Google:
   - stockage token dans JWT serveur
   - refresh automatique avant expiration
   - remontée d’état de refresh côté session
3. Centraliser les erreurs signin pour produire des retours UX cohérents.
4. Améliorer l’exploitation:
   - logs corrélables
   - diagnostics plus rapides en cas d’incident auth.

---

## 🚫 Hors périmètre

- Migration de rôles User -> Announcer.
- Gestion détaillée du profil (feature profil dédiée).
- OTP téléphone (feature dédiée).
- Refonte complète du flow Facebook (seule la robustesse d’erreurs a été améliorée ici).

---

## ✅ Règles métier

1. Signin credentials exige un email vérifié (`Email is not verified` sinon).
2. Signin OAuth respecte la contrainte provider:
   - compte credentials-only + tentative OAuth => `wrong_provider`.
3. Les erreurs OAuth ne doivent pas aboutir à une page `AccessDenied` brute:
   - redirection contrôlée vers `/signin?error=<code>`.
4. Le refresh token Google reste côté JWT serveur et n’est jamais exposé côté client.
5. Le client reçoit un état synthétique de session token:
   - `provider`, `tokenStatus`, `accessTokenExpiresAt`, `tokenRefreshError`, `hasRefreshToken`.

---

## 🏗️ Architecture cible implémentée

## Backend auth (NextAuth)

- `src/next-auth/auth.config.ts`
  - callback `signIn`:
    - contrôle wrong provider
    - délégation Google au service `oauth-google.service`
    - gestion explicite Facebook errors
  - callback `jwt`:
    - enrichissement token OAuth
    - refresh automatique Google via `https://oauth2.googleapis.com/token`
  - callback `session`:
    - projection sécurisée de l’état auth dans `session.auth`

## Couche hooks

- `src/features/auth/hooks/useSignin.ts`
  - entrée unique pour signin credentials + Google
  - mapping d’erreurs centralisé (`mapSigninError`)
- `src/features/auth/hooks/useAuthSession.ts`
  - hook de lecture session/token
  - expose `secondsUntilExpiry` + `refreshSession()`
- `src/hooks/use-current-user.ts`
  - rétro-compatible
  - enrichi avec `auth` + `refreshSession`

## Couche UI

- Desktop:
  - `src/features/auth/ui/v1/SigninFormModern.tsx`
- Mobile:
  - `src/components/signin/SigninMobileComponent.tsx`
- Sélecteur viewport:
  - `src/components/signin/SigninComponent.tsx`

---

## 🔐 Modèle token/session

## JWT interne (serveur)

Champs utilisés:

- `oauthProvider`
- `oauthAccessToken`
- `oauthRefreshToken`
- `oauthAccessTokenExpiresAt`
- `oauthTokenRefreshError`

## Session exposée au client

`session.auth`:

- `provider: 'google' | 'facebook' | null`
- `accessTokenExpiresAt: number | null`
- `tokenStatus: 'none' | 'valid' | 'expired' | 'refresh_failed'`
- `tokenRefreshError: string | null`
- `hasRefreshToken: boolean`

Voir types: `src/models/next-auth.d.ts`.

---

## 🔄 Algorithme refresh Google

1. Le callback `jwt` compare `Date.now()` à `oauthAccessTokenExpiresAt`.
2. Si expiration imminente (buffer 60 secondes), déclenche refresh.
3. Appel `POST https://oauth2.googleapis.com/token` avec:
   - `grant_type=refresh_token`
   - `refresh_token`
   - `client_id`
   - `client_secret`
4. En succès:
   - met à jour `oauthAccessToken`
   - met à jour `oauthAccessTokenExpiresAt`
   - conserve ou remplace `oauthRefreshToken` si fourni
5. En échec:
   - conserve token actuel
   - remplit `oauthTokenRefreshError`
   - `session.auth.tokenStatus` passe à `refresh_failed`.

---

## 🧭 Flux fonctionnels détaillés

## A) Signin credentials

1. utilisateur soumet email/password sur `/signin`
2. `useSignin.signinWithCredentials()` appelle `signIn('credentials')`
3. callback `authorize`:
   - auth Firebase email/password
   - vérifie `emailVerified`
   - hydrate user via repository
4. callback `jwt` hydrate user session
5. redirect UI vers `/property`

## B) Signin Google

1. utilisateur clique "Continuer avec Google"
2. callback `signIn` NextAuth
3. `handleGoogleSignIn(...)`
4. succès:
   - session ouverte
   - user redirigé suivant règles middleware
5. erreur:
   - redirection `/signin?error=<code>`
   - message toast lisible côté UI

## C) Wrong provider

1. compte historique `CREDENTIALS` only
2. tentative OAuth
3. callback `signIn` renvoie `/signin?error=wrong_provider`
4. UI affiche message de guidance ("se connecter avec méthode initiale puis lier provider")

## D) Refresh token

1. session active Google
2. callback `jwt` déclenche refresh à l’approche de l’expiration
3. session continue sans interruption si refresh OK
4. en cas d’échec refresh, `session.auth.tokenStatus = refresh_failed`

---

## ❗ Catalogue d’erreurs signin

Mapping centralisé dans `useSignin.ts`:

| Code entrant | Code interne | Message UX |
|---|---|---|
| `Email is not verified` | `EMAIL_NOT_VERIFIED` | Vérifier email avant connexion |
| `auth/user-not-found` | `USER_NOT_FOUND` | Compte non trouvé |
| `auth/wrong-password` | `WRONG_PASSWORD` | Mot de passe incorrect |
| `auth/invalid-email` | `INVALID_EMAIL` | Format email invalide |
| `auth/user-disabled` | `USER_DISABLED` | Compte désactivé |
| `auth/too-many-requests` | `TOO_MANY_REQUESTS` | Trop de tentatives |
| `auth/network-request-failed` | `NETWORK_ERROR` | Erreur réseau |
| `wrong_provider` | `WRONG_PROVIDER` | Mauvaise méthode de connexion |
| `google_provider_disabled` | `GOOGLE_PROVIDER_DISABLED` | Provider Google non activé |
| `google_signin_failed` | `GOOGLE_SIGNIN_FAILED` | Echec Google signin |
| `facebook_provider_disabled` | `FACEBOOK_PROVIDER_DISABLED` | Provider Facebook non activé |
| `facebook_signin_failed` | `FACEBOOK_SIGNIN_FAILED` | Echec Facebook signin |
| `signin_callback_failed` | `SIGNIN_CALLBACK_FAILED` | Erreur interne callback signin |

---

## 📊 Logging et exploitation

Scopes principaux:

- `auth.next-auth`
- `auth.use-signin`
- `auth.signin-form-modern`
- `auth.use-auth-session`
- `auth.use-current-user`

Événements clés loggés:

- échec signin credentials (avec `code`)
- échec callback signin OAuth
- refresh token Google réussi/échoué
- session refresh client demandé

Données sensibles:

- redaction automatique assurée par `src/lib/logger.ts` (`token`, `refresh_token`, `authorization`, `cookie`, etc).

---

## 🛠️ Runbook incident (signin)

1. Vérifier logs `auth.next-auth` autour de l’horodatage de l’incident.
2. Identifier `error` query param renvoyé à `/signin`.
3. Si `google_provider_disabled`:
   - activer provider Google dans Firebase Auth.
4. Si `refresh_failed`:
   - vérifier `GOOGLE_CLIENT_ID/SECRET`
   - vérifier disponibilité endpoint OAuth Google
   - vérifier présence refresh token (`hasRefreshToken`).
5. Si `wrong_provider`:
   - incident produit attendu, pas un bug backend.

---

## 🔧 Variables d’environnement critiques

- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_CLIENT_ID`
- `FACEBOOK_CLIENT_SECRET`
- `NEXT_PUBLIC_HOST`

Note:
- pour obtenir un refresh token Google fiable, l’authorization request inclut `prompt=consent` + `access_type=offline`.

---

## 🧪 Stratégie de tests

## Déjà validé

- Unit tests service OAuth Google:
  - `src/features/auth/services/__tests__/oauth-google.service.test.ts`
- Unit tests hook signin:
  - `src/features/auth/hooks/__tests__/useSignin.test.ts`

Commande:

```bash
npm test -- --coverage=false src/features/auth/services/__tests__/oauth-google.service.test.ts src/features/auth/hooks/__tests__/useSignin.test.ts
```

## À compléter

- E2E signin credentials:
  - succès
  - mauvais mot de passe
  - email non vérifié
- E2E signin Google:
  - nouvel utilisateur
  - utilisateur existant
  - provider disabled
- Test manuel refresh:
  - forcer expiration courte et vérifier rotation token.

---

## ✅ Critères d’acceptation

1. Desktop/mobile utilisent le même socle logique signin.
2. Erreurs signin sont explicites et cohérentes.
3. OAuth Google ne casse pas la session à l’expiration du token access.
4. Le refresh token n’est pas exposé au client.
5. Les incidents signin sont diagnostiquables via logs structurés.

---

## 📎 Références

- Diagramme de séquence: `signin-sequence-diagram.puml`
- Diagramme d’activité: `signin-activity-diagram.puml`
- UX: `signin-ux.md`
- UI: `signin-ui.md`
