# FEATURE-004 : Password Reset (Request + Reset + Failure)

> **Périmètre** : `/request-password-reset`, `/password-reset`, `/password-reset-failure`, routes API reset password  
> **Branche** : `feature/FEATURE-004-password-reset`  
> **Statut** : implémenté (tests dédiés à compléter)  
> **Dernière mise à jour** : 2026-03-06

---

## 📋 Résumé exécutif

La feature 004 vise à:

- aligner le design reset password (mobile/tablette/desktop) sur le système visuel signin/signup,
- sortir la logique métier des composants UI (plus de `fetch` direct depuis la vue),
- standardiser les erreurs, logs et parcours utilisateur du reset password.

---

## 🎯 Objectifs

1. Uniformiser l'expérience visuelle auth sur les pages reset password.
2. Séparer clairement UI / Hook / Service pour le flow reset.
3. Centraliser les erreurs métier (lien expiré, lien invalide, mot de passe faible, rate limit).
4. Garder la compatibilité avec les endpoints API existants.

---

## 🚫 Hors périmètre

- Changement de provider email.
- Refonte complète du template email (`src/emails/PasswordReset.tsx`).
- Changement de règles de sécurité Firebase Auth.
- Politique cookies / consentement (feature conformité dédiée, plus tard).

---

## ⚠️ Problèmes identifiés (avant refactor)

- Composants reset monolithiques (`PasswordResetRequest`, `PasswordReset`) avec `fetch` direct.
- Duplication de logique d'erreurs côté UI.
- Design non aligné avec `SigninFormModern` / `SignupFormModern`.
- Responsiveness non pilotée comme les autres écrans auth V1.

---

## 🏗️ Architecture cible

## Couche service (métier)

Fichiers cibles:

- `src/features/auth/services/password-reset.service.interface.ts`
- `src/features/auth/services/password-reset.service.ts`

Responsabilités:

- encapsuler les appels API reset password,
- normaliser les erreurs en codes stables,
- retourner des résultats typés (`success`, `error`, `retryAfter`, etc).

## Couche hooks (orchestration UI)

Fichiers cibles:

- `src/features/auth/hooks/usePasswordResetRequest.ts`
- `src/features/auth/hooks/usePasswordReset.ts`

Responsabilités:

- état local standardisé (`isLoading`, `error`, `success`, `countdown`),
- orchestration des appels service,
- mapping d’erreurs vers messages UX.

## Couche UI

Fichiers cibles:

- `src/components/password-reset/PasswordResetRequest.tsx` (refactor design + branchement hook)
- `src/components/password-reset/PasswordReset.tsx` (refactor design + branchement hook)
- `src/components/password-reset/PasswordResetFailure.tsx` (alignement design auth)

Principes:

- desktop/tablette: layout moderne cohérent avec signin/signup,
- mobile: variante simplifiée mais même direction visuelle et mêmes messages.

## Couche API (inchangée côté contrat)

Routes utilisées:

- `POST /api/auth/send-password-reset-email`
- `GET|POST /api/auth/password-reset`

Le refactor UI/hooks/services ne casse pas le contrat API existant.

---

## 🧭 Flux fonctionnels

## A) Demande de réinitialisation

1. utilisateur saisit son email sur `/request-password-reset`
2. hook `usePasswordResetRequest` appelle `passwordResetService.requestReset(...)`
3. succès: écran de confirmation + CTA retour signin
4. échec:
   - `RATE_LIMIT_EXCEEDED`: countdown + désactivation bouton
   - `USER_NOT_FOUND` / `USER_DISABLED` / `INVALID_EMAIL`: message explicite

## B) Soumission nouveau mot de passe

1. utilisateur arrive via lien `/api/auth/password-reset?oobCode=...` -> redirect `/password-reset?oobCode=...`
2. hook `usePasswordReset` valide présence `oobCode`
3. soumission `newPassword` via service
4. succès: écran succès + CTA connexion
5. `EXPIRED_OOB_CODE` / `INVALID_OOB_CODE`: redirection `/password-reset-failure`

## C) Échec de réinitialisation

1. page `/password-reset-failure` affiche causes + actions recommandées
2. CTA principal vers `/request-password-reset`

---

## ❗ Catalogue d’erreurs (cible)

| Code | Comportement UI |
|---|---|
| `INVALID_EMAIL` | erreur de validation |
| `USER_NOT_FOUND` | compte non trouvé |
| `USER_DISABLED` | compte désactivé |
| `RATE_LIMIT_EXCEEDED` | message + `retryAfter` + countdown |
| `EXPIRED_OOB_CODE` | redirection failure |
| `INVALID_OOB_CODE` | redirection failure |
| `WEAK_PASSWORD` | message validation sécurité |
| `NETWORK_ERROR` | message réseau |
| `UNKNOWN_ERROR` | fallback générique |

---

## 📊 Observabilité

Scopes attendus:

- `auth.password-reset-service`
- `auth.use-password-reset-request`
- `auth.use-password-reset`
- `auth.password-reset-request-ui`
- `auth.password-reset-ui`
- API existants (`api.auth.send-password-reset-email`, `api.auth.password-reset`)

Règle:

- ne jamais logger de secrets (`token`, `cookie`, etc) en clair (garanti via `src/lib/logger.ts`).

---

## 🧪 Stratégie de test

## Unit

- service password reset: mapping erreurs API -> codes métier
- hooks: transitions d’états (loading/success/error/countdown)

## UI

- rendu mobile vs desktop
- états: initial / success / error / rate-limited
- boutons CTA et liens de navigation

## E2E

- request reset success
- request reset rate limit
- reset success avec `oobCode` valide
- reset failure avec `oobCode` expiré/invalide

---

## ✅ Critères d’acceptation

1. Design reset password cohérent avec signin/signup sur mobile/tablette/desktop.
2. Aucun `fetch` direct dans les composants UI reset.
3. Erreurs centralisées et cohérentes.
4. Parcours complet fonctionne sans régression API.
5. Logs structurés présents pour diagnostic incident.

---

## 📎 Références

- `password-reset-sequence-diagram.puml`
- `password-reset-activity-diagram.puml`
- `src/app/api/auth/send-password-reset-email/route.ts`
- `src/app/api/auth/password-reset/route.ts`
