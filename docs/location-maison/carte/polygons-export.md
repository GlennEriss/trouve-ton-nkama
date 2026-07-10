# Export des Polygones de Délimitation OSM

## Objectif

Enrichir le fichier `gabon_osm.json` existant avec les **polygones de délimitation** (géométries complètes) pour permettre l'affichage des zones sur la carte interactive.

---

## Problème actuel

Le script `gabon_osm_export.mjs` utilise la directive Overpass `out tags center` qui retourne uniquement :
- Les **tags** (métadonnées)
- Le **centre** de chaque zone (`center.lat`, `center.lon`)

```overpass
out tags center;  ← Retourne uniquement le centre, pas la géométrie
```

**Résultat actuel dans `gabon_osm.json`** :
```json
{
  "osm": { "type": "relation", "id": 1243580 },
  "name": "Haut-Ogooué",
  "center": { "lat": -1.231135, "lon": 13.6400035 }
  // ❌ Pas de géométrie/polygone
}
```

---

## Solution : Utiliser `out geom`

La directive Overpass `out geom` retourne les **coordonnées complètes** de chaque élément :

```overpass
out geom;  ← Retourne la géométrie complète (polygone/polyline)
```

**Résultat avec `out geom`** :
```json
{
  "type": "relation",
  "id": 1243580,
  "tags": { "name": "Haut-Ogooué", ... },
  "members": [
    {
      "type": "way",
      "ref": 123456,
      "role": "outer",
      "geometry": [
        { "lat": -1.5, "lon": 13.2 },
        { "lat": -1.4, "lon": 13.3 },
        { "lat": -1.3, "lon": 13.4 },
        // ... centaines de points
      ]
    }
  ]
}
```

---

## Architecture du script de mise à jour

### Approche recommandée : Fichier séparé

Pour éviter de surcharger `gabon_osm.json` (qui deviendrait très volumineux ~50-100MB), on crée un **fichier séparé** pour les polygones :

```
scripts/openstreetmap/
├── gabon_osm.json              # Fichier existant (points + métadonnées) ~500KB
├── gabon_osm_export.mjs        # Script existant
├── gabon_polygons.geojson      # NOUVEAU: Polygones au format GeoJSON ~10-50MB
└── gabon_polygons_export.mjs   # NOUVEAU: Script d'export des polygones
```

### Format de sortie : GeoJSON

Le format **GeoJSON** est idéal pour les cartes Leaflet :

```json
{
  "type": "FeatureCollection",
  "generated_at": "2026-01-09T...",
  "features": [
    {
      "type": "Feature",
      "id": "relation/1243580",
      "properties": {
        "name": "Haut-Ogooué",
        "osmType": "relation",
        "osmId": 1243580,
        "adminLevel": "4",
        "placeType": null
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [13.2, -1.5],
            [13.3, -1.4],
            [13.4, -1.3],
            // ... coordonnées [lon, lat] (attention: inversé par rapport à OSM)
          ]
        ]
      }
    }
  ]
}
```

---

## Script : `gabon_polygons_export.mjs`

### Structure du script

```javascript
// gabon_polygons_export.mjs
import fs from "node:fs/promises";

// ============================================================
// CONFIGURATION
// ============================================================

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];

// Timeout plus long car les géométries sont volumineuses
const QUERY_TIMEOUT = 300; // 5 minutes

// ============================================================
// UTILITAIRES OVERPASS (identiques à gabon_osm_export.mjs)
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

async function overpass(query) {
  const body = new URLSearchParams({ data: query }).toString();
  const maxAttemptsPerEndpoint = 3;
  const baseDelayMs = 2000; // Plus long pour les requêtes volumineuses

  let lastErr = null;

  for (const endpoint of OVERPASS_URLS) {
    for (let attempt = 1; attempt <= maxAttemptsPerEndpoint; attempt++) {
      try {
        console.log(`  Trying ${endpoint} (attempt ${attempt})...`);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          const msg = `Overpass error ${res.status} @ ${endpoint}: ${text.slice(0, 500)}`;

          if (!isRetryableStatus(res.status)) {
            throw new Error(msg);
          }

          lastErr = new Error(msg);
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`  Retryable status ${res.status} -> wait ${delay}ms`);
          await sleep(delay);
          continue;
        }

        return res.json();
      } catch (e) {
        lastErr = e;
        if (attempt < maxAttemptsPerEndpoint) {
          const delay = baseDelayMs * Math.pow(2, attempt - 1);
          console.warn(`  Request failed -> wait ${delay}ms`);
          await sleep(delay);
          continue;
        }
      }
    }
    console.warn(`  Switching endpoint after failures: ${endpoint}`);
  }

  throw lastErr ?? new Error("Overpass error: all endpoints failed");
}

// ============================================================
// REQUÊTES OVERPASS AVEC GÉOMÉTRIE
// ============================================================

// Provinces (admin_level=4) - Polygones complets
const PROVINCES_QUERY = `
[out:json][timeout:${QUERY_TIMEOUT}];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

