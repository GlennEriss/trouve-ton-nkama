# FEATURE-001 : Inscription (Register)

> **Phase 1.1** - Authentification & Base Utilisateur

---

## 📋 Vue d'ensemble

Refactoriser la fonctionnalité d'inscription selon l'architecture proposée, avec séparation UI/Logique, tests complets, et gestion d'erreurs cohérente.

---

## 🎯 Use Case

- **Acteur** : Visiteur
- **Use Case** : `UC_Signup` (S'inscrire)
- **Extensions** : `UC_Google`, `UC_Facebook` (OAuth)

---

## 🔍 Analyse du Code Actuel

> **📄 Analyse détaillée** : Voir [`ANALYSE_CODE_EXISTANT.md`](./ANALYSE_CODE_EXISTANT.md)

### Fichiers existants

1. **`src/components/signup/Signup.tsx`**
   - Composant React avec logique métier mélangée
   - Gestion d'erreurs inconsistante
   - Pas de séparation UI/Logique

2. **`src/components/signup/SignupMobileComponent.tsx`**
   - Duplication de code avec `Signup.tsx`
   - Même problème de séparation

3. **`src/db/user.db.ts`**
   - Fonctions CRUD pour utilisateurs
   - Gestion d'erreurs incohérente (null/throw/false)

4. **`src/models/schema.ts`**
   - Schéma Zod `FormRegisterSchema`
   - Validation côté client

5. **`src/lib/transformToPerson.ts`**
   - Transformation des données du formulaire vers `User`

### Problèmes identifiés

1. ❌ **Logique métier dans les composants** : `onRegister` dans le composant
2. ❌ **Duplication de code** : `Signup.tsx` et `SignupMobileComponent.tsx`
3. ❌ **Gestion d'erreurs inconsistante** : Mélange de `throw`, `null`, `false`
4. ❌ **Pas de tests** : Aucun test unitaire/intégration/E2E
5. ❌ **Pas de service layer** : Accès direct à Firebase Auth et Firestore
6. ❌ **Pas de repository pattern** : Accès direct à `user.db.ts`

---

## 🏗️ Architecture Cible

### Structure

```
src/
├── features/
│   └── auth/
│       ├── components/
│       │   ├── SignupForm.tsx          # UI uniquement
│       │   └── SignupFormMobile.tsx     # UI mobile (si nécessaire)
│       ├── services/
│       │   └── auth.service.ts         # Logique métier
│       ├── repositories/
│       │   └── user.repository.ts       # Accès Firestore
│       ├── hooks/
│       │   └── useSignup.ts            # Hook React
│       ├── types/
│       │   └── signup.types.ts         # Types spécifiques
│       └── __tests__/
│           ├── signup.service.test.ts
│           ├── signup.repository.test.ts
│           ├── signup.integration.test.ts
│           └── signup.e2e.test.ts
```

---

## 📝 Spécifications

### 1. Service Layer (`auth.service.ts`)

**Responsabilités** :
- Créer un compte Firebase Auth
- Vérifier l'unicité du numéro de téléphone
- Créer l'utilisateur dans Firestore
- Envoyer l'email de vérification
- Gérer les erreurs de manière cohérente

**Interface** :

```typescript
interface SignupService {
  signup(data: SignupData): Promise<SignupResult>
}

interface SignupData {
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber: string
  country: string
  acceptTerms: boolean
}

interface SignupResult {
  success: boolean
  userId?: string
  error?: SignupError
}

interface SignupError {
  code: string
  message: string
}
```

**Erreurs possibles** :
- `EMAIL_ALREADY_IN_USE` : Email déjà utilisé
- `PHONE_ALREADY_IN_USE` : Numéro de téléphone déjà utilisé
- `WEAK_PASSWORD` : Mot de passe trop faible
- `INVALID_EMAIL` : Email invalide
- `TERMS_NOT_ACCEPTED` : Conditions non acceptées
- `NETWORK_ERROR` : Erreur réseau

### 2. Repository Layer (`user.repository.ts`)

**Responsabilités** :
- CRUD utilisateurs dans Firestore
- Vérifier l'unicité du numéro de téléphone
- Gestion d'erreurs cohérente (toujours throw, jamais null/false)

**Interface** :

```typescript
interface UserRepository {
  create(user: User): Promise<User>
  findByPhoneNumber(phoneNumber: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findById(uid: string): Promise<User | null>
  update(uid: string, data: Partial<User>): Promise<User>
}
```

### 3. Hook React (`useSignup.ts`)

**Responsabilités** :
- Gérer l'état du formulaire
- Appeler le service
- Gérer le loading/error/success
- Navigation après succès

**Interface** :

```typescript
interface UseSignupReturn {
  signup: (data: SignupData) => Promise<void>
  isLoading: boolean
  error: SignupError | null
  isSuccess: boolean
}
```

### 4. Composant UI (`SignupForm.tsx`)

**Responsabilités** :
- Afficher le formulaire
- Validation côté client (Zod)
- Appeler le hook `useSignup`
- Afficher les erreurs

**Pas de logique métier** : Tout est dans le hook/service

### 5. Politique Téléphone (Gabon) - Signup

Référence architecture: `FEATURE-005-PHONE-NUMBER-POLICY.md`.

#### Format UI retenu (champ split)

- `dialCode`: `+241` (fixe, non éditable)
- `localNumber`: numéro saisi sans indicatif (exemple: `62123456`)

#### Opérateurs mobiles et préfixes autorisés

- Libertis: `62`, `66`
- Moov: `65`
- Airtel: `74`, `77`

#### Regex de référence

- Champ `localNumber` (strict): `^(62|65|66|74|77)\d{6}$`
- Champ `localNumber` (mode tolérant migration): `^0?(62|65|66|74|77)\d{6}$`
- Stockage canonique E.164: `^\+241(62|65|66|74|77)\d{6}$`

#### Règles de normalisation

1. Nettoyer espaces/tirets.
2. Retirer le `0` initial si présent (si mode tolérant activé).
3. Construire `phone.canonical = +241 + localNumber`.
4. Comparer l'unicité uniquement sur `phone.canonical`.

Règle stricte: ne jamais persister `+2410...`.

---

## ✅ Checklist de Refactoring

### Phase 1 : Préparation
- [x] Créer branche `feature/FEATURE-001-register`
- [x] Analyser code existant en détail
- [x] Identifier toutes les dépendances

### Phase 2 : Repository
- [x] Créer `user.repository.ts`
- [x] Implémenter `create`, `findByPhoneNumber`, `findByEmail`, `findById`
- [x] Gestion d'erreurs cohérente (toujours throw)
- [x] Tests unitaires repository

### Phase 3 : Service
- [x] Créer `auth.service.ts`
- [x] Implémenter `signup`
- [x] Intégration avec Firebase Auth
- [x] Intégration avec repository
- [x] Gestion d'erreurs cohérente
- [x] Tests unitaires service

### Phase 4 : Hook
- [x] Créer `useSignup.ts`
- [x] Intégration avec service
- [x] Gestion état (loading/error/success)
- [x] Tests unitaires hook

### Phase 5 : Composant
- [x] Refactorer `SignupForm.tsx` (UI uniquement)
- [x] Utiliser `useSignup` hook
- [x] Validation Zod côté client
- [x] Tests unitaires composant (React Testing Library)

### Phase 6 : Tests
- [x] Tests unitaires (Jest)
- [x] Tests d'intégration signup (service/repository avec mocks)
- [ ] Tests d'intégration avec Firebase Emulator (à compléter)
- [ ] Tests E2E (Playwright)
- [ ] Couverture >= 80%

### Phase 7 : Documentation
- [x] Analyse du code existant (`ANALYSE_CODE_EXISTANT.md`)
- [x] Diagramme d'activité (`register-activity-diagram.puml`)
- [x] Diagramme de séquence (`register-sequence-diagram.puml`)
- [x] Spécifications UX (`ux.md`)
- [x] Spécifications UI (`ui.md`)
- [x] README dans `documentation/feature/auth/`
- [ ] Exemples d'utilisation

### Phase 8 : PR
- [ ] Code review
- [ ] Gating tests (GitHub Actions)
- [ ] Merge vers `develop`

---

## 🧪 Scénarios de Tests

### Tests Unitaires

1. **Service** :
   - ✅ Inscription réussie
   - ✅ Email déjà utilisé
   - ✅ Numéro de téléphone déjà utilisé
   - ✅ Mot de passe trop faible
   - ✅ Email invalide
   - ✅ Conditions non acceptées

2. **Repository** :
   - ✅ Création utilisateur
   - ✅ Recherche par numéro de téléphone
   - ✅ Recherche par email
   - ✅ Gestion erreurs Firestore

3. **Hook** :
   - ✅ Appel service
   - ✅ Gestion loading
   - ✅ Gestion erreurs
   - ✅ Navigation après succès

### Tests d'Intégration

1. **Service + Repository (mocks actuels)** :
   - ✅ Inscription complète (Auth + Firestore)
   - ✅ Vérification unicité téléphone
   - ✅ Envoi email de vérification via endpoint API

### Tests E2E (Playwright)

1. **Workflow complet** :
   - ⬜ Remplir formulaire (desktop + mobile)
   - ⬜ Soumettre
   - ⬜ Vérifier création compte
   - ⬜ Vérifier email de vérification envoyé
   - ⬜ Vérifier redirection

---

## 📊 Métriques de Succès

- [ ] **Couverture de tests** : >= 80%
- [x] **Gestion d'erreurs** : centralisation service/repository/API en place
- [x] **Séparation UI/Logique** : service + hook utilisés dans les composants signup
- [ ] **Pas de duplication** : 0 duplication de code
- [ ] **Performance** : Temps de réponse < 2s
- [ ] **Accessibilité** : WCAG 2.1 AA

---

## 🔗 Dépendances

- **Utilise** :
  - Firebase Auth (création compte)
  - Firestore (création utilisateur)
  - Email service (vérification email)
  - Credit system (attribution 3 crédits de bienvenue)

- **Utilisé par** :
  - Login (après inscription)
  - Profile (gestion profil utilisateur)

---

## 📝 Notes

- **Règle de rôles au signup** :
  - compte `User` => rôles `['User']`
  - compte `Announcer` => rôles `['User', 'Announcer']`
- **Hors scope FEATURE-001 (signup)** :
  - gestion détaillée des profils (`User`/`Announcer`) dans la feature profil dédiée
  - `AnnouncerProfile` n'est pas créé par le flux signup
- **Crédits de bienvenue** : Attribuer 3 crédits lors de l'inscription (voir class diagram)
  - Les crédits sont stockés dans `CreditWallet`, pas dans `User.credits`
- **Email de vérification** : Envoyer en arrière-plan (non-bloquant)
- **Numéro de téléphone** : Obligatoire et unique
- **Conditions** : Acceptation obligatoire
- **Politique téléphone** : voir `FEATURE-005-PHONE-NUMBER-POLICY.md` (source de vérité)

---

*Dernière mise à jour : 2026-03-06*
