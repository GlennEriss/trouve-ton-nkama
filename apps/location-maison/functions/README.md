# Firebase Cloud Functions

Ce dossier contient les Cloud Functions Firebase pour l'application.

## 📁 Structure

```
functions/
├── src/
│   ├── index.ts              # Point d'entrée principal (charge .env)
│   ├── admin.ts              # Configuration Firebase Admin
│   ├── email/
│   │   └── verification.ts   # Fonction d'envoi d'email de vérification
│   ├── notification/
│   │   └── index.ts          # Fonctions de notification
│   ├── analytics/
│   │   └── adsense-sync.ts   # Sync quotidien AdSense -> dashboard admin
│   ├── payments/
│   │   └── airtel/           # Intégration Airtel Money
│   └── credit-payment/
│       └── index.ts          # Gestion des paiements de crédits
├── .env                      # Variables d'environnement (développement local)
├── env.example               # Exemple de fichier .env
└── package.json
```

## 🔧 Configuration

### Variables d'Environnement

Pour le développement local, créez un fichier `.env` dans le dossier `functions/` :

```bash
# Email SMTP (Hostinger)
HOSTINGER_EMAIL_USER=votre-email@hostinger.com
HOSTINGER_EMAIL_PASS=votre-mot-de-passe

# Nom d'affichage pour les emails
EMAIL_DISPLAY_NAME=Trouve Ton Nkama

# URL de l'application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Firebase (pour les émulateurs)
FIREBASE_PROJECT_ID=location-maison-dev
GCLOUD_PROJECT=location-maison-dev

# Sync AdSense -> Admin Analytics
ADSENSE_SYNC_ENABLED=true
ADSENSE_ACCOUNT_RESOURCE=accounts/pub-xxxxxxxxxxxxxxxx
ADSENSE_OAUTH_CLIENT_ID=
ADSENSE_OAUTH_CLIENT_SECRET=
ADSENSE_OAUTH_REFRESH_TOKEN=
ADSENSE_SYNC_TARGET_URL=http://localhost:3001/api/admin/v1/analytics/adapters/adsense
ANALYTICS_INGEST_TOKEN=
```

**Note :** Le fichier `.env` est automatiquement chargé lors du développement local (émulateurs). En production, les secrets sont gérés par Firebase Secret Manager.

### Chargement Automatique

Le fichier `src/index.ts` charge automatiquement le fichier `.env` :
1. D'abord depuis `functions/.env`
2. Sinon depuis `.env.local.dev` à la racine du projet
3. En production, les secrets sont chargés depuis Firebase Secret Manager

## 🚀 Développement Local

### Démarrer les émulateurs

```bash
cd functions
npm install
npm run serve
```

Les variables d'environnement seront automatiquement chargées depuis `.env`.

### Tester les fonctions

```bash
# Tests unitaires
npm test

# Tests d'intégration
npm test -- verification.integration.test.ts

# Test d'envoi réel d'email (⚠️ envoie un vrai email)
ENABLE_REAL_EMAIL_TEST=true TEST_REAL_EMAIL=test@example.com npm run test:real-email
```

## 📦 Déploiement

### Développement (dev)

```bash
firebase use dev
firebase deploy --only functions
```

### Préprod

```bash
firebase use preprod
firebase deploy --only functions --project location-maison-preprod
```

### Production

```bash
firebase use prod
firebase deploy --only functions --project location-maison-prod-167da
```

## 🔐 Secrets Firebase

En production, les secrets doivent être configurés via Firebase Secret Manager :

```bash
# Configurer un secret
firebase functions:secrets:set SECRET_NAME --project location-maison-preprod

# Voir un secret
firebase functions:secrets:access SECRET_NAME --project location-maison-preprod
```

Les secrets suivants sont nécessaires :
- `HOSTINGER_EMAIL_USER`
- `HOSTINGER_EMAIL_PASS`
- `EMAIL_DISPLAY_NAME` (optionnel)
- `NEXT_PUBLIC_APP_URL` (optionnel)

## 📝 Fonctions Disponibles

### Email

- **`sendVerificationEmail`** : Envoie un email de vérification à un utilisateur
  - URL: `https://us-central1-[PROJECT-ID].cloudfunctions.net/sendVerificationEmail`
  - Méthode: POST
  - Body: `{ "email": "user@example.com" }` ou `{ "uid": "user-uid" }`

### Notifications

- **`onUserCreate`** : Déclenché lors de la création d'un utilisateur
- **`onUserFavorisUpdate`** : Déclenché lors de la mise à jour des favoris

### Paiements

- **`initiatePurchase`** : Initie un achat via Airtel Money
- **`createCreditPayment`** : Crée un paiement de crédits

### Analytics

- **`syncAdSenseToAdminAnalytics`** : Job quotidien Cloud Scheduler qui:
  - récupère les rapports AdSense (OAuth refresh token)
  - pousse les lignes dans l'adaptateur `adsense` du dashboard admin
  - applique l'idempotence par fenêtre de date (Firestore)
  - journalise les échecs (`admin_adsense_sync_runs`)

## 🐛 Dépannage

### Les variables d'environnement ne sont pas chargées

1. Vérifiez que le fichier `.env` existe dans `functions/`
2. Vérifiez que `dotenv` est installé : `npm install`
3. Vérifiez les logs lors du démarrage des émulateurs

### Erreur "Secret not found" en production

Les secrets doivent être configurés dans Firebase Secret Manager avant le déploiement.

### Les émulateurs ne démarrent pas

Vérifiez que toutes les dépendances sont installées :
```bash
cd functions
npm install
```
