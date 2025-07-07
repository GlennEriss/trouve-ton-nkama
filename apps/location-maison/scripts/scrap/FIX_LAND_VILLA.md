# Script de Correction : Terrains et Villas

Ce script corrige deux problèmes spécifiques dans Firestore :

## 🎯 Objectifs

1. **Ajouter les terrains manquants** : Import uniquement des biens avec `type_bien: "Terrain"`
2. **Corriger les villas existantes** : Remplacer `typeProperty: "Villa"` par `typeProperty: "Home"`

## 🚀 Utilisation

### Scripts NPM disponibles

```bash
# Test complet (simulation)
npm run fix:terrain-villa:dry

# Exécution réelle (les deux opérations)
npm run fix:terrain-villa

# Ajouter uniquement les terrains
npm run fix:terrain-only

# Mettre à jour uniquement les villas → Home
npm run fix:villa-only
```

### Commandes détaillées

```bash
# Test complet avec aperçu
ts-node fix-land-and-villa.ts --dry-run

# Exécution réelle
ts-node fix-land-and-villa.ts

# Opérations spécifiques
ts-node fix-land-and-villa.ts --only-terrain --dry-run
ts-node fix-land-and-villa.ts --only-villa --dry-run
```

## 📊 Que fait le script ?

### 1. Mise à jour des Villas → Home

- **Recherche** : Tous les documents avec `typeProperty: "Villa"`
- **Action** : Met à jour vers `typeProperty: "Home"`
- **Sécurité** : Utilise une requête Firestore précise

```javascript
// AVANT
{ typeProperty: "Villa", ... }

// APRÈS  
{ typeProperty: "Home", ... }
```

### 2. Ajout des Terrains

- **Source** : Fichier JSON `biens_enrichis_with_local_images.json`
- **Filtre** : Uniquement `type_bien: "Terrain"`
- **Mapping** : `"Terrain"` → `typeProperty: "Land"`
- **Images** : Upload automatique vers Firebase Storage

## 📋 Rapports générés

Le script génère un rapport détaillé :

```json
{
  "timestamp": "2025-07-06T19:30:00.000Z",
  "operation": "fix-land-and-villa",
  "villaUpdated": 15,
  "terrainAdded": 23,
  "errors": [],
  "processingTime": 12000
}
```

## ⚠️ Précautions

### Mode Dry-Run recommandé

**Toujours tester d'abord** avec `--dry-run` :

```bash
npm run fix:terrain-villa:dry
```

### Sauvegarde recommandée

Avant l'exécution réelle, exportez vos données Firestore :

```bash
# Exemple avec Firebase CLI
firebase firestore:export backup-$(date +%Y%m%d)
```

## 📈 Exemples de sortie

### Mode Dry-Run

```
🔧 Correction des types de propriétés dans Firestore
===================================================

🏠 Mise à jour des Villas vers Home...
📊 12 villas trouvées à mettre à jour
✅ [DRY-RUN] Villa AbcDefGhi123 → Home
✅ [DRY-RUN] Villa XyzUvwRst456 → Home

🌍 Ajout des terrains...
📊 8 terrains trouvés à ajouter
✅ [DRY-RUN] Terrain firebase_1751829xxx (terrain_001) ajouté

🎉 OPÉRATION TERMINÉE (DRY-RUN)
====================
📊 Résumé:
  - Villas mises à jour vers Home: 12
  - Terrains ajoutés: 8
  - Temps total: 5.43 secondes
```

### Mode Réel

```
🔧 Correction des types de propriétés dans Firestore
===================================================

🏠 Mise à jour des Villas vers Home...
📊 12 villas trouvées à mettre à jour
✅ Villa AbcDefGhi123 → Home
✅ Villa XyzUvwRst456 → Home

🌍 Ajout des terrains...
📊 8 terrains trouvés à ajouter
📸 3 images uploadées pour le terrain
✅ Terrain firebase_1751829xxx (terrain_001) ajouté

🎉 OPÉRATION TERMINÉE
====================
📊 Résumé:
  - Villas mises à jour vers Home: 12
  - Terrains ajoutés: 8
  - Temps total: 45.67 secondes

📄 Rapport sauvegardé: ./reports/fix-land-villa-report-1751829xxx.json
```

## 🔧 Configuration

Le script utilise la même configuration que l'import principal :

- **Propriétaire** : `CONFIG.DEFAULT_CREATED_BY` (actuellement ``)
- **Firebase** : Variables d'environnement du `.env`
- **Storage** : ``

## 🚨 Gestion d'erreurs

Le script gère :

- **Connexions Firebase** échouées
- **Documents** introuvables  
- **Upload d'images** échoué
- **Validation** des données

Toutes les erreurs sont collectées et rapportées à la fin.

## 📝 Logs et debug

Pour plus de détails, consultez :

- **Console** : Logs en temps réel
- **Rapports** : `./reports/fix-land-villa-report-*.json`
- **Firebase Console** : Vérification des données 