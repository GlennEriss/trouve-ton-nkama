# Firebase Property Uploader

Ce script traite les propriétés du JSON local, upload les images vers Firebase Storage et sauvegarde les propriétés dans Firestore.

## 📁 Structure

```
firebase/
├── upload-properties.js           # Script principal
├── firebase-config.js             # Configuration Firebase
├── test-contact-processing.js     # Tests des contacts
├── processed-properties.json      # Résultat avec IDs Firebase
├── package.json                   # Dépendances
└── README.md                      # Ce fichier
```

## 🔧 Prérequis

1. **Variables d'environnement** requises dans `.env` :
   ```
   FIREBASE_PROJECT_ID=tonnkama-49836
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tonnkama-49836.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXXXX\n-----END PRIVATE KEY-----\n"
   FIREBASE_STORAGE_BUCKET=tonnkama-49836.appspot.com
   ```

2. **Dépendances** :
   ```bash
   npm install
   ```

## 🚀 Utilisation

### 🔧 Configuration initiale
1. Créez vos fichiers de configuration :
   ```bash
   cp env.dev.example .env.dev
   cp env.prod.example .env.prod
   ```
2. Éditez `.env.dev` et `.env.prod` avec vos vraies clés Firebase

### 📦 Installation
```bash
cd scripts/firebase
npm install
```

### 🎯 Lancement par environnement
```bash
# Développement (copie .env.dev vers .env et lance l'upload)
npm run dev

# Production (copie .env.prod vers .env et lance l'upload)  
npm run prod

# Vérifier la configuration actuelle
npm run check
```

## 📋 Fonctionnalités

### 🔄 Traitement des contacts
- ✅ Supprime les espaces : `"077 933 932"` → `"077933932"`
- ✅ Détecte plusieurs numéros : `"077933932/066100817"`
  - `contact: "077933932"` (premier numéro)
  - `contacts: ["077933932", "066100817"]` (tous les numéros)
- ✅ Gère les cas vides et "non précisé"

### 📸 Upload d'images
- ✅ Upload vers Firebase Storage dans `properties/`
- ✅ Génère des URLs publiques
- ✅ Nommage : `properties/{propertyIndex}_{imageIndex}_{timestamp}.jpg`
- ✅ Métadonnées attachées

### 🔥 Sauvegarde Firestore
- ✅ Collection : `properties`
- ✅ Ajout automatique : `createdAt`, `updatedAt`, `source`, `isActive`
- ✅ Types ICreation : `createdBy`, `state: 'IN_PROGRESS'`
- ✅ Gestion des erreurs et retry

## 📊 Statistiques

Le script affiche :
- ✅ Propriétés sauvegardées
- 📸 Images uploadées
- 📞 Contacts traités (multi-numéros)
- ❌ Erreurs rencontrées

## 🧪 Tests

```bash
# Tester le traitement des contacts
npm test

# Tester une seule propriété avec les nouveaux champs
npm run test:single

# Vérifier les URLs d'images dans Firestore
npm run verify:images

# Tester la connexion Firebase
npm run test:connection

# Vérifier l'environnement actuel
npm run check
```

## 📄 Exemple de transformation

**Avant:**
```json
{
  "contact": "077 933 932 / 066 100 817",
  "images": [
    "images/property_0_image_0.jpg",
    "images/property_0_image_1.jpg"
  ]
}
```

**Après:**
```json
{
  "contact": "077933932",
  "contacts": ["077933932", "066100817"],
  "images": [
    "https://storage.googleapis.com/tonnkama-49836.appspot.com/properties/0_0_1640995200000.jpg",
    "https://storage.googleapis.com/tonnkama-49836.appspot.com/properties/0_1_1640995201000.jpg"
  ],
  "createdAt": "2024-07-30T12:00:00Z",
  "updatedAt": "2024-07-30T12:00:00Z",
  "source": "facebook_import",
  "isActive": true
}
```

## ⚠️ Notes

- Le script fait des pauses de 2s toutes les 5 propriétés pour éviter la surcharge
- Les images en échec gardent leur chemin local
- Un fichier `processed-properties.json` est généré avec les IDs Firestore
- Les URLs Firebase Storage sont publiques par défaut 