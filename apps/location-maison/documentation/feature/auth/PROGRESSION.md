# Progression FEATURE-001 : Register

> **Branche** : `feature/FEATURE-001-register`  
> **Objectif** : parcours signup cohérent (User / Announcer), testable, observable

---

## Synthèse

### Ce qui est fait

- Inscription desktop/tablette: `SignupFormModern` + `useSignup`
- Inscription mobile: `SignupMobileComponent` branché sur `useSignup`
- Service auth: `AuthServiceImpl` (validations, rollback, mapping erreurs)
- Repository user: `UserRepositoryImpl` (UID comme docId Firestore)
- Hook: `useSignup` (loading/error/success)
- Distinction compte `User` / `Announcer` active dans les formulaires signup (desktop/mobile)
- Validation conditionnelle des conditions annonceur (`acceptAnnouncerTerms`)
- Envoi email de vérification: endpoint dédié et flux non bloquant
- Logger centralisé: `src/lib/logger.ts` intégré au flux auth
- Gestion d’erreurs API auth centralisée: `src/lib/api/error-response.ts`

### Ce qui manque

- [ ] Tests d’intégration signup avec Firebase Emulator
- [ ] E2E signup complets (User + Announcer)
- [ ] Couverture auth >= 80%

### Hors périmètre signup

- Gestion des profils (User/Annonceur), incluant `AnnouncerProfile` : traitée dans une feature dédiée profil

---

## Phases

## ✅ Phase 1 : Préparation

- Analyse existant
- Spécifications UX/UI
- Diagrammes de séquence et d’activité

## ✅ Phase 2 : Repository

Fichiers:

- `src/features/auth/repositories/user.repository.interface.ts`
- `src/features/auth/repositories/user.repository.ts`
- `src/features/auth/repositories/__tests__/user.repository.test.ts`

Points clés:

- CRUD utilisateur + soft delete
- erreurs repository uniformisées via `RepositoryError`
- UID utilisé comme ID de document principal

## ✅ Phase 3 : Service

Fichiers:

- `src/features/auth/services/auth.service.interface.ts`
- `src/features/auth/services/auth.service.ts`
- `src/features/auth/services/__tests__/auth.service.test.ts`

Points clés:

- validations métier (`acceptTerms`, conditions annonceur)
- unicité email/téléphone
- création Firebase Auth + persistance Firestore
- rollback `signOut` si échec Firestore
- envoi email de vérification non bloquant

## ✅ Phase 4 : Hook

Fichier:

- `src/features/auth/hooks/useSignup.ts`

Points clés:

- encapsulation d’appel `authService.signup`
- état local standardisé (`isLoading`, `error`, `userId`, `reset`)

## ✅ Phase 5 : UI signup

Fichiers:

- `src/features/auth/ui/v1/SignupFormModern.tsx`
- `src/features/auth/ui/v1/SignupForm.tsx`
- `src/components/signup/SignupMobileComponent.tsx`
- `src/features/auth/ui/v1/signup.mapper.ts`

Points clés:

- mapping formulaire -> `SignupData` factorisé
- mobile aligné sur le même service auth que desktop
- suppression de la logique d’inscription legacy côté mobile

## ✅ Phase 6 : Observabilité + erreurs centralisées

Fichiers:

- `src/lib/logger.ts`
- `src/lib/errors/app-error.ts`
- `src/lib/api/error-response.ts`

Routes auth alignées:

- `src/app/api/auth/send-verification-email/route.ts`
- `src/app/api/auth/send-password-reset-email/route.ts`
- `src/app/api/auth/password-reset-request/route.ts`
- `src/app/api/auth/password-reset/route.ts`
- `src/app/api/auth/verify-email/route.ts`

Points clés:

- logs JSON structurés + redaction des clés sensibles
- réponse d’erreur API uniforme (`success:false`, `error.code`, `error.message`, `error.details`)
- mapping des codes d’erreurs externes (Firebase) vers codes projet stables

## ⏳ Phase 7 : Tests restants

- compléter les tests UI signup avancés (navigation multi-step complète)
- compléter E2E signup (desktop + mobile, user + announcer)
- confirmer la couverture cible globale projet

---

## 🚀 Phase suivante : FEATURE-003 Signin (démarrée)

Objectif:
- refactor `/signin` (desktop/mobile) avec design aligné sur `/signup`
- centraliser les erreurs de connexion
- gérer token + refresh token OAuth Google dans NextAuth
- exposer l’état session/token via hook dédié

État:
- [x] callback `signIn` NextAuth: Google service + logging + erreurs contrôlées
- [x] callback `jwt`: stockage token OAuth + refresh automatique
- [x] callback `session`: exposition `session.auth` (status token)
- [x] hook `useSignin` (credentials + Google + mapping erreurs)
- [x] hook `useAuthSession` + enrichissement `useCurrentUser`
- [x] nouveau `SigninFormModern` + mobile branché sur `useSignin`
- [x] documentation complète FEATURE-003 (`FEATURE-003-SIGNIN.md`, `signin-sequence-diagram.puml`, `signin-activity-diagram.puml`, `signin-ux.md`, `signin-ui.md`)
- [x] tests unitaires `useSignin`
- [ ] E2E signin complets (credentials + Google + erreurs provider)

---

## 🚀 Phase suivante : FEATURE-004 Password Reset (démarrée)

Objectif:
- refactor complet du flux reset password (`/request-password-reset`, `/password-reset`, `/password-reset-failure`)
- alignement design mobile/tablette/desktop avec signin/signup modernes
- séparation architecture UI/hook/service (suppression des `fetch` directs dans la vue)
- standardisation des erreurs + observabilité

État:
- [x] branche `feature/FEATURE-004-password-reset` créée depuis `develop`
- [x] documentation complète FEATURE-004 (`FEATURE-004-PASSWORD-RESET.md`)
- [x] diagrammes ajoutés (`password-reset-sequence-diagram.puml`, `password-reset-activity-diagram.puml`)
- [x] implémentation refactor UI/hook/service
- [x] pages reset password alignées visuellement avec signin/signup (mobile/tablette/desktop)
- [x] suppression des `fetch` directs dans les composants reset
- [ ] tests unitaires/hooks/ui du flux reset
- [ ] validation E2E du parcours reset

---

## Validation test (batch auth)

Suites exécutées et passantes:

- `src/features/auth/services/__tests__/auth.service.test.ts`
- `src/features/auth/__tests__/integration/signup.integration.test.ts`
- `src/features/auth/hooks/__tests__/useSignup.test.ts`
- `src/features/auth/repositories/__tests__/user.repository.test.ts`
- `src/features/auth/ui/v1/__tests__/SignupForm.test.tsx`
- `src/features/auth/ui/v1/__tests__/SignupFormModern.test.tsx`
- `src/features/auth/hooks/__tests__/useSignin.test.ts`

---

*Dernière mise à jour : 2026-03-06*