rel(area.ga)["boundary"="administrative"]["admin_level"="4"];
out geom;
`;

// Départements/Communes (admin_level=6,8) - Polygones complets
const DEPARTMENTS_QUERY = `
[out:json][timeout:${QUERY_TIMEOUT}];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  rel(area.ga)["boundary"="administrative"]["admin_level"="6"];
  rel(area.ga)["boundary"="administrative"]["admin_level"="8"];
);
out geom;
`;

// Quartiers administratifs (admin_level=9,10) - Polygones si disponibles
const ADMIN_QUARTERS_QUERY = `
[out:json][timeout:${QUERY_TIMEOUT}];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  rel(area.ga)["boundary"="administrative"]["admin_level"="9"];
  rel(area.ga)["boundary"="administrative"]["admin_level"="10"];
);
out geom;
`;

// Places (quartiers, villages, etc.) - Beaucoup sont des nodes sans géométrie
// On récupère quand même les ways/relations qui ont une géométrie
const PLACES_WITH_GEOM_QUERY = `
[out:json][timeout:${QUERY_TIMEOUT}];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
  // Ways et relations avec place=* (ont potentiellement une géométrie)
  way(area.ga)["place"~"suburb|neighbourhood|quarter|village|hamlet|locality"];
  rel(area.ga)["place"~"suburb|neighbourhood|quarter|village|hamlet|locality"];
);
out geom;
`;

// ============================================================
// CONVERSION OSM -> GEOJSON
// ============================================================

/**
 * Convertit les coordonnées OSM [lat, lon] en GeoJSON [lon, lat]
 */
function osmToGeoJsonCoords(osmCoords) {
  return osmCoords.map(c => [c.lon, c.lat]);
}

/**
 * Extrait la géométrie d'un élément OSM (way ou relation)
 */
function extractGeometry(element) {
  // Way simple
  if (element.type === "way" && element.geometry) {
    const coords = osmToGeoJsonCoords(element.geometry);
    // Fermer le polygone si nécessaire
    if (coords.length > 2) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coords.push([...first]);
      }
    }
    return {
      type: "Polygon",
      coordinates: [coords]
    };
  }

  // Relation (multipolygone)
  if (element.type === "relation" && element.members) {
    const outerRings = [];
    const innerRings = [];

    for (const member of element.members) {
      if (member.type === "way" && member.geometry) {
        const coords = osmToGeoJsonCoords(member.geometry);
        if (member.role === "outer") {
          outerRings.push(coords);
        } else if (member.role === "inner") {
          innerRings.push(coords);
        }
      }
    }

    // Assembler les anneaux extérieurs en polygones
    if (outerRings.length === 0) return null;

    // Cas simple: un seul anneau extérieur
    if (outerRings.length === 1) {
      const rings = [outerRings[0], ...innerRings];
      return {
        type: "Polygon",
        coordinates: rings
      };
    }

    // Cas complexe: multipolygone
    // Note: la gestion correcte des inner rings par outer ring est complexe
    // Pour simplifier, on crée un MultiPolygon
    const polygons = outerRings.map(outer => [outer]);
    return {
      type: "MultiPolygon",
      coordinates: polygons
    };
  }

  // Node ou élément sans géométrie -> créer un cercle approximatif
  if (element.lat && element.lon) {
    return createCirclePolygon(element.lat, element.lon, 500); // rayon 500m
  }

  if (element.center) {
    return createCirclePolygon(element.center.lat, element.center.lon, 500);
  }

  return null;
}

/**
 * Crée un polygone circulaire approximatif (pour les nodes sans géométrie)
 */
function createCirclePolygon(centerLat, centerLon, radiusMeters, numPoints = 32) {
  const coords = [];
  const earthRadius = 6371000; // mètres

  for (let i = 0; i <= numPoints; i++) {
    const angle = (i / numPoints) * 2 * Math.PI;
    const dLat = (radiusMeters / earthRadius) * Math.cos(angle);
    const dLon = (radiusMeters / (earthRadius * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
    
    coords.push([
      centerLon + (dLon * 180 / Math.PI),
      centerLat + (dLat * 180 / Math.PI)
    ]);
  }

  return {
    type: "Polygon",
    coordinates: [coords]
  };
}

/**
 * Convertit un élément OSM en Feature GeoJSON
 */
function toGeoJsonFeature(element, category) {
  const tags = element.tags || {};
  const geometry = extractGeometry(element);

  if (!geometry) return null;

  return {
    type: "Feature",
    id: `${element.type}/${element.id}`,
    properties: {
      name: tags.name || tags["name:fr"] || null,
      nameFr: tags["name:fr"] || null,
      nameEn: tags["name:en"] || null,
      osmType: element.type,
      osmId: element.id,
      adminLevel: tags.admin_level || null,
      placeType: tags.place || null,
      category: category, // 'province', 'department', 'quarter', 'place'
      // Centre pour le positionnement initial
      center: element.center || 
        (element.lat && element.lon ? { lat: element.lat, lon: element.lon } : null)
    },
    geometry
  };
}

// ============================================================
// SCRIPT PRINCIPAL
// ============================================================

async function main() {
  const features = [];
  const stats = {
    provinces: 0,
    departments: 0,
    adminQuarters: 0,
    places: 0,
    skipped: 0
  };

  console.log("=".repeat(60));
  console.log("Export des polygones OSM du Gabon");
  console.log("=".repeat(60));

  // 1. Provinces
  console.log("\n[1/4] Récupération des provinces (admin_level=4)...");
  try {
    const provincesJson = await overpass(PROVINCES_QUERY);
    for (const el of provincesJson.elements || []) {
      const feature = toGeoJsonFeature(el, "province");
      if (feature) {
        features.push(feature);
        stats.provinces++;
      } else {
        stats.skipped++;
      }
    }
    console.log(`  ✓ ${stats.provinces} provinces exportées`);
  } catch (e) {
    console.error("  ✗ Erreur provinces:", e.message);
  }

  // 2. Départements/Communes
  console.log("\n[2/4] Récupération des départements/communes (admin_level=6,8)...");
  try {
    const deptsJson = await overpass(DEPARTMENTS_QUERY);
    for (const el of deptsJson.elements || []) {
      const feature = toGeoJsonFeature(el, "department");
      if (feature) {
        features.push(feature);
        stats.departments++;
      } else {
        stats.skipped++;
      }
    }
    console.log(`  ✓ ${stats.departments} départements/communes exportés`);
  } catch (e) {
    console.error("  ✗ Erreur départements:", e.message);
  }

  // 3. Quartiers administratifs
  console.log("\n[3/4] Récupération des quartiers administratifs (admin_level=9,10)...");
  try {
    const adminQuartersJson = await overpass(ADMIN_QUARTERS_QUERY);
    for (const el of adminQuartersJson.elements || []) {
      const feature = toGeoJsonFeature(el, "admin_quarter");
      if (feature) {
        features.push(feature);
        stats.adminQuarters++;
      } else {
        stats.skipped++;
      }
    }
    console.log(`  ✓ ${stats.adminQuarters} quartiers admin exportés`);
  } catch (e) {
    console.error("  ✗ Erreur quartiers admin:", e.message);
  }

  // 4. Places avec géométrie
  console.log("\n[4/4] Récupération des places avec géométrie (suburb, village, etc.)...");
  try {
    const placesJson = await overpass(PLACES_WITH_GEOM_QUERY);
    for (const el of placesJson.elements || []) {
      const feature = toGeoJsonFeature(el, "place");
      if (feature) {
        features.push(feature);
        stats.places++;
      } else {
        stats.skipped++;
      }
    }
    console.log(`  ✓ ${stats.places} places avec géométrie exportées`);
  } catch (e) {
    console.error("  ✗ Erreur places:", e.message);
  }

  // Création du GeoJSON final
  const geojson = {
    type: "FeatureCollection",
    generated_at: new Date().toISOString(),
    source: {
      provider: "OpenStreetMap",
      method: "Overpass API (out geom)",
      endpoints: OVERPASS_URLS
    },
    stats: {
      total: features.length,
      ...stats
    },
    features
  };

  // Écriture du fichier
  const outPath = new URL("./gabon_polygons.geojson", import.meta.url);
  await fs.writeFile(outPath, JSON.stringify(geojson, null, 2), "utf-8");

  console.log("\n" + "=".repeat(60));
  console.log("RÉSUMÉ");
  console.log("=".repeat(60));
  console.log(`Provinces:          ${stats.provinces}`);
  console.log(`Départements:       ${stats.departments}`);
  console.log(`Quartiers admin:    ${stats.adminQuarters}`);
  console.log(`Places (géom):      ${stats.places}`);
  console.log(`Éléments ignorés:   ${stats.skipped}`);
  console.log(`TOTAL features:     ${features.length}`);
  console.log(`\nFichier: ${outPath.pathname}`);
  
  // Taille du fichier
  const fileStats = await fs.stat(outPath);
  const sizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
  console.log(`Taille: ${sizeMB} MB`);
}

main().catch(console.error);
```

