# 🗺️ Documentation - Carte Interactive du Gabon

## Vue d'ensemble

Cette feature permet d'explorer les logements disponibles au Gabon via une **carte interactive OpenStreetMap** avec délimitation des quartiers.

---

## 📁 Fichiers de documentation

| Fichier | Description |
|---------|-------------|
| [**carte.md**](./carte.md) | Documentation principale de la feature |
| [**strategie-composants.md**](./strategie-composants.md) | Stratégie de cohabitation Google Maps / OpenStreetMap |
| [**polygons-export.md**](./polygons-export.md) | Script d'export des polygones OSM |
| [**cache-strategy.md**](./cache-strategy.md) | Stratégie de cache (client + serveur) |
| [**ui-simplifiee.md**](./ui-simplifiee.md) | Spécifications de l'interface simplifiée |

---

## 🎯 Résumé des décisions clés

### Architecture

| Décision | Choix |
|----------|-------|
| Carte principale | **OpenStreetMap + Leaflet** (pas Google Maps) |
| Google Maps existant | **Conservé** pour réutilisation ailleurs |
| Route | `/map` (nouvelle page dédiée) |
| Depuis `/search` | Bouton "Explorer la carte" → redirection |

### Interface utilisateur

| Élément | Décision |
|---------|----------|
| Barre de recherche | ❌ **Supprimée** (inutile) |
| Combobox Province/Ville | ❌ **Supprimés** |
| **Combobox Quartier unique** | ✅ Avec recherche intégrée |
| Tri des quartiers | ✅ Alphabétique, groupé par province |

### Performance (Cache)

| Niveau | TTL | Technologie |
|--------|-----|-------------|
| Client | 5 min | React useRef/Map |
| Serveur (Vercel) | 5 min | Cache-Control / unstable_cache |
| Distribué (optionnel) | 5 min | Upstash Redis |

### Données OSM

| Source | Contenu |
|--------|---------|
| `gabon_osm.json` | Points centraux (existant) |
| `gabon_polygons.geojson` | Polygones de délimitation (à générer) |

---

## 🚀 Plan d'implémentation rapide

### Phase 1 : Données (2-3h)
1. Créer `scripts/openstreetmap/gabon_polygons_export.mjs`
2. Générer `gabon_polygons.geojson`

### Phase 2 : Infrastructure (2-3h)
3. Installer `leaflet` + `react-leaflet`
4. Créer `MapProvider.tsx` + `MapCacheProvider.tsx`

### Phase 3 : Composants (4-5h)
5. Créer `src/components/interactive-map/`
   - `LeafletMap.tsx`
   - `QuarterSearchCombobox.tsx`
   - `MapSidebar.tsx`
   - `MapResultsList.tsx`

### Phase 4 : Intégration (2h)
6. Créer `src/app/(public)/map/page.tsx`
7. Modifier bouton dans `/search` pour rediriger vers `/map`

---

## 📊 Volumes de données

| Catégorie | Nombre |
|-----------|--------|
| Provinces | 10 |
| Villes | 56 |
| **Quartiers** | **1,276** |
| **Total** | **1,342** |

---

## 🔗 Liens utiles

- [Leaflet Documentation](https://leafletjs.com/)
- [react-leaflet](https://react-leaflet.js.org/)
- [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [Documentation localisation](../localisation/README.md)
- [Documentation formulaire](../form-ajout-logement/location.md)
