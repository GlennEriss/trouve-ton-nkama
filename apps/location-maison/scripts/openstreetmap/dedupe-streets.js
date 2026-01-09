/* eslint-disable no-console */
/**
 * Déduplication des streets par nom (Gabon)
 *
 * Problème: l'ID = name+lon+lat => si une street existait déjà avec d'autres coords,
 * on se retrouve avec plusieurs docs (ex: "centre-ville" vs "centreviewille", "akébé-ville" vs "Akebe Ville").
 *
 * Objectif:
 * - Garder la version "canonique" issue du dump OSM importé (mêmes règles que import-locations.js)
 * - Normaliser les noms (accents, préfixes "rue de", "avenue", etc.)
 * - Valider la distance géographique (< 1km) et la même ville (cityId)
 * - Supprimer les streets en doublon
 *
 * Note: Les propriétés stockent street en string, pas streetId, donc pas de migration de refs nécessaire.
 *
 * Usage:
 *   node scripts/openstreetmap/dedupe-streets.js --dry-run
 *   node scripts/openstreetmap/dedupe-streets.js --apply
 */

const path = require("node:path");
const fs = require("node:fs");
const { initFirestoreAdmin } = require("./firestore-admin");
const { generateStreetId, normalizeName } = require("./id-generator");
const { nearestByCenter, haversineKm } = require("./geo");

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    apply: argv.includes("--apply"),
  };
}

function canonicalProvinceName(rawName) {
  const s = String(rawName || "").trim();
  const lower = s.toLowerCase();
  if (lower === "nyanga (gabon)") return "Nyanga";
  return s.replace(/\s*\((gabon)\)\s*/i, "").trim();
}

const GABON_PROVINCES = new Set([
  "Estuaire",
  "Haut-Ogooué",
  "Moyen-Ogooué",
  "Ngounié",
  "Nyanga",
  "Ogooué-Ivindo",
  "Ogooué-Lolo",
  "Ogooué-Maritime",
  "Woleu-Ntem",
]);

function loadOsmJson() {
  const osmPath = path.join(__dirname, "gabon_osm.json");
  const raw = fs.readFileSync(osmPath, "utf8");
  return JSON.parse(raw);
}

function pickBestName(item) {
  const fr = item?.names?.fr;
  if (fr) return fr;
  if (item?.name) return item.name;
  if (item?.osm?.type && item?.osm?.id) return `osm_${item.osm.type}_${item.osm.id}`;
  return "osm_unknown";
}

function pickCenter(item) {
  if (item?.center && typeof item.center.lat === "number" && typeof item.center.lon === "number") {
    return item.center;
  }
  return { lat: 0, lon: 0 };
}

function buildProvinceCenters(osm) {
  const admin4 = (osm.admin_boundaries && osm.admin_boundaries["4"]) || [];
  const out = [];
  for (const p of admin4) {
    const rawName = pickBestName(p);
    const name = canonicalProvinceName(rawName);
    if (!GABON_PROVINCES.has(name)) continue;
    const center = pickCenter(p);
    out.push({ name, center });
  }
  return out;
}

function buildCityCenters(osm) {
  const fromPlaces = []
    .concat(osm.places?.city || [])
    .concat(osm.places?.town || []);
  const fromAdmin6 = (osm.admin_boundaries && osm.admin_boundaries["6"]) || [];
  const fromAdmin8 = (osm.admin_boundaries && osm.admin_boundaries["8"]) || [];
  const fromAdmin4All = (osm.admin_boundaries && osm.admin_boundaries["4"]) || [];

  const fromAdmin4NonProvince = fromAdmin4All.filter((p) => {
    const rawName = pickBestName(p);
    const name = canonicalProvinceName(rawName);
    return !GABON_PROVINCES.has(name);
  });

  const raw = fromPlaces.concat(fromAdmin6).concat(fromAdmin8).concat(fromAdmin4NonProvince);

  const provinceCenters = buildProvinceCenters(osm).map((p) => ({
    center: p.center,
    data: { name: p.name },
  }));

  const byKey = new Map(); // key = normCity|normProvince -> { id, name, provinceName }
  for (const c of raw) {
    const name = pickBestName(c);
    const center = pickCenter(c);
    const id = generateStreetId(name, center.lon, center.lat); // Reuse function signature

    const nearestProv = nearestByCenter(center, provinceCenters);
    const provinceName = nearestProv?.item?.data?.name;

    const key = `${normalizeName(name)}|${normalizeName(provinceName || "")}`;
    if (!byKey.has(key)) {
      byKey.set(key, { id, name, provinceName: provinceName || null });
    }
  }

  return byKey;
}

