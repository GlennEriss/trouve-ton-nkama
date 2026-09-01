/**
 * One-shot backfill : supprime `currentPromotion.endDate` sur toutes les annonces dont la
 * promotion est déjà marquée inactive (`currentPromotion.isActive === false`) mais dont
 * `endDate` traîne encore en base.
 *
 * Bug réel (voir functions/src/promotions/expire-promotions.policy.ts, `buildExpiryUpdate`) :
 * la fonction planifiée qui expire les promotions (featured/trending) ne faisait passer
 * `isActive` à `false` que côté écriture, sans jamais toucher `endDate`. Or l'index Algolia a
 * pour customRanking `["desc(currentPromotion.endDate)", "desc(sortTimestamp)"]`, qui ne lit
 * jamais `isActive` — une promotion expirée depuis des mois continuait donc de classer son
 * annonce en tête de /search, devant des annonces bien plus récentes jamais promues. Corrigé
 * structurellement dans `buildExpiryUpdate()` pour toute FUTURE expiration ; ce script nettoie
 * les documents DÉJÀ dans cet état corrompu (constaté en prod le 2026-09-01 : 58 des 100
 * premiers résultats de /search étaient d'anciennes promotions expirées, certaines remontant à
 * avril 2025).
 *
 * Chaque écriture ici est un vrai document Firestore modifié, ce qui déclenche naturellement la
 * resynchronisation Algolia (extension firestore-algolia-search) pour ce document — pas besoin
 * d'un FORCE_DATA_SYNC séparé.
 *
 * Volontairement restreint à `isActive === false` (jamais aux promotions actuellement actives,
 * ni au type `boost`, qui n'a pas de fenêtre "active" à expirer par conception — voir
 * `needsPromotionExpiry` — et reste hors du périmètre de cette correction).
 *
 * Idempotent : relancer après --apply ne trouve plus rien à faire (skip les documents qui n'ont
 * déjà plus `currentPromotion.endDate`).
 *
 * Usage :
 *   tsx scripts/promotions/backfill-clear-expired-promotion-enddate.ts [--env-file=.env.local] [--apply]
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

  const snapshot = await db
    .collection(COLLECTIONS.properties)
    .where("currentPromotion.isActive", "==", false)
    .get();

  const stale = snapshot.docs.filter((doc) => doc.data().currentPromotion?.endDate);

  console.log(`Projet   : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Mode     : ${options.apply ? "APPLY" : "DRY-RUN"}`);
  console.log(
    `Annonces : ${snapshot.size} avec une promotion inactive, ${stale.length} avec un endDate encore présent\n`,
  );

  if (stale.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  if (!options.apply) {
    for (const doc of stale.slice(0, 10)) {
      const promotion = doc.data().currentPromotion;
      const endDate = promotion?.endDate?.toDate?.()?.toISOString() ?? "forme brute";
      console.log(`  - ${doc.id} <- type=${promotion?.type} endDate=${endDate}`);
    }
    if (stale.length > 10) console.log(`  ... et ${stale.length - 10} autre(s)`);
    console.log("\nDry-run : aucune écriture. Relancer avec --apply.");
    return;
  }

  let applied = 0;

  for (let start = 0; start < stale.length; start += BATCH_SIZE) {
    const chunk = stale.slice(start, start + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      batch.update(doc.ref, { "currentPromotion.endDate": FieldValue.delete() });
    }

    await batch.commit();
    applied += chunk.length;
    console.log(`  ${applied}/${stale.length} annonces traitées...`);
  }

  console.log(`\n${applied} annonce(s) mise(s) à jour.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
