/* eslint-disable no-console */
/**
 * Import OSM Gabon -> Firestore
 *
 * Usage:
 *   node scripts/openstreetmap/import-locations.js --dry-run
 *   node scripts/openstreetmap/import-locations.js --only provinces
 *   node scripts/openstreetmap/import-locations.js --only cities --limit 50
 *   node scripts/openstreetmap/import-locations.js --only streets
 *
 * Pré-requis:
 *   - Un .env valide (même format que scripts/firebase/.env)
 */

const { initFirestoreAdmin } = require("./firestore-admin");
const { loadGabonOsmJson, pickBestName, pickCenter } = require("./osm-loader");
const {
  generateProvinceId,
  generateCityId,
  generateStreetId,
} = require("./id-generator");
const { nearestByCenter } = require("./geo");

const COLLECTIONS = {
  provinces: "provinces",
  cities: "cities",
  streets: "streets",
};

function parseArgs(argv) {
  const args = {
    dryRun: false,
    only: null,
    limit: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--only") args.only = argv[++i] || null;
    else if (a === "--limit") args.limit = Number(argv[++i] || 0) || null;
  }
  return args;
}

function cleanUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// Gabon: 9 provinces officielles (whitelist) + alias connus dans le dump OSM
function canonicalProvinceName(rawName) {
  const s = String(rawName || "").trim();
  const lower = s.toLowerCase();

  // Alias observé dans gabon_osm.json
  if (lower === "nyanga (gabon)") return "Nyanga";

  // Retirer un suffixe "(Gabon)" générique si présent
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

async function upsertBatchById({ db, collectionName, rows, dryRun }) {
  let createdOrUpdated = 0;
  let skipped = 0;

  // Firestore batch limit: 500 operations
  const CHUNK = 450; // marge
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);

    if (dryRun) {
      createdOrUpdated += slice.length;
      continue;
    }

    const batch = db.batch();
    for (const row of slice) {
      const ref = db.collection(collectionName).doc(row.id);
      // merge=true => anti-doublon par ID et update soft
      batch.set(ref, row.data, { merge: true });
      createdOrUpdated++;
    }
    await batch.commit();
  }

  return { createdOrUpdated, skipped };
}

function buildProvinceRows(osm) {
  const provinces = (osm.admin_boundaries && osm.admin_boundaries["4"]) || [];
  const country = osm.country?.name || "Gabon";
  const countryCode = osm.country?.iso2 || "GA";

  return provinces
    .map((p) => {
      const rawName = pickBestName(p);
      const name = canonicalProvinceName(rawName);

      // On garde uniquement les 9 provinces officielles dans la collection provinces.
      // Les éventuels admin_level=4 hors-liste seront importés dans cities (pour "0 perte").
      if (!GABON_PROVINCES.has(name)) return null;

      const center = pickCenter(p);
      const lon = center.lon;
      const lat = center.lat;
      const id = generateProvinceId(name, lon, lat);

      return {
        id,
        center,
        data: cleanUndefined({
          name,
          country,
          countryCode,
          latitude: lat,
          longitude: lon,
        }),
      };
    });
}

function buildCityRows(osm, provincesByCenter) {
  const country = osm.country?.name || "Gabon";
  const countryCode = osm.country?.iso2 || "GA";

  const fromPlaces = []
    .concat(osm.places?.city || [])
    .concat(osm.places?.town || []);
  const fromAdmin6 = (osm.admin_boundaries && osm.admin_boundaries["6"]) || [];
  const fromAdmin8 = (osm.admin_boundaries && osm.admin_boundaries["8"]) || [];

  // Tout admin_level=4 hors-whitelist -> cities (ex: "Litoral" dans ce dump)
  const fromAdmin4All = (osm.admin_boundaries && osm.admin_boundaries["4"]) || [];
  const fromAdmin4NonProvince = fromAdmin4All.filter((p) => {
    const rawName = pickBestName(p);
    const name = canonicalProvinceName(rawName);
    return !GABON_PROVINCES.has(name);
  });

  const raw = fromPlaces
    .concat(fromAdmin6)
    .concat(fromAdmin8)
    .concat(fromAdmin4NonProvince);

  return raw
    .map((c) => {
      const name = pickBestName(c);
      const center = pickCenter(c);
      const lon = center.lon;
      const lat = center.lat;
      const id = generateCityId(name, lon, lat);

      const nearestProvince = nearestByCenter(center, provincesByCenter);
      const provinceName = nearestProvince?.item?.data?.name;
      const provinceId = nearestProvince?.item?.id;

      return {
        id,
        center,
        data: cleanUndefined({
          name,
          provinceId: provinceId || undefined,
          provinceName: provinceName || undefined,
          country,
          countryCode,
          latitude: lat,
          longitude: lon,
        }),
      };
    });
}