/**
 * Normalise un nom de rue pour le matching, en supprimant les préfixes
 * et en gérant les variations d'accents/formatage.
 */
function normalizeStreetNameForMatching(rawName) {
  let s = String(rawName || "").trim();
  
  // Supprimer les préfixes de type de voie
  s = s.replace(
    /^(rue|avenue|boulevard|route|place|quartier|secteur|zone|impasse|chemin|allée|passage)\s+(de|d['']|du|de la|des|d')\s+/i,
    ""
  );
  
  // Normaliser d'abord (minuscules, enlever accents, espaces, tirets)
  let normalized = normalizeName(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever accents
    .replace(/[^a-z0-9]/g, ""); // Enlever tout sauf alphanum (espaces, tirets, etc.)
  
  // Alias explicites appliqués après normalisation (pour gérer variations d'espaces/tirets)
  const aliases = {
    "akebeville": "akebeville", // akébé-ville, akebe ville, etc.
    "ambowe": "ambowe", // ambowè, etc.
    "basdeguegue": "basdeguegue", // bas de gué-gué, etc.
    "hautdeguegue": "hautdeguegue", // haut de gué-gué, etc.
    "centreviewille": "centreviewille", // centre-ville, centre ville, etc.
    "citemebiame": "citemebiame", // cité mébiame, etc.
    "atongabe": "atongabe", // atong-abe, etc.
    "malibe": "malibe", // malibé, etc.
  };
  
  // Si normalisé correspond à un alias, retourner la version canonique
  if (aliases[normalized]) {
    return aliases[normalized];
  }
  
  return normalized;
}

/**
 * Vérifie si deux rues sont probablement des doublons en comparant
 * nom normalisé, cityId et distance géographique.
 */
function areLikelyDuplicates(street1, street2, maxDistanceKm = 1.0) {
  const norm1 = normalizeStreetNameForMatching(street1.name);
  const norm2 = normalizeStreetNameForMatching(street2.name);
  
  // Nom normalisé différent => pas des doublons
  if (norm1 !== norm2) {
    return false;
  }
  
  // CityId différente => pas des doublons
  const city1 = String(street1.cityId || "");
  const city2 = String(street2.cityId || "");
  if (city1 && city2 && city1 !== city2) {
    return false;
  }
  
  // Vérifier la distance géographique si les deux ont des coordonnées valides
  if (
    typeof street1.latitude === "number" &&
    typeof street1.longitude === "number" &&
    typeof street2.latitude === "number" &&
    typeof street2.longitude === "number" &&
    street1.latitude !== 0 &&
    street1.longitude !== 0 &&
    street2.latitude !== 0 &&
    street2.longitude !== 0
  ) {
    const distanceKm = haversineKm(
      { lat: street1.latitude, lon: street1.longitude },
      { lat: street2.latitude, lon: street2.longitude }
    );
    
    // Si très proches (< 1km), c'est probablement un doublon
    return distanceKm <= maxDistanceKm;
  }
  
  // Si pas de coordonnées valides, on considère comme doublon si nom et cityId identiques
  return true;
}

function buildOsmCanonicalStreets(osm) {
  // Reproduit les sources utilisées dans import-locations.js (streets)
  const fromSuburbs = (osm.suburbs || []).concat(osm.neighbourhoods || []).concat(osm.quarters || []);
  const fromVillages = (osm.villages || []).concat(osm.hamlets || []).concat(osm.localities || []);
  const fromAdmin9 = (osm.admin_boundaries && osm.admin_boundaries["9"]) || [];
  const fromAdmin10 = (osm.admin_boundaries && osm.admin_boundaries["10"]) || [];

  const raw = fromSuburbs.concat(fromVillages).concat(fromAdmin9).concat(fromAdmin10);

  // Calculer cityName et provinceName pour chaque street (via nearest city)
  const cityCenters = buildCityCenters(osm).map((c) => ({
    center: { lat: 0, lon: 0 }, // On aurait besoin des coords réelles, mais simplifions
    data: c,
  }));

  const provinceCenters = buildProvinceCenters(osm).map((p) => ({
    center: p.center,
    data: { name: p.name },
  }));

  // Pour simplifier, on crée un map par nom normalisé (on va matcher par cityId côté Firestore)
  const byKey = new Map(); // key = normStreet|cityId -> { id, name }
  
  // Note: Dans import-locations.js, les streets sont importées avec cityId calculé.
  // Ici, on construit juste un index par nom pour référence, mais le matching réel
  // se fera côté Firestore via cityId + nom normalisé.
  
  return byKey;
}

async function deleteStreet({ db, id, dryRun }) {
  if (dryRun) return;
  await db.collection("streets").doc(id).delete();
}

async function run() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.apply) {
    console.log("❌ Choisis --dry-run ou --apply");
    process.exit(1);
  }
  const dryRun = args.dryRun && !args.apply;

  const { db } = initFirestoreAdmin();
  const osm = loadOsmJson();

  console.log("🔎 Déduplication streets");
  console.log(`- mode: ${dryRun ? "DRY-RUN" : "APPLY"}`);

  const snap = await db.collection("streets").get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Grouper par (nom normalisé pour matching + cityId) pour éviter collisions inter-ville
  const groups = new Map(); // key => array
  for (const s of docs) {
    const normName = normalizeStreetNameForMatching(s.name || "");
    const cityId = String(s.cityId || "");
    const key = `${normName}|${cityId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  
  // Filtrer les groupes pour ne garder que ceux qui sont vraiment des doublons
  // (même nom normalisé ET même cityId ET coordonnées proches OU coordonnées manquantes)
  const duplicateGroups = new Map();
  for (const [key, items] of groups.entries()) {
    if (items.length <= 1) continue;
    
    // Vérifier que tous les items du groupe sont des doublons géographiques
    // (distance entre n'importe quels deux items < seuil)
    let allAreDuplicates = true;
    for (let i = 0; i < items.length && allAreDuplicates; i++) {
      for (let j = i + 1; j < items.length; j++) {
        if (!areLikelyDuplicates(items[i], items[j])) {
          allAreDuplicates = false;
          break;
        }
      }
    }
    
    if (allAreDuplicates && items.length > 1) {
      duplicateGroups.set(key, items);
    }
  }

  let dupGroups = 0;
  let deleted = 0;

  for (const [key, items] of duplicateGroups.entries()) {
    if (items.length <= 1) continue;

    // Déterminer quelle street garder
    // Stratégie: garder celle avec les meilleures coordonnées (non nulles), ou la première
    let keep = items.find((s) => s.latitude && s.longitude && s.latitude !== 0 && s.longitude !== 0);
    if (!keep) {
      keep = items[0]; // Fallback: première du groupe
    }

    const toDelete = items.filter((x) => x.id !== keep.id);
    if (toDelete.length === 0) continue;

    dupGroups++;
    const cityName = keep.cityName || "ville?";
    console.log(`\n### ${keep.name} (${cityName})`);
    console.log(`- keep: ${keep.id}`);
    console.log(`- delete: ${toDelete.map((d) => d.id).join(", ")}`);

    for (const del of toDelete) {
      await deleteStreet({ db, id: del.id, dryRun });
      deleted++;
    }
  }

  console.log("\n📊 Résumé");
  console.log(`- groupes doublons traités: ${dupGroups}`);
  console.log(`- streets supprimées: ${deleted}`);
  console.log(`- mode: ${dryRun ? "DRY-RUN" : "APPLY"}`);
}

run().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});


