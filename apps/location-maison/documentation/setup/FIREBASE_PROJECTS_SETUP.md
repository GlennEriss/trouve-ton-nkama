# Configuration des Projets Firebase

Ce guide explique comment configurer les 3 projets Firebase (dev, preprod, prod) pour la plateforme Location Maison Gabon.

---

## 📋 Vue d'ensemble

Le projet utilise **3 environnements Firebase** distincts :

| Environnement | Nom du Projet | Usage |
|---------------|---------------|-------|
| **DEV** | `location-maison-dev-67c13` | Développement local avec émulateurs |
| **PREPROD** | `location-maison-gabon-preprod` | Tests UAT, démos, validation avant prod |
| **PROD** | `location-maison-prod-167da` | Production (existant) |

---

## 🔧 Étape 1 : Créer les projets Firebase

### 1.1) Créer le projet DEV

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquer sur **"Ajouter un projet"**
3. Nom du projet : `location-maison-dev-67c13` ✅ **Déjà créé**
4. Désactiver Google Analytics (optionnel pour dev)
5. Cliquer sur **"Créer le projet"**

> ✅ **Le projet DEV est déjà créé** : `location-maison-dev-67c13`

### 1.2) Créer le projet PREPROD

1. Cliquer sur **"Ajouter un projet"**
2. Nom du projet : `location-maison-gabon-preprod`
3. Activer Google Analytics (recommandé pour suivre les tests)
4. Cliquer sur **"Créer le projet"**

### 1.3) Vérifier le projet PROD

Le projet prod existe déjà : `location-maison-prod-167da`

---

## ⚙️ Étape 2 : Configurer chaque projet

Pour **chaque projet** (dev, preprod, prod), activer les services suivants :

### Services à activer

- [x] **Authentication**
  - Méthodes : Email/Password, Phone, Google, Facebook
  - Configurer les domaines autorisés

- [x] **Firestore Database**
  - Mode : Production
  - Créer la base de données

- [x] **Storage**
  - Mode : Production
  - Configurer les règles de sécurité

- [x] **Cloud Functions**
  - Plan : Blaze (pay as you go) - requis pour les fonctions
  - Activer l'API Cloud Functions

- [x] **Analytics** (optionnel mais recommandé)

---

## 📝 Étape 3 : Récupérer les configurations

Pour **chaque projet**, récupérer la configuration Firebase :

1. Aller dans **Project Settings** (⚙️ en haut à gauche)
2. Scroller jusqu'à **"Your apps"**
3. Cliquer sur **"</>" (Web app)** si une app web existe, sinon **"Ajouter une application"** > **Web**
4. Nom de l'app : `location-maison-web` (ou autre)
5. Cocher **"Also set up Firebase Hosting"** (optionnel)
6. Cliquer sur **"Enregistrer l'application"**
7. **Copier la configuration** (elle ressemble à ça) :

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "location-maison-gabon-dev.firebaseapp.com",
  projectId: "location-maison-gabon-dev",
  storageBucket: "location-maison-gabon-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## 🔐 Étape 4 : Créer les fichiers d'environnement

### 4.1) Fichier `.env.local.dev` (Développement)

**Template disponible** : `documentation/setup/env.local.dev.template`

Créer le fichier `.env.local.dev` à la racine du projet :

```bash
# Copier le template
cp documentation/setup/env.local.dev.template .env.local.dev
```

```bash
# ============================================
# ENVIRONNEMENT : DEVELOPMENT
# ============================================
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase DEV
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC97_d7da8-Dgupckhg_mOfQhXhcJICUt4
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=location-maison-dev-67c13.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=location-maison-dev-67c13
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=location-maison-dev-67c13.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=232480750602
NEXT_PUBLIC_FIREBASE_APP_ID=1:232480750602:web:87819b86a153de7493b3f3
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ELD9M7GK4B

# Algolia (utiliser les mêmes clés pour tous les environnements ou créer des index séparés)
NEXT_PUBLIC_ALGOLIA_APP_ID=<ALGOLIA_APP_ID>
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=<ALGOLIA_SEARCH_API_KEY>

# Airtel Money (utiliser les clés de test pour dev)
NEXT_PUBLIC_AGENT_CODE_AIRTEL=<AGENT_CODE_TEST>

# Émulateurs Firebase (activer en dev)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Version UI
NEXT_PUBLIC_UI_VERSION=v1
```

### 4.2) Fichier `.env.local.preprod` (Préproduction)

**Template disponible** : `documentation/setup/env.local.preprod.template`

Créer le fichier `.env.local.preprod` à la racine du projet :

```bash
# Copier le template
cp documentation/setup/env.local.preprod.template .env.local.preprod
```

