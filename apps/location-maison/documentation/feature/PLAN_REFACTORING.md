# Plan de Refactoring - Plateforme Location Maison Gabon

> Basé sur l'analyse UML et le workflow défini dans `WORKFLOW.md`

---

## 🎯 Objectif

Refactoriser l'application selon l'architecture proposée dans `ANALYSE_PROBLEMES.md` en suivant les use cases UML et le workflow défini.

---

## 📋 Ordre de Refactoring (par dépendances)

### Phase 1 : Authentification & Base Utilisateur ⭐ **COMMENCER ICI**

**Priorité** : 🔴 **CRITIQUE** - Base de toutes les fonctionnalités

#### 1.1) Inscription (Register) - **FEATURE-001**
- **Use Case** : `UC_Signup` (Visiteur)
- **Fichiers actuels** :
  - `src/components/signup/Signup.tsx`
  - `src/components/signup/SignupMobileComponent.tsx`
  - `src/actions/register.ts` (si existe)
  - `src/db/user.db.ts`
- **Refactoring** :
  - ✅ Séparation UI / Logique métier
  - ✅ Service layer pour l'authentification
  - ✅ Repository pattern pour Firestore
  - ✅ Gestion d'erreurs cohérente (pas de mélange null/throw/false)
  - ✅ Tests unitaires (Jest)
  - ✅ Tests d'intégration (Firebase Emulator)
  - ✅ Tests E2E (Playwright)
- **Structure cible** :
  ```
  src/
  ├── features/
  │   └── auth/
  │       ├── components/
  │       │   └── SignupForm.tsx
  │       ├── services/
  │       │   └── auth.service.ts
  │       ├── repositories/
  │       │   └── user.repository.ts
  │       ├── hooks/
  │       │   └── useSignup.ts
  │       └── __tests__/
  │           ├── signup.test.ts
  │           ├── signup.integration.test.ts
  │           └── signup.e2e.test.ts
  ```

#### 1.2) Connexion (Login) - **FEATURE-002**
- **Use Case** : `UC_Login` (Visiteur)
- **Fichiers actuels** :
  - `src/actions/login.ts`
  - `src/components/login/` (si existe)
- **Refactoring** : Même approche que Register

#### 1.3) OAuth (Google/Facebook) - **FEATURE-003**
- **Use Case** : `UC_Google`, `UC_Facebook` (Visiteur)
- **Refactoring** : Service OAuth dédié

#### 1.4) Réinitialisation mot de passe - **FEATURE-004**
- **Use Case** : `UC_ResetPwd` (Visiteur)
- **Refactoring** : Service password reset

#### 1.5) Vérification email - **FEATURE-005**
- **Use Case** : `UC_VerifyEmail` (Utilisateur)
- **Refactoring** : Service email verification

**Livrables Phase 1** :
- [ ] Feature Register complète avec tests
- [ ] Feature Login complète avec tests
- [ ] Feature OAuth complète avec tests
- [ ] Feature Password Reset complète avec tests
- [ ] Feature Email Verification complète avec tests
- [ ] Couverture de tests >= 80%
- [ ] Documentation feature dans `documentation/feature/auth/`

---

### Phase 2 : Gestion du Profil Utilisateur

**Priorité** : 🟡 **HAUTE** - Nécessaire après authentification

#### 2.1) Consultation du profil - **FEATURE-006**
- **Use Case** : `UC_ViewProfile` (Utilisateur)

#### 2.2) Modification du profil - **FEATURE-007**
- **Use Case** : `UC_EditProfile`, `UC_EditName`, `UC_EditBirthdate`, etc. (Utilisateur)

#### 2.3) Gestion de la sécurité - **FEATURE-008**
- **Use Case** : `UC_ChangePwd`, `UC_Security` (Utilisateur)

#### 2.4) Photo de profil - **FEATURE-009**
- **Use Case** : `UC_Avatar` (Utilisateur)

**Livrables Phase 2** :
- [ ] Toutes les features de profil avec tests
- [ ] Gestion upload d'images (Storage)
- [ ] Validation des données (Zod)

---

### Phase 3 : Migration Utilisateur → Annonceur

**Priorité** : 🟡 **HAUTE** - Nécessaire pour publier des annonces

#### 3.1) Demande de migration - **FEATURE-010**
- **Use Case** : `UC_BecomeAnnouncer` (Utilisateur)

