# 🚀 Référence rapide des commandes

## 📊 **Gestion des rapports**

```bash
# Lister les 10 derniers rapports
npm run reports:list

# Voir le contenu du dernier rapport
npm run reports:latest

# Statistiques rapides du dernier import
npm run reports:stats

# Nettoyer les rapports de plus de 30 jours
npm run reports:clean

# Analyser un rapport spécifique
cat reports/import-report-xxx.json | jq .
```

## 🏠 **Importation des annonces**

```bash
# Test avec 10 annonces (mode simulation)
npm run import:test

# Simulation complète sans sauvegarde
npm run import:dry-run

# Import réel de toutes les annonces
npm run import

# Import avec options personnalisées
ts-node import-script.ts --batch-size 25 --limit 500
ts-node import-script.ts --skip-images --start-from 100
```

## 👤 **Gestion du propriétaire**

```bash
# Voir le propriétaire actuel
npm run show-owner

# Changer le propriétaire
npm run change-owner nouveauUID

# Exemples
npm run change-owner rgNMpYuXxFMpe3zeYvlxzkigPnm1
npm run change-owner testUser123456789
```

## 🔧 **Options avancées**

```bash
# Voir l'aide complète
npm run help

# Mode debug avec validation seule
ts-node import-script.ts --dry-run --skip-images --limit 5

# Import par lots personnalisés
ts-node import-script.ts --batch-size 10 --delay 2000

# Reprendre un import interrompu
ts-node import-script.ts --start-from 500
```

## 📁 **Structure des rapports**

```
reports/
├── import-report-1751820824572.json    # Test avec 10 annonces
├── import-report-1751821234567.json    # Import complet
└── import-report-1751821456789.json    # Import partiel
```

## 📈 **Analyse des rapports**

```bash
# Statistiques de tous les rapports
for file in reports/*.json; do
  echo "=== $(basename $file) ==="
  cat "$file" | jq '{successful: .successful, failed: .failed, total: .totalProcessed}'
done

# Tendance des imports (succès/échecs)
cat reports/*.json | jq -s 'map({timestamp: .timestamp, success_rate: (.successful/.totalProcessed*100)})'

# Rechercher les erreurs spécifiques
cat reports/*.json | jq -r '.errors[]' | grep -i "prix"
```

## 🛠️ **Maintenance**

```bash
# Vérifier l'espace utilisé par les rapports
du -sh reports/

# Archiver les anciens rapports
tar -czf reports-backup-$(date +%Y%m%d).tar.gz reports/

# Garder seulement les 10 derniers rapports
ls -t reports/*.json | tail -n +11 | xargs rm -f

# Statistiques globales
echo "Nombre total de rapports: $(ls reports/*.json 2>/dev/null | wc -l)"
```

---

**💡 Astuce :** Utilisez `jq` pour analyser les rapports JSON de manière avancée !

## 🧪 Tests et validation

```bash
# Validation uniquement (sans images)
npm run import:validation-only
```

## 📦 Importation

```bash
# Import des images uniquement
npm run import:images-only
```

## 🔧 Commandes avancées

```bash
# Test avec limite personnalisée
ts-node import-script.ts --dry-run --limit 50

# Import par petits lots
ts-node import-script.ts --batch-size 10 --limit 100

# Ignorer les images
ts-node import-script.ts --skip-images

# Reprendre à partir d'un index
ts-node import-script.ts --start-from 500

# Aide complète
ts-node import-script.ts --help
```

## 📊 Workflow recommandé

```bash
# 1. Vérifier la configuration
npm run show-owner

# 2. Changer le propriétaire si nécessaire
npm run change-owner VOTRE_UID

# 3. Test rapide
npm run import:test

# 4. Test complet
npm run import:dry-run

# 5. Import réel (PRODUCTION)
npm run import
```

## ⚙️ Configuration

```bash
# Variables d'environnement requises dans .env :
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

## 📁 Fichiers requis

```
scripts/scrap/
├── biens_enrichis_with_local_images.json  ✅ Données des annonces
├── localisations_enrichies_photon.json    ✅ Géolocalisation
├── images/                                 ✅ Images des annonces
└── .env                                    ✅ Configuration Firebase
``` 