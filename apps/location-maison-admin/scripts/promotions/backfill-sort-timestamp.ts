/**
 * One-shot backfill : pose `sortTimestamp = createdAt` sur toutes les annonces qui en sont
 * dépourvues (créées avant l'introduction du trigger onPropertyCreateDefaultSortTimestamp).
 *
 * `sortTimestamp` pilote désormais le classement Algolia (customRanking) et le tri par défaut
 * de /api/announcer/ads : sans ce champ, une annonce ancienne se classerait tout en bas, sous
 * n'importe quelle annonce en ayant une — même une annonce plus vieille qu'elle.
 *
 * Chaque écriture ici est un vrai document Firestore modifié, ce qui déclenche naturellement
 * la resynchronisation Algolia (extension firestore-algolia-search) pour ce document — c'est
 * voulu : c'est ce qui fait remonter `isPromoted`/`currentPromotion`/`sortTimestamp` dans
 * l'index de recherche sans avoir besoin d'un FORCE_DATA_SYNC séparé. À lancer UNE FOIS ces
 * champs ajoutés à FIELDS dans extensions/firestore-algolia-search.env et l'extension
 * redéployée — sinon les écritures partent avant que l'extension ne sache les synchroniser.
 *
 * Idempotent : relancer après --apply ne trouve plus rien à faire (skip les documents qui ont
 * déjà `sortTimestamp`).
 *
 * Usage :
 *   tsx scripts/promotions/backfill-sort-timestamp.ts [--env-file=.env.local] [--apply]
 * Dry-run par défaut ; --apply pour écrire.
 */
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

type CliOptions = {
  envFile: string;
  apply: boolean;
};

function parseCliArgs(argv: string[]): CliOptions {
  const envFileArg = argv.find((value) => value.startsWith("--env-file="));
  return {
    envFile: envFileArg ? envFileArg.slice("--env-file=".length).trim() : ".env.local",
    apply: argv.includes("--apply"),
  };
}

const BATCH_SIZE = 400; // marge sous la limite Firestore de 500 écritures/batch.

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  process.loadEnvFile(options.envFile);

  const { getFirebaseAdminDb } = await import("@/lib/firebase/firebase-admin");
  const { FieldValue } = await import("firebase-admin/firestore");
  const db = getFirebaseAdminDb();

  const snapshot = await db.collection(COLLECTIONS.properties).get();

  const missing = snapshot.docs.filter((doc) => !doc.data().sortTimestamp);

  console.log(`Projet   : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Mode     : ${options.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Annonces : ${snapshot.size} au total, ${missing.length} sans sortTimestamp\n`);

  if (missing.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  if (!options.apply) {
    for (const doc of missing.slice(0, 10)) {
      const createdAt = doc.data().createdAt;
      console.log(`  + ${doc.id} <- createdAt=${createdAt?.toDate?.()?.toISOString() ?? "absent"}`);
    }
    if (missing.length > 10) console.log(`  ... et ${missing.length - 10} autre(s)`);
    console.log("\nDry-run : aucune écriture. Relancer avec --apply.");
    return;
  }

  let applied = 0;
  let fallbackToNow = 0;

  for (let start = 0; start < missing.length; start += BATCH_SIZE) {
    const chunk = missing.slice(start, start + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      const createdAt = doc.data().createdAt;
      if (!createdAt) fallbackToNow += 1;
      batch.update(doc.ref, { sortTimestamp: createdAt ?? FieldValue.serverTimestamp() });
    }

    await batch.commit();
    applied += chunk.length;
    console.log(`  ${applied}/${missing.length} annonces traitées...`);
  }

  console.log(`\n${applied} annonce(s) mise(s) à jour.`);
  if (fallbackToNow > 0) {
    console.log(`${fallbackToNow} sans createdAt exploitable, sortTimestamp posé à maintenant.`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