#### 3.2) Acceptation des conditions - **FEATURE-011**
- **Use Case** : `UC_AcceptTerms` (Utilisateur)

#### 3.3) Renseigner informations professionnelles - **FEATURE-012**
- **Use Case** : `UC_ProfessionalInfo` (Utilisateur)

#### 3.4) Choix du type d'annonceur - **FEATURE-013**
- **Use Case** : `UC_SelectAnnouncerType` (Utilisateur)
- **Types** : INDIVIDUAL, AGENCY, BROKER, AGENT

#### 3.5) Vérification téléphone - **FEATURE-014**
- **Use Case** : `UC_VerifyPhone` (Utilisateur)

#### 3.6) Attribution du rôle - **FEATURE-015**
- **Use Case** : `UC_ReceiveRole` (Utilisateur)
- **Création** : `AnnouncerProfile` dans Firestore
- **Attribution** : Rôle "Announcer" dans `User.roles`
- **Bonus** : 3 crédits de bienvenue

**Livrables Phase 3** :
- [ ] Feature migration complète avec tests
- [ ] Création `AnnouncerProfile` (voir class diagram)
- [ ] Attribution rôle "Announcer"
- [ ] Attribution 3 crédits de bienvenue
- [ ] Workflow complet testé

---

### Phase 4 : Gestion des Annonces (Annonceur)

**Priorité** : 🟢 **MOYENNE** - Nécessite Phase 3

#### 4.1) Création d'annonce - **FEATURE-016**
- **Use Case** : `UC_Create`, `UC_Step1`, `UC_Step2`, `UC_Step3` (Annonceur)
- **Fichiers actuels** :
  - `src/app/(protected)/property/create/page.tsx`
  - `src/db/property.db.ts`

#### 4.2) Types de biens - **FEATURE-017**
- **Use Case** : `UC_SelectType`, `UC_Home`, `UC_Apartment`, etc. (Annonceur)

#### 4.3) Assistant IA - **FEATURE-018**
- **Use Case** : `UC_UseAI`, `UC_GenerateDesc` (Annonceur)
- **Fichiers actuels** :
  - `src/components/ai-assistant/FlatBotAssistant.tsx`

#### 4.4) Gestion des annonces - **FEATURE-019**
- **Use Case** : `UC_ViewMyAds`, `UC_EditAd`, `UC_DeleteAd` (Annonceur)

#### 4.5) Promotion des annonces - **FEATURE-020**
- **Use Case** : `UC_Promote`, `UC_Featured`, `UC_Trending7`, etc. (Annonceur)
- **Fichiers actuels** :
  - `src/components/promotion/PromotionButton.tsx`

**Livrables Phase 4** :
- [ ] Feature création annonce complète avec tests
- [ ] Feature gestion annonces complète avec tests
- [ ] Feature promotion complète avec tests
- [ ] Intégration crédits (déduction lors de publication/promotion)

---

### Phase 5 : Recherche & Navigation

**Priorité** : 🟢 **MOYENNE** - Fonctionnalité principale

#### 5.1) Recherche de propriétés - **FEATURE-021**
- **Use Case** : `UC_Search` (Visiteur/Utilisateur/Chercheur)

#### 5.2) Filtres - **FEATURE-022**
- **Use Case** : `UC_FilterType`, `UC_FilterLocation`, `UC_FilterPrice`, etc.

#### 5.3) Carte interactive - **FEATURE-023**
- **Use Case** : `UC_InteractiveMap` (Visiteur)

#### 5.4) Détails d'une annonce - **FEATURE-024**
- **Use Case** : `UC_ViewDetails`, `UC_Photos`, `UC_Map` (Visiteur)

**Livrables Phase 5** :
- [ ] Feature recherche complète avec tests
- [ ] Feature filtres complète avec tests
- [ ] Intégration Algolia (si utilisé)
- [ ] Carte interactive (Google Maps/OSM)

---

### Phase 6 : Favoris & Notifications

**Priorité** : 🟢 **MOYENNE**

#### 6.1) Gestion des favoris - **FEATURE-025**
- **Use Case** : `UC_AddFavorite`, `UC_RemoveFavorite`, `UC_ViewFavorites` (Utilisateur)

#### 6.2) Notifications - **FEATURE-026**
- **Use Case** : `UC_ViewNotif`, `UC_MarkRead`, `UC_ConfigNotif` (Utilisateur)

