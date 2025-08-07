# Script de Transformation des Posts Facebook JSON via Apify

Ce script traite les fichiers JSON contenant des posts Facebook scrappés via Apify et les transforme en propriétés immobilières via l'IA.

## Objectif

Transformer les posts Facebook (format JSON Apify) en objets propriétés structurés en filtrant les posts ayant au moins 2 photos.

## Structure

- `transform-facebook-posts.ts` : Script principal
- `extractors/facebook-json-extractor.ts` : Extraction et filtrage des posts JSON
- `mappers/ai-property-mapper.ts` : Transformation IA des posts en propriétés
- `facebook-posts/` : Dossier contenant les fichiers JSON sources

## Prérequis

1. **Configuration IA** : Le script utilise la configuration du dossier `../ia/config/`
2. **Clés API OpenAI** : Configurées via le KeyManager du script IA
3. **Fichiers JSON** : Fichiers `property-*.json` dans le dossier `facebook-posts/`

## Critères de Filtrage

### Posts Valides
- ✅ Au moins 2 photos dans les attachments
- ✅ Texte d'au moins 10 caractères
- ✅ Attachments de type "Photo" avec URLs d'images

### Posts Rejetés
- ❌ 0 ou 1 photo seulement
- ❌ Pas de texte ou texte trop court
- ❌ Pas d'attachments de type "Photo"

## Utilisation

### 1. Préparation
```bash
# S'assurer que la configuration IA est prête
cd ../ia/config/
# Vérifier config.yaml

# S'assurer que les fichiers JSON sont dans facebook-posts/
cd ../../apify/facebook-posts/
ls property-*.json

# Retourner au dossier apify
cd ../
```

### 2. Exécution
```bash
# Avec TypeScript directement
npx ts-node transform-facebook-posts.ts

# Ou avec le script de lancement
node run.js
```

## Flux de Traitement

1. **Chargement** : Lecture de tous les fichiers `property-*.json` du dossier `facebook-posts/`
2. **Extraction** : Parse des posts et extraction des métadonnées
3. **Filtrage** : Sélection des posts avec ≥2 photos
4. **Transformation IA** : Conversion en objets propriétés
5. **Sauvegarde** : Export vers `facebook-transformed-properties.json`

## Format de Sortie

```json
{
  "typeProperty": "Home",
  "title": "Maison 3 chambres Akanda",
  "description": "Belle maison à vendre...",
  "price": 33000000,
  "status": "FOR_SALE",
  "contact": "077933932",
  "street": "Derrière le marché",
  "city": "Akanda",
  "province": "Estuaire", 
  "country": "Gabon",
  "countryCode": "GA",
  "longitude": 0,
  "latitude": 0,
  "area": 150,
  "images": ["url1", "url2", "url3"],
  "tags": ["maison", "3chambres", "akanda"],
  "nbrRooms": 3,
  "nbrChickens": 1,
  "nbrBathrooms": 2,
  "nbrToilets": 1
}
```

## Statistiques

Le script affiche :
- Nombre de fichiers JSON traités
- Posts par fichier
- Répartition par nombre de photos
- Taux de succès de transformation IA
- Posts rejetés et raisons

## Gestion des Erreurs

- **Rate limiting** : Pause automatique entre les requêtes
- **Clés API limitées** : Rotation automatique via KeyManager
- **JSON invalide** : Logs détaillés des erreurs de parsing
- **Posts partiels** : Sauvegarde même en cas d'échecs partiels

## Organisation des Dossiers

```
scripts/apify/
├── transform-facebook-posts.ts    # Script principal
├── run.js                         # Script de lancement
├── README.md                      # Cette documentation
├── extractors/
│   └── facebook-json-extractor.ts # Extracteur JSON
├── mappers/
│   └── ai-property-mapper.ts      # Mapper IA
└── facebook-posts/                # Fichiers JSON sources
    ├── property-*.json            # Données Facebook Apify
    └── (autres fichiers JSON)
``` 