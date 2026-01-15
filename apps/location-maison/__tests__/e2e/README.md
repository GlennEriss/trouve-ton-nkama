# Tests E2E - Configuration Multi-Environnements

Ce dossier contient les tests End-to-End (E2E) pour la plateforme Location Maison Gabon.

## 🌍 Environnements Supportés

Les tests E2E peuvent être exécutés sur 3 environnements différents :

| Environnement | Projet Firebase | Usage |
|---------------|----------------|-------|
| **DEV** | `location-maison-dev` | Développement local avec Firebase Cloud |
| **PREPROD** | `location-maison-preprod` | Tests UAT, validation avant prod |
| **PROD** | `location-maison-prod-167da` | Production (⚠️ utiliser avec précaution) |

## 📋 Prérequis

### Fichiers d'environnement requis

Avant de lancer les tests, vous devez avoir les fichiers suivants à la racine du projet :

- `.env.local.dev` - Variables d'environnement pour DEV
- `.env.local.preprod` - Variables d'environnement pour PREPROD
- `.env.local.prod` - Variables d'environnement pour PROD

**Templates disponibles** :
- `documentation/setup/env.local.dev.template`
- `documentation/setup/env.local.preprod.template`

### Variables Firebase requises

Chaque fichier `.env.local.*` doit contenir :

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# App Configuration
NEXT_PUBLIC_APP_ENV=development|preprod|production
NEXT_PUBLIC_APP_URL=http://localhost:3001|https://location-maison-preprod.vercel.app|https://tonnkama.com

# Émulateurs (dev uniquement)
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true|false
```

## 🚀 Commandes

### Tests E2E en DEV (par défaut)

```bash
# Lancer les tests E2E avec l'environnement DEV
npm run test:e2e:run:dev

# Ou simplement (dev par défaut)
npm run test:e2e
```

### Tests E2E en PREPROD

```bash
# Lancer les tests E2E avec l'environnement PREPROD
npm run test:e2e:run:preprod
```

### Tests E2E en PROD

```bash
# ⚠️ ATTENTION : Tests sur la base de données de production
npm run test:e2e:run:prod
```

## 🔧 Scripts Disponibles

| Script | Description |
|--------|-------------|
| `test:e2e` | Lance les tests E2E (environnement DEV par défaut) |
| `test:e2e:run:dev` | Lance les tests E2E avec l'environnement DEV |
| `test:e2e:run:preprod` | Lance les tests E2E avec l'environnement PREPROD |
| `test:e2e:run:prod` | Lance les tests E2E avec l'environnement PROD |
| `test:e2e:setup:dev` | Copie `.env.local.dev` vers `.env.local` |
| `test:e2e:setup:preprod` | Copie `.env.local.preprod` vers `.env.local` |
| `test:e2e:setup:prod` | Copie `.env.local.prod` vers `.env.local` |

## 📝 Configuration

### Playwright Config

La configuration Playwright (`playwright.config.ts`) charge automatiquement les variables d'environnement selon la variable `E2E_ENV` :

- `E2E_ENV=dev` → Charge `.env.local.dev`
- `E2E_ENV=preprod` → Charge `.env.local.preprod`
- `E2E_ENV=prod` → Charge `.env.local.prod`

### Port du serveur

Le serveur Next.js démarre sur le port **3001** pour les tests E2E (configuré dans `playwright.config.ts`).

## 🎯 Workflow Recommandé

### 1. Développement Local (DEV)

```bash
# 1. S'assurer que .env.local.dev existe
# 2. Lancer les tests
npm run test:e2e:run:dev
```

### 2. Validation Préprod

```bash
# 1. S'assurer que .env.local.preprod existe
# 2. Lancer les tests
npm run test:e2e:run:preprod
```

### 3. Production (⚠️ Utiliser avec précaution)

```bash
# 1. S'assurer que .env.local.prod existe
# 2. Lancer les tests (uniquement sur chromium-desktop-prod)
npm run test:e2e:run:prod
```

## 📊 Projets Playwright

Les tests sont organisés en projets selon l'environnement :

- `chromium-desktop-dev` - Tests DEV sur Chrome Desktop
- `chromium-desktop-preprod` - Tests PREPROD sur Chrome Desktop
- `chromium-desktop-prod` - Tests PROD sur Chrome Desktop (⚠️)

## ⚠️ Notes Importantes

1. **Tests PROD** : Les tests en production utilisent la vraie base de données. Utiliser uniquement pour des tests critiques et avec précaution.

2. **Variables d'environnement** : Les fichiers `.env.local.*` ne doivent **JAMAIS** être commités dans Git (déjà dans `.gitignore`).

3. **Port 3001** : Le serveur Next.js démarre sur le port 3001 pour éviter les conflits avec d'autres instances.

4. **Firebase Cloud** : Les tests E2E utilisent Firebase Cloud (pas les émulateurs) pour tester avec la vraie base de données.

## 🔍 Dépannage

### Erreur : "Fichier .env.local.* not found"

**Solution** : Créer le fichier manquant à partir des templates :
```bash
cp documentation/setup/env.local.dev.template .env.local.dev
# Puis éditer avec vos vraies valeurs Firebase
```

### Erreur : "Port 3001 already in use"

**Solution** : Arrêter les autres instances du serveur ou changer le port dans `playwright.config.ts`.

### Tests échouent avec Firebase

**Solution** : Vérifier que les variables Firebase dans `.env.local.*` sont correctes et que le projet Firebase est accessible.

## 📚 Documentation Complémentaire

- [Workflow Documentation](../../documentation/workflow/WORKFLOW.md)
- [Firebase Setup](../../documentation/setup/FIREBASE_PROJECTS_SETUP.md)
- [Environment Variables](../../documentation/config/ENV_VARIABLES.md)
