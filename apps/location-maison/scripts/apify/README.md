# Transformation des Posts Facebook avec IA et Déduplication

Ce script permet de transformer automatiquement les posts Facebook immobiliers en propriétés structurées en utilisant l'intelligence artificielle, avec déduplication automatique des annonces en double.

## 🚀 Fonctionnalités

- **Filtrage intelligent** : Sélectionne uniquement les posts avec minimum 2 photos
- **Transformation IA** : Convertit le texte brut en JSON structuré avec titres et descriptions nettoyés
- **Validation des tags** : Utilise uniquement les tags autorisés de `src/constantes/index.ts`
- **Déduplication automatique** : Supprime les annonces en double basées sur plusieurs critères
- **Formatage professionnel** : Corrige l'orthographe, supprime les emojis, structure les descriptions

## 📁 Structure des fichiers

```
facebook-posts/           # Dossier contenant les JSON Facebook
├── property-*.json       # Fichiers JSON des posts Facebook
```

## 🔧 Utilisation

### Lancement du script principal
```bash
cd scripts/apify
node transform-facebook-posts.js
```

### Lancement de la déduplication seule
```bash
cd scripts/apify
node deduplicate-properties.js
```

## 📊 Workflow complet

1. **Chargement** : Lecture des fichiers `property-*.json`
2. **Filtrage** : Garde uniquement les posts avec ≥2 photos et texte suffisant
3. **Transformation IA** : Conversion en propriétés structurées
4. **Déduplication automatique** : Suppression des doublons
5. **Sauvegarde** : Export des résultats

## 📄 Fichiers de sortie

- `facebook-transformed-properties.json` : Propriétés transformées (avec doublons)
- `facebook-transformed-properties-deduplicated.json` : Propriétés uniques (recommandé)

## 🔍 Critères de déduplication

Le script identifie les doublons basés sur :

- **Contact identique** + similarité titre/description > 80%
- **Même ville + même nombre de chambres** + prix similaire + contenu similaire
- **Tolérance prix** : ±10% ou ±50,000F

### Sélection de la meilleure propriété
Parmi les doublons, le script garde celle avec :
1. Coordonnées géographiques renseignées
2. Description la plus détaillée  
3. Plus d'images
4. Contact non-générique
5. Province/rue renseignées

## ⚙️ Configuration

### Critères de filtrage
- **Photos minimum** : 2
- **Texte minimum** : 10 caractères

### IA et formatage
- **Correction orthographique** : Automatique
- **Suppression emojis** : Automatique  
- **Tags** : Uniquement ceux de `src/constantes/index.ts`
- **Format descriptions** : 200 caractères max, bien rédigées

### Gestion des clés API
- **Rotation automatique** : En cas de limite de taux
- **Suivi des utilisations** : Statistiques sauvegardées
- **8 clés disponibles** : Charge répartie

## 📈 Statistiques

Le script affiche :
- Nombre de posts traités
- Propriétés générées avec succès
- Échecs avec raisons
- Doublons détectés et supprimés
- Groupes de doublons avec détails

## 🐛 Dépannage

### Erreurs API courantes
- **503 Service Unavailable** : Service IA temporairement indisponible
- **500 Internal Server Error** : Erreur interne de l'API
- **429 Rate Limit** : Limite atteinte → basculement automatique

### Problèmes de déduplication
- **Seuil trop strict** : Modifier `duplicateThreshold` dans `deduplicate-properties.js`
- **Contacts mal normalisés** : Vérifier la fonction `normalizeContact`

### Fichiers manquants
```bash
# Vérifier la présence des fichiers
ls facebook-posts/property-*.json
```

## ⏭️ Étapes suivantes

Après ce script, utiliser :
1. `scripts/download-img/download-images.js` : Téléchargement des images
2. `scripts/firebase/upload-properties.js` : Upload vers Firebase

## 🔧 Structure des propriétés générées

```json
{
  "typeProperty": "Apartment",
  "title": "Appartement 2 chambres à louer à Nzeng-Ayong",
  "description": "Appartement de bon standing avec 2 chambres...",
  "price": 250000,
  "status": "FOR_RENT",
  "contact": "077933932/066100817",
  "street": "Nzeng-Ayong",
  "city": "Libreville",
  "province": "Estuaire",
  "country": "Gabon",
  "countryCode": "GA",
  "longitude": 9.4531,
  "latitude": 0.3889,
  "area": 100,
  "images": ["url1", "url2"],
  "tags": ["Famille", "Parking"],
  "nbrRooms": 2,
  "nbrChickens": 1,
  "nbrBathrooms": 1,
  "nbrToilets": 1
}
``` 