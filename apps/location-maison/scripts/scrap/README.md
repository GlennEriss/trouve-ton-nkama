# 🚀 Script d'importation d'annonces immobilières

Système complet d'importation d'annonces depuis des données JSON vers Firestore avec upload d'images sur Firebase Storage.

## 📁 **Organisation des fichiers**

```
scripts/scrap/
├── 📄 import-script.ts          # Script principal
├── ⚙️ config.ts                 # Configuration centralisée
├── 🗂️ mappers.ts               # Transformation des données
├── 🔧 package.json             # Dépendances et scripts
├── 📋 tsconfig.json            # Configuration TypeScript
├── 🙈 .gitignore               # Fichiers à ignorer
├── 📊 reports/                  # 📁 Rapports d'importation
│   ├── import-report-xxx.json   # Rapports détaillés
│   └── ...                     # Historique des importations
├── 🔥 firebase/
│   └── config.ts               # Configuration Firebase Admin
├── 🛠️ utils/
│   ├── location.ts             # Gestion des localisations
│   ├── image.ts                # Upload d'images
│   └── validator.ts            # Validation des données
├── 📝 types/
│   ├── annonce.d.ts            # Types des annonces
│   └── creation.d.ts           # Types de création
├── 🗂️ Données d'entrée:
│   ├── biens_enrichis_with_local_images.json
│   ├── localisations_enrichies_photon.json
│   └── images/                 # Images locales à uploader
└── 🔐 .env                     # Variables d'environnement
```

## 📊 **Rapports d'importation**

### **Localisation**
Tous les rapports sont automatiquement sauvegardés dans le dossier `reports/` :

```
reports/
├── import-report-1751820824572.json    # Test avec 10 annonces
├── import-report-1751821234567.json    # Import complet
└── import-report-1751821456789.json    # Import partiel
```

### **Contenu des rapports**
Chaque rapport contient :

```json
{
  "timestamp": "2024-01-06T10:30:45.123Z",
  "totalProcessed": 1250,
  "successful": 1180,
  "failed": 70,
  "skipped": 0,
  "errors": [
    "49487: Prix invalide",
    "49488: Localisation manquante",
    "..."
  ],
  "processingTime": 125430
}
```

### **Analyse des rapports**
```bash
# Voir le dernier rapport
ls -la reports/ | tail -1

# Analyser un rapport spécifique
cat reports/import-report-xxx.json | jq .

# Statistiques rapides
cat reports/import-report-xxx.json | jq '{successful: .successful, failed: .failed, total: .totalProcessed}'
```

## 🚀 **Utilisation**

### **Scripts disponibles**

```bash
# Test avec 10 annonces (mode simulation)
npm run import:test

# Simulation complète sans sauvegarde
npm run import:dry-run

# Import réel de toutes les annonces
npm run import

# Gestion du propriétaire
npm run show-owner
npm run change-owner nouveauUID
```

### **Options avancées**

```bash
# Import avec options personnalisées
ts-node import-script.ts --batch-size 25 --limit 500
ts-node import-script.ts --skip-images --start-from 100
ts-node import-script.ts --dry-run --limit 50
```

## ⚙️ **Configuration**

### **Propriétaire des annonces**
Toutes les annonces importées sont assignées au propriétaire configuré dans `config.ts` :

```typescript
DEFAULT_CREATED_BY: 'rgNMpYuXxFMpe3zeYvlxzkigPnm1'
```

**Changer le propriétaire :**
```bash
npm run change-owner nouveauUID
```

### **Dossiers configurables**
```typescript
REPORTS_FOLDER: './reports/',        // Rapports d'importation
IMAGES_FOLDER_PATH: './images/',     // Images locales
BIENS_JSON_PATH: './biens_enrichis_with_local_images.json',
LOCALISATIONS_JSON_PATH: './localisations_enrichies_photon.json'
```

## 🔧 **Installation et configuration**

### **1. Installation des dépendances**
```bash
npm install
```

### **2. Configuration Firebase**
Créez un fichier `.env` :
```bash
FIREBASE_PROJECT_ID=votre-projet-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@votre-projet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
```

### **3. Vérification**
```bash
npm run import:test
```

## 📊 **Workflow d'importation**

1. **Préparation** : Validation des fichiers JSON et images
2. **Configuration** : Vérification Firebase et propriétaire
3. **Traitement** : Import par lots avec gestion d'erreurs
4. **Rapport** : Sauvegarde automatique dans `reports/`
5. **Nettoyage** : Suppression des fichiers temporaires

## 🎯 **Fonctionnalités**

- ✅ **Import sécurisé** : Validation complète des données
- ✅ **Gestion d'images** : Upload automatique vers Firebase Storage
- ✅ **Localisation GPS** : Enrichissement automatique des coordonnées
- ✅ **Rapports détaillés** : Historique complet dans `reports/`
- ✅ **Mode simulation** : Test sans impact sur la base de données
- ✅ **Gestion d'erreurs** : Récupération et continuation en cas d'échec
- ✅ **Configuration centralisée** : Propriétaire et paramètres modifiables
- ✅ **Performance** : Traitement par lots optimisé

## 🛠️ **Maintenance**

### **Nettoyage des rapports**
```bash
# Supprimer les rapports de plus de 30 jours
find reports/ -name "*.json" -mtime +30 -delete

# Garder seulement les 10 derniers rapports
ls -t reports/*.json | tail -n +11 | xargs rm -f
```

### **Sauvegarde**
```bash
# Archiver les rapports
tar -czf reports-backup-$(date +%Y%m%d).tar.gz reports/
```

---

**🎉 Système d'importation prêt à l'emploi avec rapports centralisés !** 