---

## Stratégie de fallback pour les nodes

### Problème

La majorité des quartiers dans OSM au Gabon sont des **nodes** (points), pas des **ways** ou **relations** (polygones). Ils n'ont donc pas de géométrie de délimitation.

### Solutions

| Stratégie | Description | Avantages | Inconvénients |
|-----------|-------------|-----------|---------------|
| **Cercle approximatif** | Créer un cercle de rayon fixe autour du centre | Simple, léger | Pas réaliste |
| **Voronoi** | Calculer les zones de Voronoi entre les points | Couverture complète | Calcul complexe |
| **Buffer adaptatif** | Rayon variable selon le type (village > suburb) | Plus réaliste | Arbitraire |
| **Pas de polygone** | N'afficher que les points sur la carte | Données exactes | Pas de délimitation |

### Rayons suggérés par type

```javascript
const RADIUS_BY_TYPE = {
  province: 50000,    // 50 km (juste pour fallback)
  city: 5000,         // 5 km
  town: 3000,         // 3 km
  suburb: 1000,       // 1 km
  neighbourhood: 500, // 500 m
  quarter: 500,       // 500 m
  village: 2000,      // 2 km
  hamlet: 500,        // 500 m
  locality: 300       // 300 m
};
```

---

## Intégration avec le fichier existant

