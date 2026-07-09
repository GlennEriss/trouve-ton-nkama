# Firebase Service Account Files

Ce dossier contient les fichiers de service account Firebase pour chaque environnement.

## ⚠️ **IMPORTANT - SÉCURITÉ**

- **NE JAMAIS COMMITER** ces fichiers dans Git
- Ces fichiers contiennent des **clés privées sensibles**
- Le dossier est déjà dans `.gitignore`

## 📁 Structure recommandée

```
services-account-firebase/
├── dev/
│   └── location-maison-dev-67c13-firebase-adminsdk-xxxxx.json
├── preprod/
│   └── location-maison-gabon-preprod-firebase-adminsdk-xxxxx.json
└── prod/
    └── location-maison-prod-167da-firebase-adminsdk-xxxxx.json
```

## 🔧 Comment obtenir les fichiers Service Account

### Pour chaque projet Firebase (dev, preprod, prod) :

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner le projet
3. Aller dans **Project Settings** (⚙️ en haut à gauche)
4. Onglet **Service accounts**
5. Cliquer sur **"Generate new private key"**
6. Télécharger le fichier JSON
7. Placer le fichier dans le dossier correspondant :
   - `dev/` pour le projet DEV
   - `preprod/` pour le projet PREPROD
   - `prod/` pour le projet PROD

## 📝 Nommage des fichiers

Nommer les fichiers de manière claire :

```
{project-id}-firebase-adminsdk-{random}.json
```

Exemple :
- `location-maison-dev-67c13-firebase-adminsdk-abc123.json`
- `location-maison-gabon-preprod-firebase-adminsdk-def456.json`
- `location-maison-prod-167da-firebase-adminsdk-ghi789.json`

## 🔒 Utilisation dans le code

Ces fichiers sont utilisés pour :
- Firebase Admin SDK (server-side)
- Cloud Functions
- Scripts d'administration
- Migrations de données

### Exemple d'utilisation :

```typescript
import admin from 'firebase-admin';
import serviceAccount from '../services-account-firebase/dev/location-maison-dev-67c13-firebase-adminsdk-xxxxx.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  projectId: 'location-maison-dev-67c13'
});
```

## ⚠️ Variables d'environnement (Alternative)

Pour une meilleure sécurité en production, utilisez plutôt des variables d'environnement :

```bash
FIREBASE_PROJECT_ID=location-maison-dev-67c13
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@location-maison-dev-67c13.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 🚨 Checklist de sécurité

- [ ] Dossier ajouté au `.gitignore` ✅
- [ ] Fichiers jamais commités dans Git
- [ ] Accès limité aux développeurs autorisés
- [ ] Rotation régulière des clés (tous les 90 jours recommandé)
- [ ] Utilisation de variables d'environnement en production (Vercel, etc.)

---

*Dernière mise à jour : 2026-01-12*

