# 🔥 Configuration Firebase Storage

## 📋 Vue d'ensemble

Ce document explique comment configurer **FIREBASE_STORAGE_BUCKET** et **FIREBASE_STORAGE_PATHS** pour l'importation des annonces.

---

## 🗄️ **FIREBASE_STORAGE_BUCKET**

### **Qu'est-ce que c'est ?**
C'est le **nom du "seau" (bucket)** où vos fichiers seront stockés dans Firebase Storage. C'est comme le nom de votre disque dur dans le cloud.

### **Configuration dans `.env`**
```bash
# Bucket par défaut de votre projet Firebase
FIREBASE_STORAGE_BUCKET=location-maison-12345.appspot.com

# Ou un bucket personnalisé
FIREBASE_STORAGE_BUCKET=immobilier-gabon-images
```

### **Exemples typiques**
```bash
# Format par défaut
FIREBASE_STORAGE_BUCKET=votre-projet-id.appspot.com

# Formats personnalisés
FIREBASE_STORAGE_BUCKET=properties-images
FIREBASE_STORAGE_BUCKET=location-maison-prod
FIREBASE_STORAGE_BUCKET=immobilier-gabon-2024
```

---

## 📁 **FIREBASE_STORAGE_PATHS**

### **Qu'est-ce que c'est ?**
Ce sont les **chemins/dossiers à l'intérieur du bucket** pour organiser vos fichiers.

### **Configuration actuelle**
```typescript
export const FIREBASE_STORAGE_PATHS = {
  PROPERTY_IMAGES: 'properties/images',  // Images des annonces
  TEMP_IMAGES: 'temp/images'            // Images temporaires
} as const;
```

---

## 🎯 **Structure complète générée**

```
📦 Bucket: location-maison-12345.appspot.com
├── 📁 properties/
│   └── 📁 images/
│       ├── 🖼️ 49487_maison_1_1672531200000.jpg
│       ├── 🖼️ 49474_villa_2_1672531250000.jpg
│       ├── 🖼️ 49454_appartement_1_1672531300000.jpg
│       └── 🖼️ 49423_bureau_3_1672531400000.jpg
└── 📁 temp/
    └── 📁 images/
        └── 🖼️ temp_upload_123.jpg (supprimé automatiquement)
```

---

## 🔗 **URLs générées**

### **Format des URLs**
```
https://storage.googleapis.com/{BUCKET}/{PATH}/{FILENAME}
```

### **Exemples concrets**
```bash
# Image d'une maison
https://storage.googleapis.com/location-maison-12345.appspot.com/properties/images/49487_maison_1_1672531200000.jpg

# Image d'un appartement
https://storage.googleapis.com/location-maison-12345.appspot.com/properties/images/49474_appartement_2_1672531250000.jpg
```

---

## ⚙️ **Configuration étape par étape**

### **1. Créer/Configurer le bucket**
```bash
# Dans votre console Firebase
# 1. Allez dans "Storage" 
# 2. Créez un bucket ou utilisez le bucket par défaut
# 3. Configurez les règles de sécurité
```

### **2. Configurer les variables d'environnement**
```bash
# Dans votre fichier .env
FIREBASE_PROJECT_ID=location-maison-12345
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-abcde@location-maison-12345.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE_ICI\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=location-maison-12345.appspot.com
```

### **3. Vérifier la configuration**
```bash
# Testez votre configuration
npm run import:test
```

---

## 🚀 **Utilisation pratique**

### **Pendant l'importation**
1. Le script lit les images locales depuis `./images/`
2. Upload chaque image vers `{BUCKET}/properties/images/`
3. Génère l'URL publique
4. Sauvegarde l'URL dans Firestore

### **Format des noms de fichiers**
```
{ID_ANNONCE}_{TYPE_BIEN}_{INDEX_IMAGE}_{TIMESTAMP}.jpg
```

### **Exemples**
```bash
49487_maison_1_1672531200000.jpg
49474_villa_2_1672531250000.jpg
49454_appartement_1_1672531300000.jpg
```

---

## 🔒 **Sécurité**

### **Règles Firebase Storage recommandées**
```javascript
// Règles basiques pour les images des annonces
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Images des propriétés - lecture publique
    match /properties/images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Images temporaires - accès restreint
    match /temp/images/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## 🛠️ **Maintenance**

### **Nettoyage automatique**
- Les images dans `temp/images/` sont supprimées automatiquement
- Les images dans `properties/images/` sont permanentes

### **Monitoring**
- Surveillez la taille de votre bucket
- Vérifiez les quotas Firebase Storage
- Optimisez les tailles d'images si nécessaire

---

## ❓ **FAQ**

### **Q: Puis-je changer le nom du bucket ?**
R: Oui, mais vous devez :
1. Mettre à jour `.env`
2. Mettre à jour `config.ts`
3. Migrer les images existantes

### **Q: Puis-je personnaliser les dossiers ?**
R: Oui, modifiez `FIREBASE_STORAGE_PATHS` dans `config.ts`

### **Q: Que se passe-t-il si le bucket n'existe pas ?**
R: Le script d'import échouera avec une erreur claire 