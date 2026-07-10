# Carte Interactive du Gabon - Feature Documentation

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Problématique actuelle](#problématique-actuelle)
3. [Solution proposée](#solution-proposée)
4. [Design UX/UI](#design-uxui)
5. [Architecture technique](#architecture-technique)
6. [Structure des données OSM](#structure-des-données-osm)
7. [Défis techniques et solutions](#défis-techniques-et-solutions)
8. [Plan d'implémentation](#plan-dimplémentation)
9. [Composants à créer](#composants-à-créer)
10. [Intégration avec le système existant](#intégration-avec-le-système-existant)
11. [Tests et validation](#tests-et-validation)

---

## Vue d'ensemble

### Objectif

Créer une **carte interactive plein écran** avec OpenStreetMap qui permet de :
- Visualiser les **délimitations géographiques** des quartiers du Gabon
- **Rechercher et sélectionner** un quartier via un combobox avec recherche intégrée
- **Focus automatique** sur le quartier sélectionné avec mise en surbrillance (couleur verte)
- Afficher les **logements disponibles** dans le quartier sélectionné via une sidebar

### URL cible

```
/map
```

Accessible depuis la page de recherche (`/search`) via un bouton "Explorer la carte" ou depuis la navigation principale.

---

## Problématique actuelle

### Situation

La page `/search` dispose d'une carte Google Maps (via `GoogleMapViewer.tsx`) qui :
- Affiche les propriétés sous forme de marqueurs
- Ne permet pas de visualiser les délimitations géographiques
- Ne facilite pas l'exploration par zone/quartier
- Dépend de l'API Google Maps (coûts associés)

### Limitations

1. **Pas de délimitations visuelles** : impossible de voir où commence et finit un quartier
2. **Navigation par liste uniquement** : pas d'exploration géographique intuitive
3. **Coûts Google Maps** : l'API Google Maps est payante à l'usage
4. **Expérience utilisateur limitée** : difficile de découvrir de nouveaux quartiers

---

## Solution proposée

### Architecture de la page

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Carte Interactive                                │
├─────────────────────┬────────────────────────────────────────────────────────┤
│                     │                                                        │
│  SIDEBAR GAUCHE     │                   CARTE OPENSTREETMAP                 │
│  (350px fixe)       │                   (Plein écran restant)               │
│                     │                                                        │
│  ┌─────────────────┐│                                                        │
│  │ 🔍 Rechercher   ││         ┌────────────────────────────┐                │
│  │ un quartier...  ││         │                            │                │
│  └─────────────────┘│         │    Zone sélectionnée      │                │
│                     │         │    (délimitée en vert)     │                │
│  ┌─────────────────┐│         │                            │                │
│  │ Quartier actuel:││         │       📍 📍               │                │
│  │ Akébé Plaine   ││         │    📍    📍 📍            │                │
│  │ Province: Est. ││         │                            │                │
│  │ 23 logements   ││         └────────────────────────────┘                │
│  └─────────────────┘│                                                        │
│                     │                                                        │
│  ┌─────────────────┐│         ┌─┐  Contrôles de zoom                        │
│  │ Résultats:      ││         │+│                                           │
│  │                  ││         ├─┤                                           │
│  │ ┌─────────────┐ ││         │-│                                           │
│  │ │ 🏠 Studio   │ ││         └─┘                                           │
│  │ │ 250k FCFA   │ ││                                                        │
│  │ │ Akébé...    │ ││                                                        │
│  │ └─────────────┘ ││                                                        │
│  │                  ││                                                        │
│  │ ┌─────────────┐ ││                                                        │
│  │ │ 🏠 Appart.  │ ││                                                        │
│  │ │ 350k FCFA   │ ││                                                        │
│  │ └─────────────┘ ││                                                        │
│  │                  ││                                                        │
│  │ [Voir plus...]  ││                                                        │
│  └─────────────────┘│                                                        │
│                     │                                                        │
└─────────────────────┴────────────────────────────────────────────────────────┘
```

### Fonctionnalités principales

1. **Combobox de recherche de quartier**
   - Recherche avec autocomplétion
   - Affiche tous les 1,276 quartiers du Gabon
   - Tri alphabétique avec regroupement par province

2. **Carte OpenStreetMap interactive**
   - Zoom/Dézoom avec contrôles et scroll
   - Affichage des délimitations de quartiers (polygones)
   - Mise en surbrillance verte du quartier sélectionné
   - Marqueurs pour les logements disponibles

3. **Sidebar de résultats**
   - Affiche les logements du quartier sélectionné
   - Scroll vertical avec infinite scroll
   - Mini-cards de propriétés cliquables

4. **Synchronisation avec Algolia**
   - Filtrage automatique des résultats par quartier
   - Utilisation du contexte Algolia existant

---

## Design UX/UI

### Palette de couleurs

| Élément | Couleur | Usage |
|---------|---------|-------|
| Zone sélectionnée | `#22C55E` (vert) avec opacité 0.3 | Fill du polygone |
| Bordure de zone | `#15803D` (vert foncé) | Stroke du polygone |
| Marqueurs logements | `#146B67` (teal primaire) | Points sur la carte |
| Sidebar background | `#FFFFFF` / `#1F2937` (dark) | Fond de la sidebar |
| Hover sur carte | `#86EFAC` (vert clair) | Survol des zones |

### Interactions

```
┌─────────────────────────────────────────────────────────────────┐
│                    États de la carte                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ÉTAT INITIAL (aucun quartier sélectionné)                  │
│     - Carte centrée sur le Gabon (lat: 0.4162, lon: 9.4673)    │
│     - Zoom level: 7 (vue pays)                                  │
│     - Toutes les zones affichées en gris clair avec bordures   │
│     - Sidebar: "Sélectionnez un quartier pour voir les résultats" │
│                                                                 │
│  2. ÉTAT HOVER (survol d'une zone)                             │
│     - Zone survolée: bordure épaissie + couleur légère         │
│     - Tooltip avec nom du quartier                              │
│     - Curseur: pointer                                          │
│                                                                 │
│  3. ÉTAT SÉLECTIONNÉ (quartier choisi)                         │
│     - Zone: remplissage vert avec bordure verte foncée         │
│     - Carte: zoom automatique + centrage sur la zone           │
│     - Marqueurs: affichage des logements du quartier           │
│     - Sidebar: liste des logements + compteur                   │
│                                                                 │
│  4. ÉTAT CHARGEMENT                                             │
│     - Skeleton loaders dans la sidebar                          │
│     - Spinner sur la zone de carte                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Responsive Design

| Breakpoint | Comportement |
|------------|--------------|
| Desktop (≥1024px) | Sidebar fixe à gauche (350px) + carte plein écran |
| Tablet (768-1023px) | Sidebar collapsible (bouton toggle) |
| Mobile (<768px) | Vue carte plein écran + bottom sheet pour résultats |

---

## Architecture technique

### Stack technologique

| Technologie | Rôle |
|-------------|------|
| **Leaflet** | Bibliothèque de cartographie open-source |
| **react-leaflet** | Wrapper React pour Leaflet |
| **OpenStreetMap Tiles** | Fond de carte (gratuit) |
| **Overpass API** | Récupération des polygones de délimitation |
| **Algolia** | Recherche et filtrage des propriétés |
| **Tailwind CSS** | Styling des composants |

### Design Patterns appliqués

1. **Provider Pattern** : `MapProvider` pour gérer l'état global de la carte
2. **Mediator Pattern** : Coordination entre sélection quartier ↔ filtrage Algolia ↔ carte
3. **Factory Pattern** : Création des polygones et marqueurs selon le type de données
4. **Observer Pattern** : Écoute des changements de sélection pour mise à jour UI

### Flux de données

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FLUX DE DONNÉES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  gabon_osm   │    │   Overpass   │    │   Algolia    │              │
│  │    .json     │    │     API      │    │    Index     │              │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘              │
│         │                   │                   │                       │
│         ▼                   ▼                   │                       │
│  ┌──────────────────────────────────────┐      │                       │
│  │         useOSMLocations Hook          │      │                       │
│  │  (données structurées des quartiers)  │      │                       │
│  └──────────────────┬───────────────────┘      │                       │
│                     │                           │                       │
│                     ▼                           │                       │
│  ┌──────────────────────────────────────┐      │                       │
│  │         useQuarterPolygons Hook       │      │                       │
│  │  (polygones des zones sélectionnées)  │      │                       │
│  └──────────────────┬───────────────────┘      │                       │
│                     │                           │                       │
│                     ▼                           ▼                       │
│  ┌─────────────────────────────────────────────────────────────┐       │
│  │                     MapProvider                              │       │
│  │  - selectedQuarter: OSMLocation | null                       │       │
│  │  - polygonData: GeoJSON | null                               │       │
│  │  - zoom: number                                              │       │
│  │  - center: [lat, lon]                                        │       │
│  └──────────────────────────┬──────────────────────────────────┘       │
│                             │                                           │
│              ┌──────────────┼──────────────┐                           │
│              ▼              ▼              ▼                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │
│  │QuarterCombobox│  │  InteractiveMap │  │ResultsSidebar │               │
│  │  (sélection)  │  │   (Leaflet)   │  │   (Algolia)   │               │
│  └───────────────┘  └───────────────┘  └───────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Structure des données OSM

### Fichier source : `scripts/openstreetmap/gabon_osm.json`

Le fichier actuel contient **uniquement des points centraux** (`center.lat/center.lon`), pas de polygones.

```json
{
  "osm": { "type": "node", "id": 12345 },
  "name": "Akébé Plaine",
  "names": { "fr": "Akébé Plaine", "en": null, "local": null },
  "tags": { "place": "suburb" },
  "center": { "lat": 0.4123, "lon": 9.4567 }
}
```

### ⚠️ Défi majeur : Obtenir les polygones de délimitation

**Problème** : Le script `gabon_osm_export.mjs` utilise `out tags center` qui ne retourne que les centres.

**Solution** : Créer un nouveau script ou API pour récupérer les **géométries complètes** via Overpass.

```overpass
[out:json][timeout:300];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  nwr(area.ga)["place"="suburb"];
  nwr(area.ga)["place"="neighbourhood"];
  nwr(area.ga)["place"="quarter"];
);
out geom;
```

### Volume de données

| Catégorie | Nombre | Source |
|-----------|--------|--------|
| Provinces | 10 | `admin_boundaries["4"]` |
| Villes | 56 | `places.city/town` + `admin_boundaries["6"/"8"]` |
| Quartiers | 1,276 | `places.*` + `admin_boundaries["9"/"10"]` |

---

## Défis techniques et solutions

### Défi 1 : Polygones manquants dans `gabon_osm.json`

**Problème** : Le fichier actuel ne contient que les centres, pas les polygones.

**Solutions possibles** :

| Solution | Avantages | Inconvénients |
|----------|-----------|---------------|
| **A. API Overpass à la demande** | Données à jour, pas de stockage | Latence, dépendance réseau |
| **B. Pré-générer un fichier GeoJSON** | Performance, offline | Fichier volumineux (~10-50MB) |
| **C. Cercles approximatifs** | Simple, léger | Pas réaliste géographiquement |
| **D. Nominatim Polygon API** | Polygones précis | Rate limiting, latence |

**Recommandation** : **Solution B** (pré-génération) avec fallback sur **Solution C** (cercles).

### Défi 2 : Performance avec 1,276 quartiers

**Problème** : Afficher tous les polygones peut être lent.

**Solutions** :
- **Clustering par zoom level** : afficher provinces → villes → quartiers selon le zoom
- **Lazy loading** : charger les polygones uniquement pour la zone visible
- **Simplification géométrique** : réduire la précision des polygones pour le rendu global

### Défi 3 : Synchronisation Carte ↔ Algolia

**Problème** : Garder cohérents la sélection carte et les filtres Algolia.

**Solution** : Utiliser le `AlgoliaContext` existant et ajouter un `MapContext` :

```typescript
// Médiation entre carte et Algolia
const { setStreet } = useAlgoliaContext();
const { selectedQuarter, setSelectedQuarter } = useMapContext();

useEffect(() => {
  if (selectedQuarter) {
    setStreet(selectedQuarter.name);
  }
}, [selectedQuarter]);
```

---

## Plan d'implémentation

### Phase 1 : Préparation des données géographiques (2-3h)

1. [ ] Créer `scripts/openstreetmap/gabon_polygons_export.mjs`
   - Requête Overpass avec `out geom`
   - Génération d'un fichier GeoJSON
   
2. [ ] Créer `public/data/gabon-boundaries.geojson`
   - Stockage des polygones pré-calculés
   - Structure GeoJSON FeatureCollection

3. [ ] Créer `src/data/gabon-boundaries-loader.ts`
   - Chargement lazy du fichier GeoJSON
   - Cache en mémoire

### Phase 2 : Infrastructure carte (3-4h)

4. [ ] Installer les dépendances
   ```bash
   npm install leaflet react-leaflet @types/leaflet
   ```

5. [ ] Créer `src/providers/MapProvider.tsx`
   - Contexte pour l'état de la carte
   - Gestion de la sélection de quartier

6. [ ] Créer `src/hooks/useQuarterPolygons.ts`
   - Récupération des polygones
   - Cache et gestion d'erreurs

### Phase 3 : Composants de la carte (4-5h)

7. [ ] Créer `src/components/interactive-map/InteractiveMapPage.tsx`
   - Page principale layout
   - Orchestration des composants

8. [ ] Créer `src/components/interactive-map/LeafletMap.tsx`
   - Carte Leaflet avec tuiles OSM
   - Rendu des polygones
   - Gestion des interactions (click, hover)

9. [ ] Créer `src/components/interactive-map/QuarterPolygon.tsx`
   - Composant pour afficher un polygone
   - Styles selon état (normal, hover, selected)

10. [ ] Créer `src/components/interactive-map/PropertyMarkers.tsx`
    - Affichage des marqueurs de propriétés
    - Clustering si nécessaire

### Phase 4 : Sidebar et recherche (3-4h)

11. [ ] Créer `src/components/interactive-map/MapSidebar.tsx`
    - Layout de la sidebar
    - Section recherche + résultats

12. [ ] Créer `src/components/interactive-map/QuarterSearchCombobox.tsx`
    - Combobox avec tous les quartiers
    - Recherche avec debounce
    - Regroupement par province

13. [ ] Créer `src/components/interactive-map/MapResultsList.tsx`
    - Liste des propriétés filtrées
    - Infinite scroll
    - Mini-cards

14. [ ] Créer `src/components/interactive-map/MapPropertyCard.tsx`
    - Card compacte de propriété
    - Click → highlight sur carte

### Phase 5 : Intégration et routing (2h)

15. [ ] Créer `src/app/(public)/map/page.tsx`
    - Page Next.js pour la route `/map`
    - Wrapping avec providers

16. [ ] Ajouter navigation depuis `/search`
    - Bouton "Explorer la carte"
    - Préservation des filtres dans l'URL

### Phase 6 : Polish et responsive (2-3h)

17. [ ] Mobile view avec bottom sheet
18. [ ] Animations et transitions
19. [ ] Accessibilité (ARIA, keyboard nav)
20. [ ] Tests manuels sur différents devices

---

## Composants à créer

### Arborescence

```
src/
├── app/
│   └── (public)/
│       └── map/
│           └── page.tsx                    # Page principale
├── components/
│   └── interactive-map/                    # Nouveau dossier
│       ├── InteractiveMapPage.tsx          # Layout complet
│       ├── LeafletMap.tsx                  # Carte Leaflet
│       ├── QuarterPolygon.tsx              # Polygone individuel
│       ├── PropertyMarkers.tsx             # Marqueurs propriétés
│       ├── MapSidebar.tsx                  # Sidebar gauche
│       ├── QuarterSearchCombobox.tsx       # Combobox recherche
│       ├── MapResultsList.tsx              # Liste résultats
│       ├── MapPropertyCard.tsx             # Card propriété
│       ├── MapControls.tsx                 # Zoom + fullscreen
│       └── index.ts                        # Exports
├── providers/
│   └── MapProvider.tsx                     # Contexte carte
├── hooks/
│   └── useQuarterPolygons.ts               # Hook polygones
└── data/
    └── gabon-boundaries-loader.ts          # Chargeur GeoJSON
```

### Signatures des composants principaux

```typescript
// InteractiveMapPage.tsx
export default function InteractiveMapPage(): JSX.Element

// LeafletMap.tsx
interface LeafletMapProps {
  center?: [number, number];
  zoom?: number;
  onQuarterClick?: (quarter: OSMLocation) => void;
}
export default function LeafletMap(props: LeafletMapProps): JSX.Element

// QuarterSearchCombobox.tsx
interface QuarterSearchComboboxProps {
  value?: OSMLocation | null;
  onChange: (quarter: OSMLocation | null) => void;
  placeholder?: string;
}
export default function QuarterSearchCombobox(props: QuarterSearchComboboxProps): JSX.Element

// MapSidebar.tsx
interface MapSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}
export default function MapSidebar(props: MapSidebarProps): JSX.Element
```

---

## Intégration avec le système existant

### Contexte Algolia

La carte utilisera le `AlgoliaContext` existant pour les filtres :

```typescript
// Dans MapSidebar.tsx
const { street, setStreet, city, province } = useAlgoliaContext();
const { items } = useInfiniteHits();

// Synchronisation sélection → filtre Algolia
const handleQuarterSelect = (quarter: OSMLocation) => {
  setStreet(quarter.name);
  // La sidebar affichera automatiquement les résultats filtrés
};
```

### Hook useOSMLocations

Réutilisation du hook existant pour les données de quartiers :

```typescript
// Dans QuarterSearchCombobox.tsx
const { getAllQuarters, getCitiesByProvince } = useOSMLocations();
const quarters = getAllQuarters();
```

### URLs et navigation

```typescript
// Depuis /search
<Link href="/map">
  <Button>
    <MapIcon className="w-4 h-4 mr-2" />
    Explorer la carte
  </Button>
</Link>

// Avec préservation des filtres
const searchParams = new URLSearchParams();
if (street) searchParams.set('street', street);
if (city) searchParams.set('city', city);
if (province) searchParams.set('province', province);
<Link href={`/map?${searchParams.toString()}`}>
```

---

## Tests et validation

### Scénarios de test fonctionnels

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 1 | Chargement initial | Carte centrée sur Gabon, zoom 7, sidebar vide |
| 2 | Recherche "Akébé" dans combobox | Suggestions filtrées affichées |
| 3 | Sélection d'un quartier | Zoom sur zone + highlight vert + résultats Algolia |
| 4 | Click sur polygone carte | Sélection comme via combobox |
| 5 | Hover sur polygone | Highlight léger + tooltip nom |
| 6 | Click sur propriété sidebar | Highlight du marqueur sur carte |
| 7 | Zoom/dézoom | Chargement adaptatif des polygones |
| 8 | Mode mobile | Bottom sheet fonctionnel |

### Tests de performance

- [ ] Temps de chargement initial < 3s
- [ ] Rendu de 100 polygones < 500ms
- [ ] Recherche combobox < 100ms
- [ ] Transition zoom fluide (60fps)

### Critères d'acceptation

- [ ] Tous les 1,276 quartiers sont sélectionnables
- [ ] Les délimitations correspondent aux données OSM
- [ ] Les résultats Algolia sont synchronisés avec la sélection carte
- [ ] L'interface est responsive (desktop/tablet/mobile)
- [ ] Pas de dépendance à Google Maps

---

## Annexes

### A. Exemple de structure GeoJSON pour les polygones

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Akébé Plaine",
        "osmId": "node/12345",
        "placeType": "suburb",
        "province": "Estuaire",
        "city": "Libreville"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [9.456, 0.412],
            [9.458, 0.413],
            [9.459, 0.410],
            [9.456, 0.412]
          ]
        ]
      }
    }
  ]
}
```

### B. Configuration Leaflet recommandée

```typescript
const mapConfig = {
  center: [0.4162, 9.4673] as [number, number], // Centre du Gabon
  zoom: 7,
  minZoom: 5,
  maxZoom: 18,
  tileLayer: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors'
  },
  polygonStyles: {
    default: { color: '#6B7280', weight: 1, fillOpacity: 0.1 },
    hover: { color: '#86EFAC', weight: 2, fillOpacity: 0.2 },
    selected: { color: '#15803D', weight: 3, fillOpacity: 0.3, fillColor: '#22C55E' }
  }
};
```

### C. Dépendances npm requises

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.8"
  }
}
```

### D. Références

- [Leaflet Documentation](https://leafletjs.com/)
- [react-leaflet](https://react-leaflet.js.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [GeoJSON Specification](https://geojson.org/)
- Documentation existante :
  - `documentation/localisation/README.md` - Import des données OSM
  - `documentation/form-ajout-logement/location.md` - Combobox de localisation
  - **`documentation/carte/polygons-export.md`** - Script d'export des polygones OSM