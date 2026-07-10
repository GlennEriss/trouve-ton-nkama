# Stratégie de Cohabitation des Composants de Carte

## Décision architecturale importante

> **On NE SUPPRIME PAS** le composant de carte Google Maps existant (`GoogleMapViewer.tsx`).
> On **crée un nouveau composant** OpenStreetMap et on le **remplace uniquement** dans la page `/search`.
> Le composant Google Maps sera **réutilisé ailleurs** dans l'application.

---

## Composants existants (à CONSERVER)

Ces composants **ne doivent pas être supprimés** car ils seront réutilisés ailleurs :

| Composant | Chemin | Usage futur |
|-----------|--------|-------------|
| `GoogleMapViewer.tsx` | `src/components/search/` | Réutilisé sur d'autres pages |
| `PropertyMarker.tsx` | `src/components/search/` | Marqueurs Google Maps |
| `PropertyDetailsPanel.tsx` | `src/components/search/` | Panel détails propriété |
| `MapViewerModal.tsx` | `src/components/search/` | Modal carte Google |
| `GoogleMapViewerHeader.tsx` | `src/components/search/` | Header de la carte |
| `googleMapsSingleton` | `src/singleton/` | Instance Google Maps |

### Hooks Google Maps (à conserver)

```
src/hooks/google-map/
├── useGoogleMapInstance.ts
├── useLocationGoogle.ts
└── ...
```

---

## Nouveaux composants (à CRÉER)

Nouveaux composants pour la carte interactive OSM :

| Composant | Chemin | Description |
|-----------|--------|-------------|
| `InteractiveMapPage.tsx` | `src/components/interactive-map/` | Layout page complète |
| `LeafletMap.tsx` | `src/components/interactive-map/` | Carte Leaflet/OSM |
| `QuarterPolygon.tsx` | `src/components/interactive-map/` | Polygone de quartier |
| `OSMPropertyMarkers.tsx` | `src/components/interactive-map/` | Marqueurs Leaflet |
| `MapSidebar.tsx` | `src/components/interactive-map/` | Sidebar avec résultats |
| `QuarterSearchCombobox.tsx` | `src/components/interactive-map/` | Recherche quartier |
| `MapResultsList.tsx` | `src/components/interactive-map/` | Liste propriétés |
| `MapPropertyCard.tsx` | `src/components/interactive-map/` | Card propriété compacte |
| `MapControls.tsx` | `src/components/interactive-map/` | Contrôles zoom |

---

## Schéma de migration

### AVANT (état actuel)

```
Page /search
├── SearchDesktopPage.tsx
│   └── [Pas de bouton carte directement visible]
│
└── SearchMobilePage.tsx
    └── Bouton "Carte"
        └── GoogleMapViewer (modal)
            └── PropertyMarker[]
            └── PropertyDetailsPanel
```

### APRÈS (nouvelle architecture)

```
Page /search
├── SearchDesktopPage.tsx
│   └── Bouton "Explorer la carte" → navigate('/map')
│
└── SearchMobilePage.tsx
    └── Bouton "Explorer la carte" → navigate('/map')

Page /map (NOUVELLE)
└── InteractiveMapPage.tsx
    ├── MapSidebar
    │   ├── QuarterSearchCombobox (recherche quartier)
    │   └── MapResultsList (résultats Algolia)
    └── LeafletMap
        ├── QuarterPolygon[] (délimitations)
        └── OSMPropertyMarkers (logements)

Autres pages (INCHANGÉES)
└── [Page détail / Autre]
    └── GoogleMapViewer (composant CONSERVÉ)
        └── PropertyMarker[]
```

---

## Résumé des actions par fichier

### Fichiers à NE PAS MODIFIER

| Fichier | Raison |
|---------|--------|
| `src/components/search/GoogleMapViewer.tsx` | Sera utilisé ailleurs |
| `src/components/search/PropertyMarker.tsx` | Dépendance de GoogleMapViewer |
| `src/components/search/PropertyDetailsPanel.tsx` | Dépendance de GoogleMapViewer |
| `src/components/search/MapViewerModal.tsx` | Conservé pour usage futur |
| `src/components/search/GoogleMapViewerHeader.tsx` | Dépendance de GoogleMapViewer |
| `src/singleton/googleMapsSingleton.ts` | Singleton Google Maps |
| `src/hooks/google-map/*` | Hooks Google Maps |

### Fichiers à MODIFIER

