# Configuration .env

Créez un fichier `.env` dans le dossier `scripts/scrap/` avec le contenu suivant :

```bash
# Configuration Firebase pour l'importation des annonces

# ID du projet Firebase
FIREBASE_PROJECT_ID=your-project-id

# Email du compte de service Firebase
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# Clé privée du compte de service Firebase (avec \n pour les retours à la ligne)
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE_ICI\n-----END PRIVATE KEY-----\n"

# Bucket de stockage Firebase
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

## 🔧 Exemple pour le projet actuel

```bash
# Remplacez les valeurs suivantes par les vraies valeurs
FIREBASE_PROJECT_ID=home-rent-1534e
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-60bgq@home-rent-1534e.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...VOTRE_CLE_PRIVEE...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=home-rent-1534e.appspot.com
```

## 📋 Instructions

1. **Créer le fichier** : `touch scripts/scrap/.env`
2. **Copier le contenu** : Utilisez l'exemple ci-dessus
3. **Remplacer les valeurs** : Mettez vos vraies clés Firebase
4. **Tester** : `node import.js --dry-run --limit 5`

⚠️ **Important** : Ne commitez jamais le fichier `.env` avec vos vraies clés ! 