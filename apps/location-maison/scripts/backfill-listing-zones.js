/* eslint-disable no-console */

/**
 * Migration one-shot OPTIONNELLE (voir docs/marketplace-multi-categories/
 * 08-zones-multiples-mode.md §7) : pour chaque annonce hors immobilier (categoryId présent,
 * pas de typeProperty) sans `zones`, écrit `zones: [{city, province, latitude, longitude}]`
 * + `cities`/`provinces` dénormalisés à partir des champs `city`/`province`/`latitude`/
 * `longitude` singuliers déjà présents — SANS changer leur contenu, juste sa forme.
 *
 * PAS OBLIGATOIRE : sans ce script, une annonce Mode existante s'affiche exactement comme
 * avant (voir getListingZones(), src/lib/listing-zones.ts, qui replie automatiquement sur
 * city/province quand zones est absent). Ce script sert uniquement à la rendre trouvable
 * via une recherche filtrée sur une ville (`cities`, facette Algolia) SANS attendre que le
 * vendeur la réédite une fois. N'touche PAS à l'immobilier (typeProperty présent, jamais de
 * zones).
 *
 * Idempotent (ignore les docs qui ont déjà `zones`) — rejouable sans risque.
 *
 * Usage:
 *   node scripts/backfill-listing-zones.js              # dry-run (par défaut)
 *   node scripts/backfill-listing-zones.js --apply       # exécution réelle
 */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");

const PAGE_SIZE = 500;
const BATCH_SIZE = 500;
const APPLY = process.argv.includes("--apply");

async function main() {
  const { db } = initFirestoreAdmin();
  const collectionRef = db.collection("properties");

  let scanned = 0;
  let alreadyMigrated = 0;
  let skippedImmobilier = 0;
  let skippedNoCity = 0;
  let toUpdate = 0;
  let updated = 0;
  let lastDoc = null;
  let batch = db.batch();
  let batchCount = 0;

  console.log(APPLY ? "Mode: APPLY (écriture réelle)" : "Mode: DRY-RUN (aucune écriture)");

  while (true) {
    let query = collectionRef.orderBy("__name__").limit(PAGE_SIZE);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      scanned += 1;
      const data = doc.data();

      // Immobilier : locationPrecision "exact", toujours une zone unique — jamais de champ
      // `zones`, aucun rôle pour ce script.
      if (data.typeProperty) {
        skippedImmobilier += 1;
        continue;
      }

      if (data.zones !== undefined) {
        alreadyMigrated += 1;
        continue;
      }

      const city = typeof data.city === "string" ? data.city.trim() : "";
      if (!city) {
        skippedNoCity += 1;
        continue;
      }

      const zone = {
        city,
        province: typeof data.province === "string" ? data.province : "",
        latitude: typeof data.latitude === "number" ? data.latitude : 0,
        longitude: typeof data.longitude === "number" ? data.longitude : 0,
      };

      toUpdate += 1;
      if (APPLY) {
        batch.update(doc.ref, {
          zones: [zone],
          cities: [zone.city],
          provinces: zone.province ? [zone.province] : [],
        });
        batchCount += 1;
        updated += 1;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.docs.length < PAGE_SIZE) break;
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
  }

  console.log(`Documents scannés: ${scanned}`);
  console.log(`Immobilier (ignorés, jamais de zones): ${skippedImmobilier}`);
  console.log(`Déjà migrés (zones présent): ${alreadyMigrated}`);
  console.log(`Sans ville (ignorés, rien à migrer): ${skippedNoCity}`);
  console.log(`À migrer: ${toUpdate}`);
  console.log(
    APPLY
      ? `Documents mis à jour: ${updated}`
      : "Dry-run: aucune écriture effectuée. Relancer avec --apply pour appliquer.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