| Fichier | Modification |
|---------|--------------|
| `src/components/search/SearchMobilePage.tsx` | Changer le bouton "Carte" pour rediriger vers `/map` |
| `src/components/search/SearchDesktopPage.tsx` | Ajouter un bouton "Explorer la carte" |
| `src/components/search/FilterSearchDesktopPageSection.tsx` | (optionnel) Ajouter lien vers carte |

### Fichiers à CRÉER

| Fichier | Description |
|---------|-------------|
| `src/app/(public)/map/page.tsx` | Nouvelle route `/map` |
| `src/components/interactive-map/InteractiveMapPage.tsx` | Page layout |
| `src/components/interactive-map/LeafletMap.tsx` | Carte Leaflet |
| `src/components/interactive-map/QuarterPolygon.tsx` | Polygone quartier |
| `src/components/interactive-map/OSMPropertyMarkers.tsx` | Marqueurs Leaflet |
| `src/components/interactive-map/MapSidebar.tsx` | Sidebar résultats |
| `src/components/interactive-map/QuarterSearchCombobox.tsx` | Combobox recherche |
| `src/components/interactive-map/MapResultsList.tsx` | Liste propriétés |
| `src/components/interactive-map/MapPropertyCard.tsx` | Mini-card propriété |
| `src/components/interactive-map/MapControls.tsx` | Contrôles zoom |
| `src/components/interactive-map/index.ts` | Exports |
| `src/providers/MapProvider.tsx` | Contexte carte |
| `src/hooks/useQuarterPolygons.ts` | Hook polygones |
| `src/data/gabon-boundaries-loader.ts` | Chargeur GeoJSON |

---

## Code de modification pour SearchMobilePage

### Avant

```tsx
<button
    type='button'
    onClick={() => setShowMap(true)}
    className='flex items-center gap-2 px-4 py-2 bg-[#146B67] text-white rounded-full text-sm font-medium hover:bg-[#1FA89B] transition-colors'
>
    <MapPin className="w-4 h-4" />
    Carte
</button>
```

### Après

```tsx
import Link from 'next/link';

<Link
    href="/map"
    className='flex items-center gap-2 px-4 py-2 bg-[#146B67] text-white rounded-full text-sm font-medium hover:bg-[#1FA89B] transition-colors'
>
    <MapPin className="w-4 h-4" />
    Explorer la carte
</Link>
```

---

## Préservation des filtres dans l'URL

Lors de la redirection vers `/map`, on préserve les filtres actifs :

```tsx
const { province, city, street } = useAlgoliaContext();

const buildMapUrl = () => {
  const params = new URLSearchParams();
  if (province) params.set('province', province);
  if (city) params.set('city', city);
  if (street) params.set('street', street);
  const query = params.toString();
  return query ? `/map?${query}` : '/map';
};

<Link href={buildMapUrl()}>
    Explorer la carte
</Link>
```

---

## Arborescence finale

```
src/
├── components/
│   ├── search/                        # INCHANGÉ
│   │   ├── GoogleMapViewer.tsx        # ✅ Conservé
│   │   ├── PropertyMarker.tsx         # ✅ Conservé
│   │   ├── PropertyDetailsPanel.tsx   # ✅ Conservé
│   │   ├── MapViewerModal.tsx         # ✅ Conservé
│   │   ├── GoogleMapViewerHeader.tsx  # ✅ Conservé
│   │   ├── SearchMobilePage.tsx       # ✏️ Modifier bouton
│   │   └── SearchDesktopPage.tsx      # ✏️ Ajouter bouton
│   │
│   └── interactive-map/               # NOUVEAU DOSSIER
│       ├── InteractiveMapPage.tsx     # ➕ Nouveau
│       ├── LeafletMap.tsx             # ➕ Nouveau
│       ├── QuarterPolygon.tsx         # ➕ Nouveau
│       ├── OSMPropertyMarkers.tsx     # ➕ Nouveau
│       ├── MapSidebar.tsx             # ➕ Nouveau
│       ├── QuarterSearchCombobox.tsx  # ➕ Nouveau
│       ├── MapResultsList.tsx         # ➕ Nouveau
│       ├── MapPropertyCard.tsx        # ➕ Nouveau
│       ├── MapControls.tsx            # ➕ Nouveau
│       └── index.ts                   # ➕ Nouveau
│
├── app/
│   └── (public)/
│       └── map/
│           └── page.tsx               # ➕ Nouvelle route
│
├── providers/
│   └── MapProvider.tsx                # ➕ Nouveau
│
├── hooks/
│   ├── google-map/                    # ✅ Conservé
│   └── useQuarterPolygons.ts          # ➕ Nouveau
│
└── data/
    └── gabon-boundaries-loader.ts     # ➕ Nouveau
```