### Option A : Fichiers séparés (recommandé)

```
gabon_osm.json          → Métadonnées + centres (existant)
gabon_polygons.geojson  → Polygones GeoJSON (nouveau)
```

**Avantages** :
- Pas de modification du fichier existant
- Chargement conditionnel (polygones seulement pour la carte)
- Taille de fichier maîtrisée

### Option B : Enrichissement du fichier existant

Ajouter un champ `geometry` à chaque entrée de `gabon_osm.json` :

```json
{
  "osm": { "type": "relation", "id": 1243580 },
  "name": "Haut-Ogooué",
  "center": { "lat": -1.231135, "lon": 13.6400035 },
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[13.2, -1.5], ...]]
  }
}
```

**Inconvénients** :
- Fichier très volumineux (~50-100MB)
- Chargement lent pour les usages qui n'ont pas besoin des polygones

---

## Script de mise à jour : `update_osm_with_polygons.mjs`

Ce script enrichit le fichier `gabon_osm.json` existant en ajoutant les géométries :

```javascript
// update_osm_with_polygons.mjs
import fs from "node:fs/promises";

const OSM_FILE = new URL("./gabon_osm.json", import.meta.url);
const POLYGONS_FILE = new URL("./gabon_polygons.geojson", import.meta.url);
const OUTPUT_FILE = new URL("./gabon_osm_with_polygons.json", import.meta.url);

async function main() {
  console.log("Chargement des fichiers...");
  
  // Charger les fichiers
  const osmData = JSON.parse(await fs.readFile(OSM_FILE, "utf-8"));
  const polygonsData = JSON.parse(await fs.readFile(POLYGONS_FILE, "utf-8"));

  // Créer un index des polygones par OSM ID
  const polygonIndex = new Map();
  for (const feature of polygonsData.features) {
    const key = feature.id; // "relation/1243580" ou "way/12345"
    polygonIndex.set(key, feature.geometry);
  }

  console.log(`Polygones indexés: ${polygonIndex.size}`);

  // Enrichir admin_boundaries
  let enriched = 0;
  for (const level of Object.keys(osmData.admin_boundaries)) {
    for (const item of osmData.admin_boundaries[level]) {
      const key = `${item.osm.type}/${item.osm.id}`;
      const geometry = polygonIndex.get(key);
      if (geometry) {
        item.geometry = geometry;
        enriched++;
      }
    }
  }

  // Enrichir places
  for (const placeType of Object.keys(osmData.places)) {
    for (const item of osmData.places[placeType]) {
      const key = `${item.osm.type}/${item.osm.id}`;
      const geometry = polygonIndex.get(key);
      if (geometry) {
        item.geometry = geometry;
        enriched++;
      }
    }
  }

  console.log(`Éléments enrichis: ${enriched}`);

  // Mettre à jour les métadonnées
  osmData.generated_at = new Date().toISOString();
  osmData.includes_polygons = true;
  osmData.polygon_source = "gabon_polygons.geojson";

  // Écrire le fichier enrichi
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(osmData, null, 2), "utf-8");
  
  const stats = await fs.stat(OUTPUT_FILE);
  console.log(`Fichier créé: ${OUTPUT_FILE.pathname}`);
  console.log(`Taille: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
}

