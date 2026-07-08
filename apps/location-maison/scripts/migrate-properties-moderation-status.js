/* eslint-disable no-console */

/**
 * Migration one-shot : passe moderationStatus='APPROVED' sur toutes les annonces
 * (properties) déjà en base qui n'ont pas encore ce champ, pour ne pas vider le
 * catalogue public au déploiement du système de modération.
 *
 * Idempotent (ignore les docs déjà migrés) — rejouable sans risque.
 *
 * Usage:
 *   node scripts/migrate-properties-moderation-status.js              # dry-run (par défaut)
 *   node scripts/migrate-properties-moderation-status.js --apply      # exécution réelle
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
  const { admin, db } = initFirestoreAdmin();
  const collectionRef = db.collection("properties");

  let scanned = 0;
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

      if (data.moderationStatus === undefined) {
        toUpdate += 1;
        if (APPLY) {
          batch.update(doc.ref, { moderationStatus: "APPROVED" });
          batchCount += 1;
          updated += 1;

          if (batchCount >= BATCH_SIZE) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
          }
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
  console.log(`Documents sans moderationStatus: ${toUpdate}`);
  console.log(APPLY ? `Documents mis à jour: ${updated}` : "Dry-run: aucune écriture effectuée. Relancer avec --apply pour appliquer.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