function buildStreetRows(osm, provincesByCenter, citiesByCenter) {
  const country = osm.country?.name || "Gabon";
  const countryCode = osm.country?.iso2 || "GA";

  const quarters = []
    .concat(osm.places?.suburb || [])
    .concat(osm.places?.neighbourhood || [])
    .concat(osm.places?.quarter || []);

  const rural = []
    .concat(osm.places?.village || [])
    .concat(osm.places?.hamlet || [])
    .concat(osm.places?.locality || []);

  const adminFine = []
    .concat((osm.admin_boundaries && osm.admin_boundaries["9"]) || [])
    .concat((osm.admin_boundaries && osm.admin_boundaries["10"]) || []);

  const raw = quarters.concat(rural).concat(adminFine);

  return raw
    .map((s) => {
      const name = pickBestName(s);
      const center = pickCenter(s);
      const lon = center.lon;
      const lat = center.lat;
      const id = generateStreetId(name, lon, lat);

      const nearestProvince = nearestByCenter(center, provincesByCenter);
      const provinceName = nearestProvince?.item?.data?.name;
      const provinceId = nearestProvince?.item?.id;

      // Rattachement ville via nearest neighbor + seuil
      const nearestCity = nearestByCenter(center, citiesByCenter);
      const isQuarterLike =
        ["suburb", "neighbourhood", "quarter"].includes(s.tags?.place) ||
        s.tags?.admin_level === "9" ||
        s.tags?.admin_level === "10";
      const thresholdKm = isQuarterLike ? 35 : 80;

      const cityOk = nearestCity && nearestCity.distanceKm <= thresholdKm;
      const cityName = cityOk ? nearestCity.item.data.name : undefined;
      const cityId = cityOk ? nearestCity.item.id : undefined;

      return {
        id,
        center,
        data: cleanUndefined({
          name,
          cityId,
          cityName,
          provinceId: provinceId || undefined,
          provinceName: provinceName || undefined,
          country,
          countryCode,
          latitude: lat,
          longitude: lon,
        }),
      };
    });
}

function countInput(osm) {
  const admin = osm.admin_boundaries || {};
  const places = osm.places || {};

  const adminTotal = Object.values(admin).reduce((sum, arr) => sum + (arr?.length || 0), 0);
  const placesTotal = Object.values(places).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return { adminTotal, placesTotal, total: adminTotal + placesTotal };
}

async function run() {
  const args = parseArgs(process.argv);
  const only = args.only; // null => tout

  const osm = loadGabonOsmJson();
  const totals = countInput(osm);
  const { db } = initFirestoreAdmin();

  console.log("🔎 Import OSM -> Firestore");
  console.log(`- dryRun: ${args.dryRun ? "OUI" : "NON"}`);
  console.log(`- only: ${only || "ALL"}`);
  console.log(`- limit: ${args.limit || "NONE"}`);
  console.log(`- input_total(admin+places): ${totals.total} (admin=${totals.adminTotal}, places=${totals.placesTotal})`);

  // 1) Provinces
  const provinceRows = buildProvinceRows(osm).filter(Boolean);
  const provincesByCenter = provinceRows.map((p) => ({
    id: p.id,
    center: p.center,
    data: p.data,
  }));

  // 2) Cities (communes)
  const cityRows = buildCityRows(osm, provincesByCenter);
  const citiesByCenter = cityRows.map((c) => ({
    id: c.id,
    center: c.center,
    data: c.data,
  }));

  // 3) Streets
  const streetRows = buildStreetRows(osm, provincesByCenter, citiesByCenter);

  const applyLimit = (rows) => (args.limit ? rows.slice(0, args.limit) : rows);

  if (!only || only === "provinces") {
    const rows = applyLimit(provinceRows).map((r) => ({ id: r.id, data: r.data }));
    console.log(`\n### Provinces: ${rows.length}`);
    const res = await upsertBatchById({
      db,
      collectionName: COLLECTIONS.provinces,
      rows,
      dryRun: args.dryRun,
    });
    console.log(`✅ upsert provinces: ${res.createdOrUpdated}`);
  }

  if (!only || only === "cities") {
    const rows = applyLimit(cityRows).map((r) => ({ id: r.id, data: r.data }));
    console.log(`\n### Cities: ${rows.length}`);
    const res = await upsertBatchById({
      db,
      collectionName: COLLECTIONS.cities,
      rows,
      dryRun: args.dryRun,
    });
    console.log(`✅ upsert cities: ${res.createdOrUpdated}`);
  }

  if (!only || only === "streets") {
    const rows = applyLimit(streetRows).map((r) => ({ id: r.id, data: r.data }));
    console.log(`\n### Streets: ${rows.length}`);
    const res = await upsertBatchById({
      db,
      collectionName: COLLECTIONS.streets,
      rows,
      dryRun: args.dryRun,
    });
    console.log(`✅ upsert streets: ${res.createdOrUpdated}`);
  }

  console.log("\n🎉 Import terminé");
}

run().catch((e) => {
  console.error("❌ Erreur fatale:", e);
  process.exit(1);
});


