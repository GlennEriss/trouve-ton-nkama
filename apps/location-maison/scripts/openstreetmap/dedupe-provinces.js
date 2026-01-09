/* eslint-disable no-console */
/**
 * Déduplication des provinces par nom (Gabon)
 *
 * Problème: l'ID = name+lon+lat => si une province existait déjà avec d'autres coords,
 * on se retrouve avec 2 docs (ex: estuaire_9.47972_0.37722 vs estuaire_9.89183_0.27080).
 *
 * Objectif:
 * - Garder la version "canonique" issue d'OSM (admin_level=4)
 * - Mettre à jour toutes les références (cities.provinceId, streets.provinceId) vers l'ID canonique
 * - Supprimer les provinces en doublon
 *
 * Usage:
 *   node scripts/openstreetmap/dedupe-provinces.js --dry-run
 *   node scripts/openstreetmap/dedupe-provinces.js --apply
 */

const path = require("node:path");
const fs = require("node:fs");
const { initFirestoreAdmin } = require("./firestore-admin");
const { generateProvinceId, normalizeName } = require("./id-generator");

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

const GABON_PROVINCES = [
  "Estuaire",
  "Haut-Ogooué",
  "Moyen-Ogooué",
  "Ngounié",
  "Nyanga",
  "Ogooué-Ivindo",
  "Ogooué-Lolo",
  "Ogooué-Maritime",
  "Woleu-Ntem",
];

function loadOsmCanonicalProvinceIds() {
  const osmPath = path.join(__dirname, "gabon_osm.json");
  const raw = fs.readFileSync(osmPath, "utf8");
  const osm = JSON.parse(raw);

  const admin4 = (osm.admin_boundaries && osm.admin_boundaries["4"]) || [];
  const map = new Map(); // normalizedName -> { name, id, lon, lat }

  for (const p of admin4) {
    const rawName = p?.names?.fr || p?.name || "";
    const name = canonicalProvinceName(rawName);
    if (!GABON_PROVINCES.includes(name)) continue;
    const center = p?.center;
    if (!center) continue;
    const id = generateProvinceId(name, center.lon, center.lat);
    map.set(normalizeName(name), { name, id, lon: center.lon, lat: center.lat });
  }

  return map;
}

async function countRefs({ db, collectionName, oldId }) {
  const snap = await db.collection(collectionName).where("provinceId", "==", oldId).get();
  return snap.size;
}

async function updateRefs({ db, collectionName, oldId, newId, newName, dryRun }) {
  const snap = await db.collection(collectionName).where("provinceId", "==", oldId).get();
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
        provinceId: newId,
        provinceName: newName,
        updatedAt: new Date(),
      });
      updated++;
    }
    await batch.commit();
  }

  return { updated };
}

async function deleteDoc({ db, collectionName, id, dryRun }) {
  if (dryRun) return;
  await db.collection(collectionName).doc(id).delete();
}

async function run() {
  const args = parseArgs(process.argv);
  if (!args.dryRun && !args.apply) {
    console.log("❌ Choisis --dry-run ou --apply");
    process.exit(1);
  }

  const dryRun = args.dryRun && !args.apply;
  const { db } = initFirestoreAdmin();

  const canonicalByNormName = loadOsmCanonicalProvinceIds();

  console.log("🔎 Déduplication provinces");
  console.log(`- mode: ${dryRun ? "DRY-RUN" : "APPLY"}`);

  // Charger toutes les provinces existantes
  const provSnap = await db.collection("provinces").get();
  const provinces = provSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Grouper par nom normalisé
  const groups = new Map(); // normName -> array
  for (const p of provinces) {
    const name = canonicalProvinceName(p.name || "");
    const key = normalizeName(name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...p, _canonName: name });
  }

  let dupGroups = 0;
  let toDeleteCount = 0;
  let cityUpdates = 0;
  let streetUpdates = 0;

  for (const [normName, items] of groups.entries()) {
    if (items.length <= 1) continue;

    const canonical = canonicalByNormName.get(normName);
    if (!canonical) {
      console.log(`⚠️  Groupe doublon sans canon OSM: ${items[0]._canonName} (${items.length}) -> ignoré`);
      continue;
    }

    // Garder l'ID canonique OSM si présent, sinon garder le plus récent (fallback)
    let keep = items.find((x) => x.id === canonical.id);
    if (!keep) {
      // Fallback: garder celui dont le nom correspond le mieux (ou le 1er)
      keep = items[0];
      console.log(
        `⚠️  ID canonique OSM absent pour ${canonical.name}. On garde ${keep.id} et on ne supprime rien.`
      );
      continue;
    }

    const toDelete = items.filter((x) => x.id !== keep.id);
    if (toDelete.length === 0) continue;

    dupGroups++;
    console.log(`\n### ${canonical.name}`);
    console.log(`- keep: ${keep.id}`);
    console.log(`- delete: ${toDelete.map((d) => d.id).join(", ")}`);

    for (const del of toDelete) {
      const cRefs = await countRefs({ db, collectionName: "cities", oldId: del.id });
      const sRefs = await countRefs({ db, collectionName: "streets", oldId: del.id });
      console.log(`  - refs for ${del.id}: cities=${cRefs}, streets=${sRefs}`);

      const u1 = await updateRefs({
        db,
        collectionName: "cities",
        oldId: del.id,
        newId: keep.id,
        newName: canonical.name,
        dryRun,
      });
      const u2 = await updateRefs({
        db,
        collectionName: "streets",
        oldId: del.id,
        newId: keep.id,
        newName: canonical.name,
        dryRun,
      });
      cityUpdates += u1.updated;
      streetUpdates += u2.updated;

      await deleteDoc({ db, collectionName: "provinces", id: del.id, dryRun });
      toDeleteCount++;
    }
  }

  console.log("\n📊 Résumé");
  console.log(`- groupes doublons traités: ${dupGroups}`);
  console.log(`- provinces supprimées: ${toDeleteCount}`);
  console.log(`- city refs mises à jour: ${cityUpdates}`);
  console.log(`- street refs mises à jour: ${streetUpdates}`);
  console.log(`- mode: ${dryRun ? "DRY-RUN" : "APPLY"}`);
}

run().catch((e) => {
  console.error("❌ Erreur:", e);
  process.exit(1);
});


