# Sélection de Localisation - Formulaire d'ajout de propriété

## Table des matières

1. [Contexte et problème](#contexte-et-problème)
2. [Solution proposée](#solution-proposée)
3. [Architecture existante](#architecture-existante)
4. [Structure des données OSM](#structure-des-données-osm)
5. [Spécifications techniques](#spécifications-techniques)
6. [Plan d'implémentation](#plan-dimplémentation)
7. [Composants à créer/modifier](#composants-à-créermodifier)
8. [Tests et validation](#tests-et-validation)

---

## Contexte et problème

### Situation actuelle

Le formulaire d'ajout de propriété (`/property/add/[typeProperty]`) utilise actuellement un système de localisation basé sur **Photon Komoot** pour la recherche de quartiers au Gabon.

**Fichiers concernés :**
- `src/components/location/LocationPicker.tsx` - Composant principal de localisation
- `src/hooks/usePhotonSearch.ts` - Hook de recherche Photon
- `src/lib/photonUtils.ts` - Utilitaires Photon

### Problèmes identifiés

1. **Couverture insuffisante** : Photon Komoot ne référence pas beaucoup de zones du Gabon, notamment :
   - Quartiers populaires de Libreville
   - Zones périurbaines
   - Nouvelles subdivisions

2. **Dépendance externe** : L'API Photon peut être lente ou indisponible

3. **Expérience utilisateur dégradée** : Les utilisateurs ne trouvent pas leur quartier et doivent saisir manuellement des informations potentiellement incorrectes

### Pages impactées

Le composant `LocationPicker` est utilisé à l'**étape 3** de tous les formulaires d'ajout :

| Route | Type de propriété | Composant formulaire |
|-------|-------------------|---------------------|
| `/property/add/home` | Maison | `FormHome` → `HomeFormFactory` |
| `/property/add/studio` | Studio | `FormStudio` → `StudioFormFactory` |
| `/property/add/apartment` | Appartement | `FormApartment` → `ApartmentFormFactory` |
| `/property/add/villa` | Villa | `FormVilla` → `VillaFormFactory` |
| `/property/add/land` | Terrain | `FormLand` → `LandFormFactory` |
| `/property/add/building` | Immeuble | `FormBuilding` → `BuildingFormFactory` |
| `/property/add/room` | Chambre | `FormRoom` → `RoomFormFactory` |
| `/property/add/shop` | Boutique | `FormShop` → `ShopFormFactory` |
| `/property/add/desk` | Bureau | `FormDesk` → `DeskFormFactory` |
| `/property/add/kiosk` | Kiosque | `FormKiosk` → `KioskFormFactory` |

**Tous ces formulaires héritent de la même logique via `PropertyFormBuilder` qui définit le composant `LocationPicker` à l'étape 3.**

---

## Solution proposée

### Vue d'ensemble

Implémenter un **système à onglets (Tabs)** permettant de choisir entre deux méthodes de localisation :

1. **Onglet "Sélection locale"** (par défaut) : Combobox basés sur les données OSM locales (`gabon_osm.json`)
2. **Onglet "Recherche intelligente"** : Système Photon Komoot existant

### Avantages

- ✅ **Couverture complète** : Toutes les données OSM du Gabon disponibles localement
- ✅ **Performance** : Pas de requête réseau pour la sélection locale
- ✅ **Fallback** : Photon reste disponible pour les cas non couverts
- ✅ **Cohérence des données** : Province/Ville/Quartier toujours cohérents entre eux
- ✅ **Rétrocompatibilité** : Le système existant reste fonctionnel

### Maquette UX

```
┌─────────────────────────────────────────────────────────────────┐
│  📍 Localisation du bien                                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌────────────────────────┐          │
│  │ 🗺️ Sélection locale  │  │ 🔍 Recherche intelligente│          │
│  └──────────────────────┘  └────────────────────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Onglet "Sélection locale" (actif) ──────────────────────┐  │
│  │                                                           │  │
│  │  Province *          [ Estuaire            ▼ ]           │  │
│  │                      🔍 Rechercher...                     │  │
│  │                                                           │  │
│  │  Ville *             [ Libreville          ▼ ]           │  │
│  │                      🔍 Rechercher...                     │  │
│  │                                                           │  │
│  │  Quartier *          [ Akébé Plaine        ▼ ]           │  │
│  │                      🔍 Rechercher...                     │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  [Carte OpenStreetMap avec marqueur]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture existante

### Flux du formulaire

```
src/app/(protected)/property/add/(stepper)/[type]/page.tsx
    └── src/components/[type]/Form[Type].tsx
        └── src/components/stepper/FormProperty.tsx
            └── src/components/stepper/Step3.tsx
                └── src/builders/property-form/property.form.builder.tsx
                    └── src/components/location/LocationPicker.tsx  ← COMPOSANT À MODIFIER
```

### Fichiers clés

| Fichier | Rôle |
|---------|------|
| `src/builders/property-form/property.form.builder.tsx` | Définit les éléments du formulaire, inclut `LocationPicker` à l'étape 3 |
| `src/components/location/LocationPicker.tsx` | Composant actuel de sélection de localisation (Photon) |
| `src/components/location/index.ts` | Export du composant LocationPicker |
| `src/hooks/usePhotonSearch.ts` | Hook de recherche Photon Komoot |
| `src/hooks/useLocationHandlers.ts` | Handlers pour la gestion de la localisation |
| `src/hooks/use-location-sync.ts` | Synchronisation avec Firebase |

### Champs du formulaire concernés

```typescript
// Champs d'adresse dans le formulaire (react-hook-form)
address: {
  district: string    // Quartier
  city: string        // Ville  
  province: string    // Province
}

// Champs de coordonnées
streetLon: number
streetLat: number
cityLon: number
cityLat: number
provinceLon: number
provinceLat: number
```

---

## Structure des données OSM

### Fichier source

`scripts/openstreetmap/gabon_osm.json` (27 701 lignes)

### ⚠️ Important : Différence entre Firestore et Combobox

**Pour l'import Firestore** (voir `documentation/localisation/README.md`) :
- Utilise une whitelist de 9 provinces canoniques
- Entrées hors whitelist (ex: "Litoral") sont importées dans `cities`
- Objectif : Respecter la structure administrative officielle (9 provinces)

**Pour les Combobox** (ce composant) :
- **Utilise TOUTES les données disponibles** sans filtrage
- Objectif : Permettre à l'utilisateur de sélectionner n'importe quelle zone du Gabon recensée dans OSM
- Couverture maximale : **1276 quartiers/villages/localités** (vs ~181 pour Firestore)

### Hiérarchie administrative

```
admin_boundaries:
├── "4": Provinces (10 entrées) ⚠️ TOUTES incluses dans combobox
│   Ex: Estuaire, Haut-Ogooué, Ogooué-Ivindo, Woleu-Ntem, Litoral...
│
├── "6": Départements (10 entrées)
│   Ex: Komo, Komo-Mondah, Libreville, Noya...
│
├── "8": Communes (2 entrées)
│   Ex: Cogo, Commune de Kango
│
├── "9": Arrondissements (3 entrées)
│   Ex: 1er Arrondissement de la Commune de Libreville...
│
└── "10": Quartiers admin (1 entrée)
```

### Places (lieux habités)

```
places:
├── city: 20 villes
│   Ex: Libreville, Franceville, Bitam, Oyem, Lambaréné...
│
├── town: 24 towns
│   Ex: Ntoum, Fougamou, Ndendé, Medouneu, Cocobeach
│
├── suburb: 83 suburbs (quartiers urbains)
│   Ex: Akébé Plaine, Akébé-Ville, Akébé-Kinguélé, Alibandeng...
│
├── neighbourhood: 27 neighbourhoods
│   Ex: Toulon, Ambilambani, Michel Marine, Grand Village...
│
├── quarter: 27 quarters
│   Ex: PK5, Semengué, Owendo Port, Alénakirie...
│
├── village: 794 villages ⚠️ Tous inclus dans combobox
│   Ex: Edoum, Alembé, Bibassé, Lalara...
│
├── hamlet: 297 hameaux ⚠️ Tous inclus dans combobox
│   Ex: Bougou, Boumaga, Mbiribi...
│
└── locality: 44 localités ⚠️ Tous inclus dans combobox
    Ex: Pointe Chapuis, Trois Rivières, Oklo, Rabi Kounga, 
        Carrefour Soduco, Carrefour SNI, Derrière la pédiatrie...
```

### Volume total pour les combobox

| Catégorie | Nombre | Source |
|-----------|--------|--------|
| **Provinces** | **10** | `admin_boundaries["4"]` (toutes, incluant "Litoral") |
| **Villes** | **56** | `places.city` (20) + `places.town` (24) + `admin_boundaries["6"]` (10) + `admin_boundaries["8"]` (2) |
| **Quartiers** | **1,276** | `places.suburb` (83) + `places.neighbourhood` (27) + `places.quarter` (27) + `places.village` (794) + `places.hamlet` (297) + `places.locality` (44) + `admin_boundaries["9"]` (3) + `admin_boundaries["10"]` (1) |

**Total : 1,342 entrées géographiques disponibles dans les combobox**

### Structure d'une entrée

```json
{
  "osm": {
    "type": "node",
    "id": 27565068
  },
  "name": "Libreville",
  "names": {
    "fr": "Libreville",
    "en": "Libreville",
    "local": null
  },
  "tags": {
    "name": "Libreville",
    "place": "city",
    ...
  },
  "center": {
    "lat": 0.390098,
    "lon": 9.4467227
  }
}
```

---

## Spécifications techniques

### 1. Hook de chargement des données OSM

**Fichier à créer : `src/hooks/useOSMLocations.ts`**

⚠️ **Important** : Ce hook doit charger **TOUTES** les données du fichier `gabon_osm.json`, sans filtrage par whitelist (contrairement à l'import Firestore).

```typescript
interface OSMLocation {
  name: string
  lat: number
  lon: number
  type: 'province' | 'city' | 'quarter'
  osmId?: number
  osmType?: 'node' | 'way' | 'relation'
  source?: 'places' | 'admin_boundaries'
  originalType?: string  // 'city', 'town', 'suburb', 'village', etc.
}

interface OSMLocationsData {
  provinces: OSMLocation[]  // Toutes les 10 entrées admin_level=4
  cities: Map<string, OSMLocation[]>  // province -> cities (toutes les 56 villes)
  quarters: Map<string, OSMLocation[]>  // city -> quarters (toutes les 1276 entrées)
}

// Retourne les données structurées pour les combobox
function useOSMLocations(): {
  data: OSMLocationsData | null
  isLoading: boolean
  error: Error | null
  
  // Helpers
  getCitiesByProvince: (province: string) => OSMLocation[]
  getQuartersByCity: (city: string) => OSMLocation[]
  getAllProvinces: () => OSMLocation[]  // Toutes les provinces triées
  getAllCities: () => OSMLocation[]     // Toutes les villes (si pas de province sélectionnée)
  getAllQuarters: () => OSMLocation[]   // Tous les quartiers (si pas de ville sélectionnée)
}
```

### 2. Composant de sélection locale

**Fichier à créer : `src/components/location/LocalLocationPicker.tsx`**

Utilise 3 Combobox shadcn/ui avec **toutes les données disponibles** :

1. **Province Combobox**
   - Source : `admin_boundaries["4"]` → **10 provinces** (toutes, incluant "Litoral")
   - Tri alphabétique
   - Recherche intégrée
   - Au changement → reset ville et quartier

2. **Ville Combobox**
   - Source : **Toutes les 56 villes** :
     - `places.city` (20) + `places.town` (24)
     - `admin_boundaries["6"]` (10) + `admin_boundaries["8"]` (2)
   - Filtrées par province sélectionnée (si province sélectionnée)
   - Si aucune province → afficher toutes les villes
   - Dépend de la province sélectionnée
   - Au changement → reset quartier

3. **Quartier Combobox**
   - Source : **Toutes les 1,276 entrées** :
     - Urbains : `places.suburb` (83) + `places.neighbourhood` (27) + `places.quarter` (27)
     - Ruraux : `places.village` (794) + `places.hamlet` (297) + `places.locality` (44)
     - Admin : `admin_boundaries["9"]` (3) + `admin_boundaries["10"]` (1)
   - Filtrés par ville sélectionnée (si ville sélectionnée)
   - Si aucune ville → afficher tous les quartiers
   - Dépend de la ville sélectionnée

**Filtrage progressif** :
- Si province sélectionnée → villes limitées à cette province
- Si ville sélectionnée → quartiers limités à cette ville
- Sinon → afficher toutes les options disponibles (recherche globale)

### 3. Mapping Province ↔ Ville ↔ Quartier

Le fichier `gabon_osm.json` ne contient pas de relation explicite province→ville→quartier. Il faudra :

**Stratégie recommandée : Calcul géographique par distance (Haversine)**

**Pour rattacher Ville → Province :**
- Calculer la distance entre le `center` de chaque ville et le `center` de chaque province
- Associer la ville à la province la plus proche (distance minimale)
- Seuil maximum : 100 km (au-delà, laisser sans rattachement)

**Pour rattacher Quartier → Ville :**
- Calculer la distance entre le `center` de chaque quartier et le `center` de chaque ville
- Associer le quartier à la ville la plus proche (distance minimale)
- Seuils différents selon le type :
  - **Quartiers urbains** (`suburb`, `neighbourhood`, `quarter`) : 35 km
  - **Quartiers ruraux** (`village`, `hamlet`, `locality`) : 80 km
  - **Admin** (`admin_boundaries["9"]`, `admin_boundaries["10"]`) : 50 km
- Si aucune ville trouvée dans le seuil → laisser sans rattachement

**Implémentation :**
- Créer `src/lib/geo-haversine.ts` avec fonction `calculateDistance` et `findNearestLocation`
- Pré-calculer les associations au chargement des données (dans `useOSMLocations`)
- Stocker les associations dans des Maps pour lookup rapide

**Fallback :**
- Si pas de rattachement → permettre la sélection manuelle (combobox affiche toutes les options)
- L'utilisateur peut toujours sélectionner une province/ville/quartier même sans relation explicite

### 4. Composant LocationPicker refactorisé

**Fichier à modifier : `src/components/location/LocationPicker.tsx`**

```tsx
export default function LocationPicker() {
  const [activeTab, setActiveTab] = useState<'local' | 'smart'>('local')
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="local">
            <Database className="w-4 h-4 mr-2" />
            Sélection locale
          </TabsTrigger>
          <TabsTrigger value="smart">
            <Search className="w-4 h-4 mr-2" />
            Recherche intelligente
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="local">
          <LocalLocationPicker />
        </TabsContent>
        
        <TabsContent value="smart">
          <SmartLocationPicker />  {/* Composant existant refactorisé */}
        </TabsContent>
      </Tabs>
      
      {/* Carte commune aux deux modes */}
      <LocationMap coordinates={mapCoordinates} />
    </div>
  )
}
```

### 5. Composants UI à utiliser

Tous les composants shadcn/ui nécessaires sont **déjà installés** :

| Composant | Fichier | Usage |
|-----------|---------|-------|
| Tabs | `src/components/ui/tabs.tsx` | Basculer entre les modes |
| Command | `src/components/ui/command.tsx` | Base du Combobox |
| Popover | `src/components/ui/popover.tsx` | Container du Combobox |
| Button | `src/components/ui/button.tsx` | Trigger du Combobox |

---

## Plan d'implémentation

### Phase 1 : Préparation des données (1-2h)

1. [ ] Créer `src/data/gabon-osm-locations.ts`
   - Parser le JSON OSM
   - Structurer les données pour lookup rapide
   - Créer le mapping province → villes → quartiers

2. [ ] Créer `src/hooks/useOSMLocations.ts`
   - Charger les données
   - Exposer les méthodes de filtrage

### Phase 2 : Composants de sélection locale (2-3h)

3. [ ] Créer `src/components/location/combobox/ProvinceCombobox.tsx`
4. [ ] Créer `src/components/location/combobox/CityCombobox.tsx`
5. [ ] Créer `src/components/location/combobox/QuarterCombobox.tsx`
6. [ ] Créer `src/components/location/LocalLocationPicker.tsx`
   - Orchestrer les 3 combobox
   - Gérer les dépendances (cascading)
   - Mettre à jour les coordonnées dans le formulaire

### Phase 3 : Refactorisation LocationPicker (1-2h)

7. [ ] Extraire le code Photon existant dans `SmartLocationPicker.tsx`
8. [ ] Refactoriser `LocationPicker.tsx` avec les Tabs
9. [ ] Factoriser la carte pour qu'elle soit commune aux deux modes

### Phase 4 : Intégration et tests (1-2h)

10. [ ] Tester sur tous les types de propriété
11. [ ] Vérifier la persistance des données dans le formulaire
12. [ ] Valider les coordonnées générées
13. [ ] S'assurer que le formulaire se soumet correctement

---

## Composants à créer/modifier

### Nouveaux fichiers

```
src/
├── data/
│   └── gabon-osm-locations.ts          # Données structurées
├── hooks/
│   └── useOSMLocations.ts              # Hook de chargement
└── components/
    └── location/
        ├── combobox/
        │   ├── ProvinceCombobox.tsx    # Combobox province
        │   ├── CityCombobox.tsx        # Combobox ville
        │   └── QuarterCombobox.tsx     # Combobox quartier
        ├── LocalLocationPicker.tsx     # Nouveau composant local
        └── SmartLocationPicker.tsx     # Composant Photon extrait
```

### Fichiers à modifier

```
src/components/location/
├── LocationPicker.tsx      # Ajouter les Tabs
└── index.ts                # Mettre à jour les exports
```

---

## Tests et validation

### Scénarios de test

1. **Sélection locale complète**
   - Sélectionner Province → Ville → Quartier
   - Vérifier que les coordonnées sont remplies
   - Soumettre le formulaire

2. **Cascade des combobox**
   - Changer de province → villes et quartiers réinitialisés
   - Changer de ville → quartier réinitialisé

3. **Recherche dans les combobox**
   - Taper "Akébé" dans quartier → filtrer les résultats
   - Taper "Libre" dans ville → afficher Libreville

4. **Basculement entre onglets**
   - Remplir en mode local → basculer en smart → les données persistent
   - Remplir en mode smart → basculer en local → comportement cohérent

5. **Compatibilité tous types de propriété**
   - Tester sur `/property/add/home`
   - Tester sur `/property/add/studio`
   - Tester sur `/property/add/land`

### Validation des données

- [ ] Toutes les provinces du fichier OSM sont disponibles
- [ ] Les villes sont correctement associées aux provinces
- [ ] Les quartiers sont correctement associés aux villes
- [ ] Les coordonnées (lat/lon) sont correctes

---

## Annexes

### A. Statistiques des données OSM pour Combobox

| Catégorie | Nombre | Source | Usage dans Combobox |
|-----------|--------|--------|---------------------|
| **Provinces** | **10** | `admin_boundaries["4"]` | ✅ Combobox Province (toutes) |
| **Villes** | **56** | `places.city` (20) + `places.town` (24) + `admin_boundaries["6"]` (10) + `admin_boundaries["8"]` (2) | ✅ Combobox Ville (toutes) |
| **Quartiers urbains** | **137** | `places.suburb` (83) + `places.neighbourhood` (27) + `places.quarter` (27) | ✅ Combobox Quartier |
| **Quartiers ruraux** | **1,135** | `places.village` (794) + `places.hamlet` (297) + `places.locality` (44) | ✅ Combobox Quartier (tous) |
| **Quartiers admin** | **4** | `admin_boundaries["9"]` (3) + `admin_boundaries["10"]` (1) | ✅ Combobox Quartier |
| **TOTAL Quartiers** | **1,276** | | ✅ Combobox Quartier (toutes les entrées) |

**⚠️ Note importante** :
- Les données Firestore (voir `documentation/localisation/README.md`) utilisent une whitelist de 9 provinces et filtrent certaines entrées
- Les combobox utilisent **TOUTES** les 1,342 entrées disponibles dans `gabon_osm.json`
- Cela garantit que **aucune zone du Gabon recensée dans OSM n'est exclue** de la sélection

### B. Dépendances npm

Aucune nouvelle dépendance requise. Tous les composants shadcn/ui sont déjà installés :
- `@radix-ui/react-tabs`
- `cmdk`
- `@radix-ui/react-popover`

### C. Références

- [shadcn/ui Combobox](https://ui.shadcn.com/docs/components/combobox)
- [shadcn/ui Tabs](https://ui.shadcn.com/docs/components/tabs)
- [OpenStreetMap Gabon](https://www.openstreetmap.org/#map=6/0.37/12.76)

