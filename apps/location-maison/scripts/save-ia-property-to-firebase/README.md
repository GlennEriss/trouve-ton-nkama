# Save IA Property to Firebase

Script pour sauvegarder les propriétés transformées par IA vers Firebase Firestore.

## 🚀 Installation

```bash
npm install
```

## 📋 Configuration

### 1. Configuration Firebase
Le fichier `firebase-config.yaml` contient toute la configuration :

```yaml
firebase:
  project_id: "location-maison-gabon"
  collection_name: "ai_properties"
  batch_size: 500
```

### 2. Variables d'environnement
Créer un fichier `.env` avec les clés Firebase :

```env
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account-key.json
FIREBASE_PROJECT_ID=location-maison-gabon
```

## 🔧 Utilisation

### Compilation
```bash
npm run build
```

### Exécution
```bash
npm start
```

### Développement
```bash
npm run dev
```

## 📊 Fonctionnalités

### ✅ Validation des données
- Vérification des champs obligatoires
- Validation des types de propriétés
- Contrôle des valeurs autorisées

### 🔄 Sauvegarde par batches
- Traitement par lots de 500 documents
- Gestion des erreurs par batch
- Délai entre les batches pour éviter la surcharge

### 💾 Système de sauvegarde
- Sauvegarde automatique avant modification
- Nettoyage des anciennes sauvegardes
- Limite configurable de sauvegardes

### 📈 Statistiques
- Comptage des succès/erreurs
- Répartition par type de propriété
- Taux de succès global

## 🗂️ Structure des données

### Collection: `ai_properties`
```typescript
interface AIProperty {
  typeProperty: "Studio" | "Apartment" | "Home" | "Building" | "Desk" | "Shop" | "Kiosk" | "Room" | "Land";
  title: string;
  description: string;
  price: number;
  status: "FOR_RENT" | "FOR_SALE";
  contact: string;
  street: string;
  city: string;
  province: string;
  country: string;
  countryCode: string;
  longitude: number;
  latitude: number;
  area: number;
  tags: string[];
  images: string[];
  nbrRooms: number;
  nbrBathrooms: number;
  nbrToilets: number;
  nbrKitchens: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  source: string;
  version: string;
}
```

## 🔍 Indexes recommandés

```javascript
// Collection: ai_properties
- typeProperty (asc)
- city (asc)
- price (desc)
- status (asc)
- createdAt (desc)
```

## 🚨 Gestion d'erreurs

Le script gère automatiquement :
- Erreurs de validation des données
- Erreurs de connexion Firebase
- Erreurs de sauvegarde par batch
- Nettoyage des ressources

## 📝 Logs

Le script affiche des logs détaillés :
- Progression des batches
- Statistiques de sauvegarde
- Erreurs avec contexte
- Temps d'exécution

## 🔄 Workflow complet

1. **Chargement** des propriétés depuis `../ia/extractors/transformed_properties.json`
2. **Filtrage** des propriétés valides
3. **Sauvegarde** automatique de l'état actuel
4. **Validation** et transformation des données
5. **Sauvegarde** par batches vers Firebase
6. **Affichage** des statistiques finales 