# Download Images Script

Ce script télécharge toutes les images des propriétés Facebook et remplace les URLs par des chemins locaux.

## 📁 Structure

```
download-img/
├── download-images.js          # Script principal
├── images/                     # Dossier des images téléchargées (gitignore)
├── properties-with-local-images.json  # Nouveau JSON avec chemins locaux
└── README.md                   # Ce fichier
```

## 🚀 Utilisation

```bash
cd scripts/download-img
node download-images.js
```

## 📋 Fonctionnalités

- ✅ Télécharge toutes les images depuis Facebook
- ✅ Nomme les fichiers: `property_X_image_Y.jpg`
- ✅ Remplace les URLs par les chemins locaux
- ✅ Gestion des erreurs et timeouts
- ✅ Progress tracking avec statistiques
- ✅ Conserve l'URL originale en cas d'échec

## 📊 Sortie

Le script génère:
- **`images/`**: Dossier avec toutes les images téléchargées
- **`properties-with-local-images.json`**: Nouveau JSON avec chemins locaux

## 🔧 Configuration

- **Timeout**: 30 secondes par image
- **Source**: `../apify/facebook-transformed-properties.json`
- **Images ignorées**: URLs invalides ou inaccessibles

## 📈 Exemple de transformation

**Avant:**
```json
{
  "images": [
    "https://scontent.fbcdn.net/v/t39.30808-6/image1.jpg",
    "https://scontent.fbcdn.net/v/t39.30808-6/image2.jpg"
  ]
}
```

**Après:**
```json
{
  "images": [
    "images/property_0_image_0.jpg",
    "images/property_0_image_1.jpg"
  ]
}
```

## ⚠️ Notes

- Le dossier `images/` est exclu de Git via `.gitignore`
- Les images sont téléchargées séquentiellement pour éviter la surcharge
- En cas d'échec, l'URL originale est conservée 