/* eslint-disable no-console */

/**
 * Ajoute Libreville et Franceville aux 17 annonces du lot Emilie Shop.
 *
 * Usage :
 *   node scripts/update-emilie-shop-listing-locations.js          # dry-run
 *   node scripts/update-emilie-shop-listing-locations.js --apply  # mise à jour atomique
 */

const path = require("node:path");

const APPLY = process.argv.includes("--apply");
const PROD_PROJECT_ID = "location-maison-prod-167da";
const EXPECTED_OWNER_UID = "iQkPn0iqvTcOodEfejkqFhW6DRE2";
const EXPECTED_IMPORT_SOURCE = "emilie-shop-batch-2026-09-18";
const LISTING_IDS = Array.from(
  { length: 17 },
  (_, index) => `emilie-shop-20260918-${String(index + 1).padStart(2, "0")}`,
);

const ZONES = [
  { city: "Libreville", province: "Estuaire", latitude: 0.4162, longitude: 9.4673 },
  { city: "Franceville", province: "Haut-Ogooué", latitude: -1.6332, longitude: 13.5833 },
];

function sameZones(current) {
  return JSON.stringify(current || []) === JSON.stringify(ZONES);
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet Firebase « ${process.env.FIREBASE_PROJECT_ID} », attendu « ${PROD_PROJECT_ID} ».`);
  }

  console.log(`Projet cible : ${PROD_PROJECT_ID}`);
  console.log(APPLY ? "Mode : APPLY (écriture production)" : "Mode : DRY-RUN (aucune écriture)");
  console.log(`Zones attendues : ${ZONES.map((zone) => `${zone.city} (${zone.province})`).join(" + ")}`);

  const snapshots = await db.getAll(...LISTING_IDS.map((id) => db.collection("properties").doc(id)));
  const missing = snapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
  if (missing.length) throw new Error(`Annonces manquantes : ${missing.join(", ")}`);

  const invalid = snapshots.filter((snapshot) => {
    const data = snapshot.data();
    return data.createdBy !== EXPECTED_OWNER_UID || data.importSource !== EXPECTED_IMPORT_SOURCE;
  });
  if (invalid.length) {
    throw new Error(`Sécurité : propriétaire ou source inattendu(e) pour ${invalid.map((snapshot) => snapshot.id).join(", ")}`);
  }

  const pending = snapshots.filter((snapshot) => {
    const data = snapshot.data();
    return !sameZones(data.zones) ||
      JSON.stringify(data.cities || []) !== JSON.stringify(ZONES.map((zone) => zone.city)) ||
      JSON.stringify(data.provinces || []) !== JSON.stringify(["Estuaire", "Haut-Ogooué"]);
  });

  for (const snapshot of snapshots) {
    const data = snapshot.data();
    console.log(`- ${snapshot.id} : ${sameZones(data.zones) ? "déjà à jour" : "à mettre à jour"}`);
  }
  console.log(`Bilan : ${pending.length} à mettre à jour, ${snapshots.length - pending.length} déjà à jour.`);

  if (!APPLY) {
    console.log("Dry-run terminé : aucune donnée n’a été modifiée.");
    return;
  }
  if (pending.length === 0) {
    console.log("Aucune écriture nécessaire.");
    return;
  }

  const batch = db.batch();
  for (const snapshot of pending) {
    batch.update(snapshot.ref, {
      zones: ZONES,
      cities: ZONES.map((zone) => zone.city),
      provinces: [...new Set(ZONES.map((zone) => zone.province))],
      city: ZONES[0].city,
      province: ZONES[0].province,
      latitude: ZONES[0].latitude,
      longitude: ZONES[0].longitude,
      isLocExact: false,
      locationSource: "UNVERIFIED",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`Mise à jour atomique terminée : ${pending.length} annonce(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
