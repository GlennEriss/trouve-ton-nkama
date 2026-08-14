/* eslint-disable no-console */

/**
 * Migration one-shot (Lot 1, voir docs/marketplace-multi-categories/07-lots-et-sequencement.md) :
 * remplit categoryId/categoryPath/attributes sur toutes les annonces (properties) existantes,
 * à partir de leur `typeProperty` actuel. N'touche PAS à typeProperty/area/status/tags, qui
 * restent la source de vérité immobilière (voir docs/marketplace-multi-categories/
 * 00-le-vrai-probleme.md).
 *
 * Prérequis : avoir exécuté `npm run categories:seed:dev` (ou :prod) dans
 * apps/location-maison-admin AVANT de lancer ce script, pour que la catégorie racine
 * "immobilier" et ses 12 feuilles existent dans `listing_categories`.
 *
 * Idempotent (ignore les docs qui ont déjà categoryId) — rejouable sans risque.
 *
 * Usage:
 *   node scripts/backfill-listing-categories.js              # dry-run (par défaut)
 *   node scripts/backfill-listing-categories.js --apply       # exécution réelle
 */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");

const PAGE_SIZE = 500;
const BATCH_SIZE = 500;
const APPLY = process.argv.includes("--apply");

// Valeurs stockées dans `Property.typeProperty` (les clés PascalCase de
// TypePropertyKey, ex. "Home", "Villa" — pas les valeurs lowercase de
// TypePropertyEnum) -> slug de catégorie feuille seedé sous "immobilier". Ce sont
// justement les valeurs lowercase de TypePropertyEnum (packages/core/src/domain/
// property-type.ts), donc cette table EST TypePropertyEnum recopiée telle quelle.
// "Property" et "Logement" sont des clés historiques sans libellé actif : volontairement
// absentes, les annonces qui les portent remontent en "non mappées" plutôt que d'être
// rattachées à une catégorie devinée.
const TYPE_PROPERTY_TO_CATEGORY_SLUG = {
  Home: "home",
  Studio: "studio",
  Apartment: "apartment",
  Desk: "desk",
  Building: "building",
  Shop: "shop",
  Kiosk: "kiosk",
  Room: "room",
  Villa: "villa",
  Land: "land",
  Duplex: "duplex",
  Warehouse: "warehouse",
};

async function loadImmobilierCategories(db) {
  const snapshot = await db.collection("listing_categories").get();
  const byId = new Map();
  for (const doc of snapshot.docs) {
    byId.set(doc.id, doc.data());
  }

  const root = byId.get("immobilier");
  if (!root) {
    throw new Error(
      'Catégorie racine "immobilier" introuvable dans listing_categories. Lance ' +
        "`npm run categories:seed:dev` dans apps/location-maison-admin avant ce script.",
    );
  }

  return { byId, rootName: root.name || "Immobilier" };
}

async function main() {
  const { db } = initFirestoreAdmin();
  const { byId: categoriesById, rootName } = await loadImmobilierCategories(db);
  const collectionRef = db.collection("properties");

  let scanned = 0;
  let alreadyMigrated = 0;
  let toUpdate = 0;
  let updated = 0;
  const unmappedTypeProperty = new Map();
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

      if (data.categoryId !== undefined) {
        alreadyMigrated += 1;
        continue;
      }

      const slug = TYPE_PROPERTY_TO_CATEGORY_SLUG[data.typeProperty];
      const leaf = slug ? categoriesById.get(slug) : undefined;

      if (!leaf) {
        const key = String(data.typeProperty ?? "(absent)");
        unmappedTypeProperty.set(key, (unmappedTypeProperty.get(key) ?? 0) + 1);
        continue;
      }

      toUpdate += 1;
      if (APPLY) {
        batch.update(doc.ref, {
          categoryId: slug,
          categoryPath: { lvl0: rootName, lvl1: `${rootName} > ${leaf.name}` },
          attributes: {},
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
  console.log(`Déjà migrés (categoryId présent): ${alreadyMigrated}`);
  console.log(`À migrer (typeProperty reconnu): ${toUpdate}`);
  if (unmappedTypeProperty.size > 0) {
    console.log("typeProperty non reconnus (annonce non touchée) :");
    for (const [value, count] of unmappedTypeProperty.entries()) {
      console.log(`  - ${value}: ${count}`);
    }
  }
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