**Livrables Phase 6** :
- [ ] Feature favoris complète avec tests
- [ ] Feature notifications complète avec tests
- [ ] Cloud Functions pour notifications (si nécessaire)

---

### Phase 7 : Crédits & Paiements

**Priorité** : 🟢 **MOYENNE** - Nécessite Phase 3

#### 7.1) Système de crédits (refactoring) - **FEATURE-027**
- **Use Case** : `UC_ViewBalance`, `UC_BuyCredits` (Annonceur)
- **Refactoring** :
  - ✅ Créer `CreditWallet` (remplace `User.credits`)
  - ✅ Créer `CreditPurchase` (achats)
  - ✅ Créer `CreditExpense` (dépenses)
  - ✅ Service crédits dédié
- **Fichiers actuels** :
  - `src/models/credit-transaction.d.ts`
  - `src/db/credit-transaction.db.ts`

#### 7.2) Achat de crédits - **FEATURE-028**
- **Use Case** : `UC_SelectPack`, `UC_RequestManualTopup` (Annonceur)
- **Note** : Recharge manuelle active via WhatsApp + dépôt OM/MoMo ; intégration API opérateur à venir
- **Pages** :
  - `/my-balance/history` (solde + historique)
  - `/my-balance/recharge` (packs + procédure manuelle)

#### 7.3) Historique des transactions - **FEATURE-029**
- **Use Case** : `UC_ViewHistory` (Annonceur)

**Livrables Phase 7** :
- [ ] Système de crédits refactoré (voir class diagram)
- [ ] Feature achat crédits (mock Airtel Money pour tests)
- [ ] Feature historique complète avec tests

---

### Phase 8 : Statistiques (Annonceur)

**Priorité** : 🔵 **BASSE**

#### 8.1) Statistiques des annonces - **FEATURE-030**
- **Use Case** : `UC_ViewStats`, `UC_ViewCount`, `UC_ViewInteractions` (Annonceur)

**Livrables Phase 8** :
- [ ] Feature statistiques complète avec tests

---

## 📊 Structure Cible (Feature-based)

```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── hooks/
│   │   └── __tests__/
│   ├── profile/
│   ├── migration/
│   ├── property/
│   ├── search/
│   ├── favorites/
│   ├── notifications/
│   ├── credits/
│   └── statistics/
├── shared/
│   ├── components/
│   ├── services/
│   ├── repositories/
│   ├── hooks/
│   └── utils/
└── app/
    └── (routes)/
```

---

## 🧪 Stratégie de Tests

Pour **chaque feature** :

1. **Tests unitaires** (Jest)
   - Services
   - Repositories
   - Utils
   - Hooks

2. **Tests d'intégration** (Jest + Firebase Emulator)
   - Interactions services ↔ repositories
   - Interactions repositories ↔ Firestore

3. **Tests E2E** (Playwright)
   - Workflows complets utilisateur
   - Scénarios critiques

4. **Couverture** : >= 80% (objectif)

---

## 📝 Workflow par Feature

Pour chaque feature (ex: FEATURE-001 Register) :

1. **Créer branche** : `feature/FEATURE-001-register`
2. **Analyser code existant** : Identifier problèmes
3. **Refactorer** :
   - Séparer UI / Logique
   - Créer services / repositories
   - Gestion d'erreurs cohérente
   - Naming convention (anglais)
4. **Écrire tests** :
   - Unitaires
   - Intégration
   - E2E
5. **Documentation** :
   - README dans `documentation/feature/auth/`
   - Diagrammes si nécessaire
6. **PR vers develop** :
   - Gating tests (GitHub Actions)
   - Code review
   - Merge si OK

---

## ✅ Checklist Générale

- [ ] Phase 1 : Authentification (5 features)
- [ ] Phase 2 : Profil (4 features)
- [ ] Phase 3 : Migration (6 features)
- [ ] Phase 4 : Annonces (5 features)
- [ ] Phase 5 : Recherche (4 features)
- [ ] Phase 6 : Favoris & Notifications (2 features)
- [ ] Phase 7 : Crédits (3 features)
- [ ] Phase 8 : Statistiques (1 feature)

**Total** : 30 features à refactorer

---

## 🚀 Commencer par FEATURE-001 : Register

**Prochaine étape** : Créer la branche et commencer le refactoring de Register.

Voir : `documentation/feature/auth/FEATURE-001-REGISTER.md` (à créer)

---

*Dernière mise à jour : 2026-01-12*
