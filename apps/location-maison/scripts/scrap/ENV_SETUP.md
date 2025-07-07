# 🔧 Configuration du fichier .env pour l'importation

## ✅ **Bonne nouvelle !**
Votre fichier `.env` actuel contient déjà **toutes les variables nécessaires** pour le script d'importation.

## 📋 **Variables requises (déjà présentes)**

Le script d'importation utilise ces variables de votre `.env` :

```bash
# ✅ Déjà configurées dans votre .env
FIREBASE_PROJECT_ID=home-rent-1534e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-60bgq@home-rent-1534e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=home-rent-1534e.appspot.com
```

## 🔄 **Ajout optionnel**

Pour plus de clarté, vous pouvez ajouter cette variable dans votre `.env` :

```bash
# Variable dédiée pour le script d'importation (optionnel)
FIREBASE_STORAGE_BUCKET=home-rent-1534e.appspot.com
```

## 📁 **Configuration finale**

Avec votre configuration actuelle, vos images seront stockées dans :

```
📦 Bucket: home-rent-1534e.appspot.com
├── 📁 properties/
│   └── 📁 images/
│       ├── 🖼️ 49487_maison_1_timestamp.jpg
│       ├── 🖼️ 49474_villa_2_timestamp.jpg
│       └── 🖼️ 49454_appartement_1_timestamp.jpg
└── 📁 temp/
    └── 📁 images/
        └── 🖼️ temp_upload_123.jpg
```

## 🚀 **URLs générées**

Vos images auront des URLs comme :
```
https://storage.googleapis.com/home-rent-1534e.appspot.com/properties/images/49487_maison_1_timestamp.jpg
```

## ⚙️ **Étapes suivantes**

1. **Votre `.env` est prêt** ✅
2. **Le script est configuré** pour votre bucket ✅
3. **Vous pouvez maintenant lancer** :
   ```bash
   cd scripts/scrap
   npm install
   npm run import:test
   ```

## 🔒 **Sécurité**

- Votre fichier `.env` contient des clés sensibles
- Ne le commitez **jamais** dans Git
- Il est déjà dans `.gitignore` ✅

## 🛠️ **Commandes disponibles**

```bash
# Test avec 10 annonces
npm run import:test

# Simulation complète (sans import réel)
npm run import:dry-run

# Import complet
npm run import

# Gestion du propriétaire
npm run show-owner
npm run change-owner nouveauUID
```

---

**✨ Votre configuration est parfaite ! Le script utilisera automatiquement votre bucket Firebase existant.** 