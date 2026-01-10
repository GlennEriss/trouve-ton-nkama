// gabon_polygons_export.mjs
// Script pour exporter les polygones de délimitation des zones du Gabon depuis OSM
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

// Rayons par défaut pour les cercles approximatifs (en mètres)
const RADIUS_BY_TYPE = {
  province: 50000,    // 50 km (fallback uniquement)
  city: 5000,         // 5 km
  town: 3000,         // 3 km
  suburb: 1000,       // 1 km
  neighbourhood: 500, // 500 m
  quarter: 500,       // 500 m
  village: 2000,      // 2 km
  hamlet: 500,        // 500 m
  locality: 300       // 300 m
};

// ============================================================
// UTILITAIRES OVERPASS
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
  const baseDelayMs = 2000;

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

// Places (quartiers, villages, etc.) - Ways et relations avec géométrie
const PLACES_WITH_GEOM_QUERY = `
[out:json][timeout:${QUERY_TIMEOUT}];
rel["boundary"="administrative"]["admin_level"="2"]["ISO3166-1"="GA"];
map_to_area -> .ga;

(
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
 * Ferme un anneau de polygone si nécessaire
 */
function closeRing(coords) {
  if (coords.length < 3) return coords;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    coords.push([...first]);
  }
  return coords;
}

/**
 * Extrait la géométrie d'un élément OSM (way ou relation)
 */
function extractGeometry(element) {
  // Way simple
  if (element.type === "way" && element.geometry) {
    const coords = closeRing(osmToGeoJsonCoords(element.geometry));
    if (coords.length >= 4) {
      return {
        type: "Polygon",
        coordinates: [coords]
      };
    }
    return null;
  }

  // Relation (multipolygone)
  if (element.type === "relation" && element.members) {
    const outerRings = [];
    const innerRings = [];

    for (const member of element.members) {
      if (member.type === "way" && member.geometry) {
        const coords = osmToGeoJsonCoords(member.geometry);
        if (coords.length >= 3) {
          if (member.role === "outer" || member.role === "") {
            outerRings.push(closeRing(coords));
          } else if (member.role === "inner") {
            innerRings.push(closeRing(coords));
          }
        }
      }
    }

    if (outerRings.length === 0) return null;

    // Cas simple: un seul anneau extérieur
    if (outerRings.length === 1 && outerRings[0].length >= 4) {
      const rings = [outerRings[0]];
      // Ajouter les inner rings valides
      for (const inner of innerRings) {
        if (inner.length >= 4) rings.push(inner);
      }
      return {
        type: "Polygon",
        coordinates: rings
      };
    }

    // Cas complexe: multipolygone
    const polygons = outerRings
      .filter(outer => outer.length >= 4)
      .map(outer => [outer]);
    
    if (polygons.length === 0) return null;
    if (polygons.length === 1) {
      return {
        type: "Polygon",
        coordinates: polygons[0]
      };
    }
    
    return {
      type: "MultiPolygon",
      coordinates: polygons
    };
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
 * Calcule le centre d'une géométrie
 */
function calculateCenter(geometry) {
  if (!geometry) return null;
  
  let coords = [];
  if (geometry.type === "Polygon") {
    coords = geometry.coordinates[0];
  } else if (geometry.type === "MultiPolygon") {
    coords = geometry.coordinates[0][0];
  }
  
  if (coords.length === 0) return null;
  
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of coords) {
    sumLon += lon;
    sumLat += lat;
  }
  
  return {
    lat: sumLat / coords.length,
    lon: sumLon / coords.length
  };
}

/**
 * Convertit un élément OSM en Feature GeoJSON
 */
function toGeoJsonFeature(element, category) {
  const tags = element.tags || {};
  let geometry = extractGeometry(element);
  let center = null;

  // Si pas de géométrie, créer un cercle approximatif
  if (!geometry) {
    const lat = element.center?.lat || element.lat;
    const lon = element.center?.lon || element.lon;
    
    if (lat && lon) {
      const placeType = tags.place || category;
      const radius = RADIUS_BY_TYPE[placeType] || 1000;
      geometry = createCirclePolygon(lat, lon, radius);
      center = { lat, lon };
    }
  } else {
    center = calculateCenter(geometry);
  }

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
      category: category,
      isApproximate: !extractGeometry(element), // true si cercle généré
      center: center
    },
    geometry
  };
}

// ============================================================
// CHARGEMENT DES DONNÉES EXISTANTES
// ============================================================

async function loadExistingOSMData() {
  const osmPath = new URL("./gabon_osm.json", import.meta.url);
  try {
    const data = await fs.readFile(osmPath, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.warn("Could not load gabon_osm.json:", e.message);
    return null;
  }
}

/**
 * Génère des features GeoJSON à partir des données existantes (points uniquement)
 * Utilisé comme fallback pour les places qui n'ont pas de géométrie dans Overpass
 */
function generateFeaturesFromExistingData(osmData) {
  const features = [];
  
  if (!osmData) return features;

  // Places
  const placeTypes = ['suburb', 'neighbourhood', 'quarter', 'village', 'hamlet', 'locality', 'city', 'town'];
  
  for (const placeType of placeTypes) {
    const places = osmData.places?.[placeType] || [];
    for (const place of places) {
      if (!place.center?.lat || !place.center?.lon) continue;
      
      const radius = RADIUS_BY_TYPE[placeType] || 1000;
      const geometry = createCirclePolygon(place.center.lat, place.center.lon, radius);
      
      features.push({
        type: "Feature",
        id: `${place.osm?.type || 'node'}/${place.osm?.id || Math.random().toString(36).substr(2, 9)}`,
        properties: {
          name: place.name || place.names?.fr || null,
          nameFr: place.names?.fr || null,
          nameEn: place.names?.en || null,
          osmType: place.osm?.type || 'node',
          osmId: place.osm?.id || null,
          adminLevel: null,
          placeType: placeType,
          category: placeType === 'city' || placeType === 'town' ? 'city' : 'place',
          isApproximate: true,
          center: place.center
        },
        geometry
      });
    }
  }

  return features;
}

// ============================================================
// SCRIPT PRINCIPAL
// ============================================================

async function main() {
  const features = [];
  const seenIds = new Set();
  const stats = {
    provinces: 0,
    departments: 0,
    adminQuarters: 0,
    placesWithGeom: 0,
    placesFromExisting: 0,
    skipped: 0,
    duplicates: 0
  };

  console.log("=".repeat(60));
  console.log("Export des polygones OSM du Gabon");
  console.log("=".repeat(60));

  const addFeature = (feature) => {
    if (!feature) {
      stats.skipped++;
      return false;
    }
    if (seenIds.has(feature.id)) {
      stats.duplicates++;
      return false;
    }
    seenIds.add(feature.id);
    features.push(feature);
    return true;
  };

  // 1. Provinces
  console.log("\n[1/5] Récupération des provinces (admin_level=4)...");
  try {
    const provincesJson = await overpass(PROVINCES_QUERY);
    for (const el of provincesJson.elements || []) {
      if (addFeature(toGeoJsonFeature(el, "province"))) {
        stats.provinces++;
      }
    }
    console.log(`  ✓ ${stats.provinces} provinces exportées`);
  } catch (e) {
    console.error("  ✗ Erreur provinces:", e.message);
  }

  // 2. Départements/Communes
  console.log("\n[2/5] Récupération des départements/communes (admin_level=6,8)...");
  try {
    const deptsJson = await overpass(DEPARTMENTS_QUERY);
    for (const el of deptsJson.elements || []) {
      if (addFeature(toGeoJsonFeature(el, "department"))) {
        stats.departments++;
      }
    }
    console.log(`  ✓ ${stats.departments} départements/communes exportés`);
  } catch (e) {
    console.error("  ✗ Erreur départements:", e.message);
  }

  // 3. Quartiers administratifs
  console.log("\n[3/5] Récupération des quartiers administratifs (admin_level=9,10)...");
  try {
    const adminQuartersJson = await overpass(ADMIN_QUARTERS_QUERY);
    for (const el of adminQuartersJson.elements || []) {
      if (addFeature(toGeoJsonFeature(el, "admin_quarter"))) {
        stats.adminQuarters++;
      }
    }
    console.log(`  ✓ ${stats.adminQuarters} quartiers admin exportés`);
  } catch (e) {
    console.error("  ✗ Erreur quartiers admin:", e.message);
  }

  // 4. Places avec géométrie
  console.log("\n[4/5] Récupération des places avec géométrie (suburb, village, etc.)...");
  try {
    const placesJson = await overpass(PLACES_WITH_GEOM_QUERY);
    for (const el of placesJson.elements || []) {
      if (addFeature(toGeoJsonFeature(el, "place"))) {
        stats.placesWithGeom++;
      }
    }
    console.log(`  ✓ ${stats.placesWithGeom} places avec géométrie exportées`);
  } catch (e) {
    console.error("  ✗ Erreur places:", e.message);
  }

  // 5. Compléter avec les données existantes (fallback)
  console.log("\n[5/5] Ajout des places depuis gabon_osm.json (cercles approximatifs)...");
  const osmData = await loadExistingOSMData();
  const fallbackFeatures = generateFeaturesFromExistingData(osmData);
  
  for (const feature of fallbackFeatures) {
    // Vérifier si on a déjà cette place (par nom + proximité)
    const isDuplicate = features.some(f => {
      if (f.properties.name !== feature.properties.name) return false;
      if (!f.properties.center || !feature.properties.center) return false;
      const dist = Math.sqrt(
        Math.pow(f.properties.center.lat - feature.properties.center.lat, 2) +
        Math.pow(f.properties.center.lon - feature.properties.center.lon, 2)
      );
      return dist < 0.01; // ~1km
    });

    if (!isDuplicate && addFeature(feature)) {
      stats.placesFromExisting++;
    }
  }
  console.log(`  ✓ ${stats.placesFromExisting} places ajoutées depuis fichier existant`);

  // Création du GeoJSON final
  const geojson = {
    type: "FeatureCollection",
    generated_at: new Date().toISOString(),
    source: {
      provider: "OpenStreetMap",
      method: "Overpass API (out geom) + gabon_osm.json fallback",
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
  console.log(`Provinces:            ${stats.provinces}`);
  console.log(`Départements:         ${stats.departments}`);
  console.log(`Quartiers admin:      ${stats.adminQuarters}`);
  console.log(`Places (géom OSM):    ${stats.placesWithGeom}`);
  console.log(`Places (fallback):    ${stats.placesFromExisting}`);
  console.log(`Éléments ignorés:     ${stats.skipped}`);
  console.log(`Doublons évités:      ${stats.duplicates}`);
  console.log(`TOTAL features:       ${features.length}`);
  console.log(`\nFichier: ${outPath.pathname}`);
  
  // Taille du fichier
  const fileStats = await fs.stat(outPath);
  const sizeMB = (fileStats.size / 1024 / 1024).toFixed(2);
  console.log(`Taille: ${sizeMB} MB`);

  // Copier vers public/data pour l'application
  const publicDataDir = new URL("../../public/data/", import.meta.url);
  try {
    await fs.mkdir(publicDataDir, { recursive: true });
    const publicPath = new URL("../../public/data/gabon_polygons.geojson", import.meta.url);
    await fs.copyFile(outPath, publicPath);
    console.log(`\nCopié vers: ${publicPath.pathname}`);
  } catch (e) {
    console.warn("Impossible de copier vers public/data:", e.message);
  }
}

main().catch(console.error);
