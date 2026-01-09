/* eslint-disable no-console */
/**
 * Déduplication des cities par nom (Gabon)
 *
 * Problème: l'ID = name+lon+lat => si une city existait déjà avec d'autres coords,
 * on se retrouve avec plusieurs docs (ex: libreville_* plusieurs fois).
 *
 * Objectif:
 * - Garder la version "canonique" issue du dump OSM importé (mêmes règles que import-locations.js)
 * - Mettre à jour toutes les références streets.cityId (+cityName) vers l'ID canonique
 * - Supprimer les cities en doublon
 *
 * Usage:
 *   node scripts/openstreetmap/dedupe-cities.js --dry-run
 *   node scripts/openstreetmap/dedupe-cities.js --apply
 */

const path = require("node:path");
const fs = require("node:fs");
const { initFirestoreAdmin } = require("./firestore-admin");
const { generateCityId, normalizeName } = require("./id-generator");
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

/**
 * Normalise un nom de ville pour le matching, en supprimant les préfixes administratifs
 * et en appliquant des alias connus.
 */
function normalizeCityNameForMatching(rawName) {
  let s = String(rawName || "").trim();
  
  // Alias explicites (prioritaires)
  const aliases = {
    "commune de kango": "kango",
    "ville de kango": "kango",
  };
  
  const lower = s.toLowerCase();
  if (aliases[lower]) {
    return aliases[lower];
  }
  
  // Supprimer les préfixes administratifs courants
  s = s.replace(
    /^(commune|ville|département|arrondissement|préfecture|sous-préfecture|secteur)\s+(de|d['']|du|de la|des|d')\s+/i,
    ""
  );
  
  // Normaliser comme normalizeName (minuscules, enlever espaces)
  return normalizeName(s);
}

/**
 * Vérifie si deux villes sont probablement des doublons en comparant
 * nom normalisé, province et distance géographique.
 */
function areLikelyDuplicates(city1, city2, maxDistanceKm = 1.0) {
  const norm1 = normalizeCityNameForMatching(city1.name);
  const norm2 = normalizeCityNameForMatching(city2.name);
  
  // Nom normalisé différent => pas des doublons
  if (norm1 !== norm2) {
    return false;
  }
  
  // Province différente => pas des doublons (ex: "Libreville" dans deux provinces = erreur mais on ne fusionne pas)
  const prov1 = normalizeName(city1.provinceName || "");
  const prov2 = normalizeName(city2.provinceName || "");
  if (prov1 && prov2 && prov1 !== prov2) {
    return false;
  }
  
  // Vérifier la distance géographique si les deux ont des coordonnées valides
  if (
    typeof city1.latitude === "number" &&
    typeof city1.longitude === "number" &&
    typeof city2.latitude === "number" &&
    typeof city2.longitude === "number" &&
    city1.latitude !== 0 &&
    city1.longitude !== 0 &&
    city2.latitude !== 0 &&
    city2.longitude !== 0
  ) {
    const distanceKm = haversineKm(
      { lat: city1.latitude, lon: city1.longitude },
      { lat: city2.latitude, lon: city2.longitude }
    );
    
    // Si très proches (< 1km), c'est probablement un doublon
    // Si éloignées (> 1km), ce sont des entités différentes (ex: "Komo" vs "Haut-Komo")
    return distanceKm <= maxDistanceKm;
  }
  
  // Si pas de coordonnées valides, on considère comme doublon si nom et province identiques
  // (cas où les coordonnées sont manquantes/à 0)
  return true;
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

function buildOsmCanonicalCities(osm) {
  // Reproduit les sources utilisées dans import-locations.js (cities)
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

  // On calcule aussi provinceName (nearest province) pour matcher les anciens docs qui ont provinceName
  const provinceCenters = buildProvinceCenters(osm).map((p) => ({
    center: p.center,
    data: { name: p.name },
  }));

  const byKey = new Map(); // key = normCity|normProvince -> { id, name, provinceName }
  for (const c of raw) {
    const name = pickBestName(c);
    const center = pickCenter(c);
    const id = generateCityId(name, center.lon, center.lat);

    const nearestProv = nearestByCenter(center, provinceCenters);
    const provinceName = nearestProv?.item?.data?.name;

    const key = `${normalizeName(name)}|${normalizeName(provinceName || "")}`;
    // En cas de collisions (rare), on garde le 1er (stable)
    if (!byKey.has(key)) {
      byKey.set(key, { id, name, provinceName: provinceName || null });
    }
  }

  return byKey;
}

async function getStreetRefCount({ db, cityId }) {
  const snap = await db.collection("streets").where("cityId", "==", cityId).get();
  return snap.size;
}

async function updateStreetRefs({ db, oldCityId, newCityId, newCityName, dryRun }) {
  const snap = await db.collection("streets").where("cityId", "==", oldCityId).get();
  if (snap.empty) return { updated: 0 };
  if (dryRun) return { updated: snap.size };

  let updated = 0;
  const CHUNK = 450;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = db.batch();
    const slice = docs.slice(i, i + CHUNK);
    for (const doc of slice) {
      batch.update(doc.ref, {
        cityId: newCityId,
        cityName: newCityName,
        updatedAt: new Date(),
      });
      updated++;
    }
    await batch.commit();
  }
  return { updated };
}

async function deleteCity({ db, id, dryRun }) {
  if (dryRun) return;
  await db.collection("cities").doc(id).delete();
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
  const canonicalByKey = buildOsmCanonicalCities(osm);

  console.log("🔎 Déduplication cities");
  console.log(`- mode: ${dryRun ? "DRY-RUN" : "APPLY"}`);

  const snap = await db.collection("cities").get();
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Grouper par (name normalisé pour matching + provinceName) pour éviter collisions inter-province
  // Utilise normalizeCityNameForMatching au lieu de normalizeName pour détecter "Commune de Kango" = "Kango"
  const groups = new Map(); // key => array
  for (const c of docs) {
    const normName = normalizeCityNameForMatching(c.name || "");
    const normProvince = normalizeName(c.provinceName || "");
    const key = `${normName}|${normProvince}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  
  // Filtrer les groupes pour ne garder que ceux qui sont vraiment des doublons
  // (même nom normalisé ET même province ET coordonnées proches OU coordonnées manquantes)
  const duplicateGroups = new Map();
  for (const [key, items] of groups.entries()) {
    if (items.length <= 1) continue;
    
    // Vérifier si le groupe contient un canon OSM
    const canonical = canonicalByKey.get(key);
    const hasCanonInGroup = canonical && items.some(item => item.id === canonical.id);
    
    if (hasCanonInGroup) {
      // Si on a un canon OSM dans le groupe, on garde tous les items du groupe
      // (ils seront dédupliqués en gardant le canon)
      duplicateGroups.set(key, items);
    } else {
      // Sinon, vérifier que tous les items du groupe sont des doublons géographiques
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
  }

  let dupGroups = 0;
  let deleted = 0;
  let streetUpdates = 0;

  for (const [key, items] of duplicateGroups.entries()) {
    if (items.length <= 1) continue;

    const canonical = canonicalByKey.get(key);
    
    // Déterminer quelle ville garder
    let keep;
    if (canonical) {
      // Priorité 1: Garder l'ID canonique OSM si présent
      keep = items.find((x) => x.id === canonical.id);
      if (!keep) {
        // Si le canon OSM n'existe pas dans Firestore, on garde la première (la plus ancienne?)
        // Ou on skip ce groupe pour éviter de supprimer des données importantes
        console.log(`⚠️  Canon OSM "${canonical.name}" (${canonical.id}) non trouvé dans Firestore pour le groupe "${key}"`);
        continue;
      }
    } else {
      // Pas de canon OSM: garder la première ville du groupe (arbitraire mais stable)
      // En production, on pourrait préférer celle avec le plus de streets référencées
      keep = items[0];
    }

    const toDelete = items.filter((x) => x.id !== keep.id);
    if (toDelete.length === 0) continue;

    dupGroups++;
    console.log(`\n### ${canonical.name} (${canonical.provinceName || "province?"})`);
    console.log(`- keep: ${keep.id}`);
    console.log(`- delete: ${toDelete.map((d) => d.id).join(", ")}`);

    for (const del of toDelete) {
      const refs = await getStreetRefCount({ db, cityId: del.id });
      console.log(`  - refs streets for ${del.id}: ${refs}`);
      const u = await updateStreetRefs({
        db,
        oldCityId: del.id,
        newCityId: keep.id,
        newCityName: canonical.name,
        dryRun,
      });
      streetUpdates += u.updated;
      await deleteCity({ db, id: del.id, dryRun });
      deleted++;
    }
  }

  console.log("\n📊 Résumé");
  console.log(`- groupes doublons traités: ${dupGroups}`);
  console.log(`- cities supprimées: ${deleted}`);
  console.log(`- street refs mises à jour: ${streetUpdates}`);
  console.log(`- mode: ${dryRun ? "DRY-RUN" : "APPLY"}`);
}

run().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});