```bash
# ============================================
# ENVIRONNEMENT : PREPRODUCTION
# ============================================
NEXT_PUBLIC_APP_ENV=preprod
NEXT_PUBLIC_APP_URL=https://location-maison-preprod.vercel.app

# Firebase PREPROD
NEXT_PUBLIC_FIREBASE_API_KEY=<API_KEY_PREPROD>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=location-maison-gabon-preprod.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=location-maison-gabon-preprod
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=location-maison-gabon-preprod.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<SENDER_ID_PREPROD>
NEXT_PUBLIC_FIREBASE_APP_ID=<APP_ID_PREPROD>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<MEASUREMENT_ID_PREPROD>

# Algolia
NEXT_PUBLIC_ALGOLIA_APP_ID=<ALGOLIA_APP_ID>
NEXT_PUBLIC_ALGOLIA_SEARCH_API_KEY=<ALGOLIA_SEARCH_API_KEY>

# Airtel Money (utiliser les clés de test pour preprod)
NEXT_PUBLIC_AGENT_CODE_AIRTEL=<AGENT_CODE_TEST>

# Émulateurs Firebase (désactiver en preprod)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false

# Version UI
NEXT_PUBLIC_UI_VERSION=v1
```

### 4.3) Fichier `.env.local.prod` (Production - Existant)

Le fichier `.env.local.prod` existe déjà avec la configuration de production.

---

## 🔄 Étape 5 : Mettre à jour `.firebaserc`

Le fichier `.firebaserc` a déjà été mis à jour avec les 3 projets :

```json
{
  "projects": {
    "default": "location-maison-prod-167da",
    "dev": "location-maison-gabon-dev",
    "preprod": "location-maison-gabon-preprod",
    "prod": "location-maison-prod-167da"
  }
}
```

---

## 🧪 Étape 6 : Tester la configuration

### 6.1) Tester DEV (avec émulateurs)

```bash
# Activer les émulateurs
firebase use dev
firebase emulators:start

# Dans un autre terminal
cp .env.local.dev .env.local
npm run dev
```

### 6.2) Tester PREPROD

```bash
# Basculer sur preprod
firebase use preprod

# Vérifier la configuration
firebase projects:list
```

### 6.3) Tester PROD

```bash
# Basculer sur prod
firebase use prod

# Vérifier la configuration
firebase projects:list
```

---

## 📊 Étape 7 : Initialiser les données (PREPROD)

Une fois le projet PREPROD créé, vous pouvez :

1. **Copier les règles Firestore** depuis PROD :
   ```bash
   firebase use prod
   firebase firestore:rules:get > firestore.rules.prod
   
   firebase use preprod
   # Copier le contenu de firestore.rules.prod dans firestore.rules
   firebase deploy --only firestore:rules
   ```

2. **Copier les index Firestore** depuis PROD :
   ```bash
   firebase use prod
   firebase firestore:indexes:get > firestore.indexes.prod.json
   
   firebase use preprod
   # Copier le contenu de firestore.indexes.prod.json dans firestore.indexes.json
   firebase deploy --only firestore:indexes
   ```

3. **Optionnel : Importer des données de test** :
   - Utiliser l'émulateur pour créer des données de test
   - Ou exporter depuis DEV et importer dans PREPROD

---

## 🔒 Étape 8 : Configurer les domaines autorisés (Authentication)

Pour **chaque projet**, configurer les domaines autorisés :

1. Aller dans **Authentication** > **Settings** > **Authorized domains**
2. Ajouter les domaines :
   - **DEV** : `localhost`, `127.0.0.1`
   - **PREPROD** : `location-maison-preprod.vercel.app`, `*.vercel.app`
   - **PROD** : `location-maison.vercel.app`, `votre-domaine.com`

---

## 📝 Checklist de configuration

### Projet DEV
- [x] Projet créé : `location-maison-dev-67c13` ✅
- [ ] Services activés (Auth, Firestore, Storage, Functions)
- [ ] Configuration récupérée
- [ ] `.env.local.dev` créé avec les bonnes valeurs
- [ ] Émulateurs configurés
- [ ] Test de connexion réussi

### Projet PREPROD
- [ ] Projet créé : `location-maison-gabon-preprod`
- [ ] Services activés (Auth, Firestore, Storage, Functions)
- [ ] Configuration récupérée
- [ ] `.env.local.preprod` créé avec les bonnes valeurs
- [ ] Règles Firestore déployées
- [ ] Index Firestore déployés
- [ ] Domaines autorisés configurés
- [ ] Test de connexion réussi

### Projet PROD
- [ ] Projet vérifié : `location-maison-prod-167da`
- [ ] Configuration à jour dans `.env.local.prod`
- [ ] Domaines autorisés configurés

---

## 🚀 Commandes utiles

### Basculer entre les projets

```bash
# Basculer sur dev
firebase use dev

# Basculer sur preprod
firebase use preprod

# Basculer sur prod
firebase use prod

# Voir le projet actuel
firebase projects:list
```

### Déployer sur un environnement spécifique

```bash
# Déployer les règles Firestore sur preprod
firebase use preprod
firebase deploy --only firestore:rules

# Déployer les index Firestore sur preprod
firebase deploy --only firestore:indexes

# Déployer les fonctions sur preprod
firebase deploy --only functions
```

---

## ⚠️ Notes importantes

1. **Ne jamais mélanger les environnements** : Vérifier toujours le projet actif avec `firebase projects:list`
2. **Backup avant déploiement** : Toujours faire un backup des règles/index avant de déployer
3. **Tests avant prod** : Toujours tester en PREPROD avant de déployer en PROD
4. **Variables d'environnement** : Ne jamais commiter les fichiers `.env.local.*` (déjà dans `.gitignore`)

---

*Dernière mise à jour : 2026-01-12*

