# Script de création d'utilisateur avec email vérifié

## 📋 Objectif

Ce script permet de créer un compte utilisateur dans Firebase Authentication avec l'email automatiquement vérifié (`emailVerified: true`), puis de créer le document correspondant dans la collection Firestore `users`.

## 🎯 Cas d'usage

- Création d'utilisateurs administratifs
- Création de comptes de test avec email pré-vérifié
- Migration d'utilisateurs existants
- Initialisation de comptes pour les développeurs/testeurs

## 🔧 Fonctionnalités

### 1. Création dans Firebase Authentication

Le script utilise l'**Admin SDK** de Firebase pour créer un utilisateur avec :
- Email et mot de passe
- `emailVerified: true` (pas besoin de vérification manuelle)
- UID généré automatiquement par Firebase

### 2. Création dans Firestore

**⚠️ IMPORTANT : Le password n'est JAMAIS stocké dans Firestore**. Il est géré uniquement par Firebase Authentication.

Après la création dans Firebase Auth, le script crée un document dans la collection `users` avec :

**Données de base (ICreation) :**
- `id`: Généré automatiquement par Firestore
- `createdAt`: Timestamp de création
- `updatedAt`: Timestamp de mise à jour
- `state`: `'IN_PROGRESS'` (par défaut)
- `searchableName`: Nom complet en minuscules pour la recherche

**Données utilisateur (Person) :**
- `firstname`: Prénom
- `lastname`: Nom de famille
- `email`: Adresse email (identique au login)
- `country`: Objet avec `name` et `code` (ex: `{name: "Gabon", code: "GA"}`)
- `phoneNumbers`: Tableau de numéros de téléphone (format international recommandé)
- `phoneNumberVerified`: `false` par défaut (nécessite vérification OTP)
- `birthDate`: Optionnel (format `YYYY-MM-DD`)

**Données d'authentification (User) :**
- `uid`: UID Firebase Auth
- `login`: Email utilisé pour la connexion
- `roles`: Tableau de rôles (`'Admin'` | `'Announcer'`)
- `emailVerified`: `true` (défini directement)
- `providers`: Tableau de providers (`['CREDENTIALS']` pour email/password)
- `credits`: Nombre de crédits (par défaut: 25 pour les comptes créés via script)
- `favoris`: Tableau vide `[]`
- `notificationParameter`: Paramètres de notification par défaut

## 📁 Structure du script

```
scripts/create-user-with-verify-email/
├── index.js          # Script principal
└── firestore-admin.js # Configuration Firebase Admin (réutilise scripts/firebase)
```

## 🔐 Sécurité

- **Admin SDK uniquement** : Le script utilise l'Admin SDK côté serveur, jamais le client SDK
- **Pas d'exposition** : Les credentials Firebase ne sont jamais exposés côté client
- **Validation** : Le script valide que l'email n'existe pas déjà avant création
- **Vérification téléphone** : Vérifie que le numéro de téléphone n'est pas déjà associé à un compte

## 📝 Utilisation

### Prérequis

1. Variables d'environnement configurées dans `scripts/firebase/.env` :
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

2. Dépendances installées :
   ```bash
   npm install firebase-admin
   ```

### Lancer le script

```bash
node scripts/create-user-with-verify-email/index.js
```

### Exemple d'utilisateur créé

```javascript
{
  login: "wilfriedmeviane@ttn.ga",
  password: "wilfriedmeviane",
  roles: ["Announcer"],
  provider: ["CREDENTIALS"],
  credits: 25,
  firstname: "Wilfried",
  lastname: "Meviane",
  country: { name: "Gabon", code: "GA" },
  phoneNumbers: ["+24174411183"],
  searchableName: "wilfried meviane"
}
```

## 🚨 Gestion des erreurs

Le script gère les cas suivants :

1. **Email déjà utilisé** : Affiche une erreur et arrête l'exécution
2. **Numéro de téléphone déjà associé** : Affiche une erreur et arrête l'exécution
3. **Erreur Firebase Auth** : Log l'erreur et arrête l'exécution
4. **Erreur Firestore** : Log l'erreur et arrête l'exécution (mais l'utilisateur Auth est déjà créé)

## 🔄 Flow d'exécution

```
1. Vérifier que l'email n'existe pas déjà
   ↓
2. Vérifier que le numéro de téléphone n'est pas déjà associé
   ↓
3. Créer l'utilisateur dans Firebase Auth avec emailVerified: true
   ↓
4. Créer le document dans Firestore collection 'users'
   ↓
5. Afficher le succès avec l'UID créé
```

## 📊 Différences avec le flow normal d'inscription

| Aspect | Flow normal (Signup.tsx) | Script (create-user-with-verify-email) |
|--------|-------------------------|----------------------------------------|
| **Email vérifié** | `false` → vérification via email | `true` directement |
| **Credits initiaux** | 3 (défini dans `user.db.ts`) | 25 (paramètre du script) |
| **OTP téléphone** | Requis (via RecaptchaVerifier) | Non requis |
| **Vérification téléphone** | `phoneNumberVerified: true` après OTP | `phoneNumberVerified: false` |
| **Envoi email vérification** | Oui (via `/api/auth/send-verification-email`) | Non |
| **Déconnexion auto** | Oui (après création) | Non applicable |

## 🎨 Structure des données

### NotificationParameter par défaut

```typescript
{
  isNew: true,
  isAccountActivity: true,
  isNewAnnouncement: true,
  isFavoris: true,
  isPersonalizedSuggestions: true,
  isSystemUpdated: true
}
```

### Country

Le code du pays doit correspondre à un code valide dans `src/constantes/country.ts`.

Pour le Gabon :
```typescript
{
  name: "Gabon",
  code: "GA"
}
```

## 🔍 Vérification post-création

Après exécution, vous pouvez vérifier :

1. **Firebase Console** → Authentication → Utilisateurs :
   - Email : `wilfriedmeviane@ttn.ga`
   - Email vérifié : ✅ (coche verte)

2. **Firestore Console** → Collection `users` :
   - Document avec UID correspondant
   - Tous les champs correctement remplis
   - `emailVerified: true`
   - `credits: 25`

## 🛠️ Maintenance

### Ajouter un nouvel utilisateur

Modifier le script `index.js` avec les nouvelles données utilisateur.

### Modifier les crédits par défaut

Modifier la constante `DEFAULT_CREDITS` dans `index.js`.

### Changer les paramètres de notification

Modifier l'objet `notificationParameter` dans `index.js`.

## 📚 Références

- [Firebase Admin SDK - Create User](https://firebase.google.com/docs/auth/admin/create-users)
- [Firebase Admin SDK - Update User](https://firebase.google.com/docs/auth/admin/manage-users#update_a_user)
- Documentation interne : `src/components/signup/Signup.tsx` (flow d'inscription normal)
- Documentation interne : `src/db/user.db.ts` (fonctions de gestion utilisateurs)