main().catch(console.error);
```

---

## Utilisation

### 1. Exporter les polygones

```bash
cd scripts/openstreetmap
node gabon_polygons_export.mjs
```

### 2. (Optionnel) Enrichir le fichier OSM existant

```bash
node update_osm_with_polygons.mjs
```

### 3. Copier le GeoJSON dans public/ pour l'application

```bash
cp gabon_polygons.geojson ../../public/data/
```

---

## Considérations importantes

### Taille des fichiers

| Fichier | Taille estimée |
|---------|----------------|
| `gabon_osm.json` (actuel) | ~500 KB |
| `gabon_polygons.geojson` | ~10-50 MB |
| `gabon_osm_with_polygons.json` | ~10-50 MB |

### Performance dans le navigateur

Pour des fichiers volumineux, considérer :

1. **Lazy loading** : Charger les polygones à la demande selon la zone visible
2. **Simplification** : Utiliser des outils comme `mapshaper` pour réduire la précision
3. **Tiling** : Découper en tuiles vectorielles (Mapbox Vector Tiles)
4. **Compression** : Servir le fichier gzippé

### Simplification avec mapshaper

```bash
# Installer mapshaper
npm install -g mapshaper

# Simplifier le GeoJSON (garder 10% des points)
mapshaper gabon_polygons.geojson -simplify 10% -o gabon_polygons_simplified.geojson
```

---

## Prochaines étapes

1. [ ] Créer `scripts/openstreetmap/gabon_polygons_export.mjs`
2. [ ] Exécuter le script et vérifier les résultats
3. [ ] Simplifier le GeoJSON si nécessaire
4. [ ] Intégrer dans l'application via `src/data/gabon-boundaries-loader.ts`
5. [ ] Tester le rendu sur la carte Leaflet
