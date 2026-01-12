# Analyse du Code Existant - Register

> **Branche** : `feature/FEATURE-001-register`

---

## 📋 Fichiers Analysés

### 1. `src/components/signup/Signup.tsx`

**Problèmes identifiés** :

1. ❌ **Logique métier dans le composant** :
   - Fonction `onRegister` (lignes 55-120) contient toute la logique
   - Vérification téléphone, création compte Firebase, création Firestore, envoi email

2. ❌ **Gestion d'erreurs inconsistante** :
   - Mélange de `throw new Error()` et gestion d'erreurs Firebase
   - Gestion d'erreurs dans `onSubmit` avec multiples conditions `if/else`

3. ❌ **Pas de séparation des responsabilités** :
   - Composant gère UI + logique métier + navigation + toast

4. ❌ **Code dupliqué** :
   - `SignupMobileComponent.tsx` a le même code

**Flux actuel** :
```
onSubmit → transformToPerson → onRegister → 
  - Vérifier téléphone
  - Créer Firebase Auth
  - Envoyer email (fetch API)
  - Créer Firestore
  - SignOut
```

---

### 2. `src/db/user.db.ts`

**Problèmes identifiés** :

1. ❌ **Gestion d'erreurs incohérente** :
   - `getUserByUID` : retourne `null` en cas d'erreur (ligne 24, 31)
   - `findUserDetailsByUserID` : retourne `null` en cas d'erreur (ligne 42, 51)
   - `findUserByEmail` : `throw error` (ligne 72)
   - `updateUser` : retourne `boolean` (ligne 76, 85, 96)
   - `findUserByPhoneNumber` : `throw error` (ligne 123)

2. ❌ **Pas de vraie abstraction** :
   - Accès direct à Firestore
   - Pas d'interface claire

3. ❌ **Crédits hardcodés** :
   - `createUser` ajoute 3 crédits directement (ligne 10)
   - Devrait être dans le service, pas le repository

**Fonctions existantes** :
- `createUser(user: Partial<User>)` : Crée utilisateur avec 3 crédits
- `getUserByUID(uid: string)` : Retourne `User | null`
- `findUserDetailsByUserID(uid: string)` : Retourne `User | null`
- `findUserByEmail(email: string)` : Retourne `User | null` ou throw
- `updateUser(uid: string, updates: Partial<User>)` : Retourne `boolean`
- `findUserByPhoneNumber(phoneNumber: string)` : Retourne `User | null` ou throw

---

### 3. `src/lib/transformToPerson.ts`

**Problèmes identifiés** :

1. ⚠️ **Logique métier** :
   - Transformation des données du formulaire vers `User`
   - Hardcode du pays 'GA' (Gabon)
   - Hardcode du rôle 'Announcer' (ligne 27) - **PROBLÈME** : Tous les utilisateurs sont annonceurs par défaut

2. ✅ **Fonction simple** : Pas de problème majeur, mais devrait être dans le service

---

### 4. `src/models/schema.ts`

**Schéma Zod `FormRegisterSchema`** :

✅ **Bien structuré** :
- Validation email
- Validation mot de passe (8 caractères, majuscule, chiffre)
- Validation date de naissance (18 ans minimum)
- Validation téléphone
- Validation conditions d'utilisation

✅ **Pas de problème** : Peut être réutilisé

---

## 🔍 Flux Actuel (Détaillé)

### Étape 1 : Soumission du formulaire
```
SignupForm.onSubmit()
  ↓
transformToPerson(values)
  ↓
onRegister(user)
```

### Étape 2 : Vérifications
```
onRegister()
  ↓
1. Vérifier téléphone obligatoire
  ↓
2. findUserByPhoneNumber() → Vérifier unicité
  ↓
3. Si existe → throw Error
```

### Étape 3 : Création compte Firebase Auth
```
createUserWithEmailAndPassword(auth, email, password)
  ↓
Si erreur → throw (géré dans onSubmit)
```

### Étape 4 : Envoi email (non-bloquant)
```
fetch('/api/auth/send-verification-email')
  ↓
En arrière-plan (promise non await)
```

### Étape 5 : Création Firestore
```
createUser({
  ...userDetails,
  uid: userCred.user.uid,
  notificationParameter,
  providers: ['CREDENTIALS']
})
  ↓
user.db.ts → createUser() → Ajoute 3 crédits
```

### Étape 6 : Déconnexion
```
signOut(auth)
  ↓
Retourner uid
```

### Étape 7 : Navigation
```
toast.success()
  ↓
router.push('/signup/success?uid=' + uid)
```

---

## ❌ Problèmes Majeurs

### 1. Architecture
- ❌ Logique métier dans composant
- ❌ Pas de service layer
- ❌ Pas de repository pattern cohérent
- ❌ Gestion d'erreurs inconsistante

### 2. Logique Métier
- ❌ Tous les utilisateurs créés avec rôle 'Announcer' (devrait être 'User' par défaut)
- ❌ Crédits ajoutés dans repository (devrait être dans service)
- ❌ Déconnexion automatique après inscription (pourquoi ?)

### 3. Sécurité
- ⚠️ Mot de passe stocké dans `User` (ligne 26 transformToPerson) - **PROBLÈME SÉCURITAIRE**
- ⚠️ Pas de validation côté serveur

### 4. Tests
- ❌ Aucun test unitaire
- ❌ Aucun test d'intégration
- ❌ Aucun test E2E

---

## ✅ Points Positifs

1. ✅ Validation Zod complète
2. ✅ Vérification unicité téléphone
3. ✅ Gestion d'erreurs Firebase détaillée
4. ✅ Email de vérification envoyé
5. ✅ Crédits de bienvenue (3 crédits)

---

## 🎯 Améliorations Nécessaires

### 1. Architecture
- ✅ Séparer UI / Logique
- ✅ Créer service layer
- ✅ Créer repository pattern cohérent
- ✅ Gestion d'erreurs uniforme (toujours throw)

### 2. Logique Métier
- ✅ Rôle par défaut : 'User' (pas 'Announcer')
- ✅ Crédits dans service (pas repository)
- ✅ Ne pas déconnecter après inscription
- ✅ Ne pas stocker le mot de passe dans Firestore

### 3. Sécurité
- ✅ Supprimer stockage mot de passe
- ✅ Validation côté serveur (API route)

### 4. Tests
- ✅ Tests unitaires (service, repository, hook)
- ✅ Tests d'intégration (Firebase Emulator)
- ✅ Tests E2E (Playwright)

---

*Dernière mise à jour : 2026-01-12*

