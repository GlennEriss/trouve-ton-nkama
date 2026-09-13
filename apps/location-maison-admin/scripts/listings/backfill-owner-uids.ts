/**
 * Matérialise les propriétaires d'une annonce dans `ownerUids` afin de remplacer
 * l'union coûteuse des requêtes `createdBy` / `claimedBy` par un `array-contains`.
 *
 * Idempotent, paginé et dry-run par défaut. Le mode APPLY ne doit être utilisé
 * qu'après déploiement de la double écriture et sauvegarde Firestore.
 *
 * Usage :
 *   tsx scripts/listings/backfill-owner-uids.ts [--env-file=.env.local] [--apply]
 */
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

type CliOptions = { envFile: string; apply: boolean };

function parseCliArgs(argv: string[]): CliOptions {
  const envFileArg = argv.find((value) => value.startsWith("--env-file="));
  return {
    envFile: envFileArg ? envFileArg.slice("--env-file=".length).trim() : ".env.local",
    apply: argv.includes("--apply"),
  };
}

function normalizedOwnerUids(data: FirebaseFirestore.DocumentData): string[] {
  return [...new Set([data.createdBy, data.claimedBy]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim()))];
}

function sameStringSet(current: unknown, expected: string[]): boolean {
  if (!Array.isArray(current) || current.some((value) => typeof value !== "string")) return false;
  const normalized = [...new Set(current.map((value) => value.trim()).filter(Boolean))].sort();
  return normalized.length === expected.length && normalized.every((value, index) => value === [...expected].sort()[index]);
}

const PAGE_SIZE = 400;

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  process.loadEnvFile(options.envFile);

  const { getFirebaseAdminDb } = await import("@/lib/firebase/firebase-admin");
  const { FieldPath } = await import("firebase-admin/firestore");
  const db = getFirebaseAdminDb();
  const collection = db.collection(COLLECTIONS.properties);

  let cursor: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let scanned = 0;
  let changed = 0;
  let skippedWithoutOwner = 0;
  const examples: string[] = [];

  console.log(`Projet : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Mode   : ${options.apply ? "APPLY" : "DRY-RUN"}`);

  do {
    let query = collection.orderBy(FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = options.apply ? db.batch() : null;
    let batchWrites = 0;

    for (const doc of snapshot.docs) {
      scanned += 1;
      const data = doc.data();
      const expected = normalizedOwnerUids(data).sort();
      if (expected.length === 0) {
        skippedWithoutOwner += 1;
        continue;
      }
      if (sameStringSet(data.ownerUids, expected)) continue;

      changed += 1;
      if (examples.length < 10) examples.push(`${doc.id} <- [${expected.join(", ")}]`);
      if (batch) {
        batch.update(doc.ref, { ownerUids: expected });
        batchWrites += 1;
      }
    }

    if (batch && batchWrites > 0) await batch.commit();
    cursor = snapshot.docs.at(-1);
    console.log(`Parcourues : ${scanned}; à corriger : ${changed}`);
  } while (cursor);

  for (const example of examples) console.log(`  + ${example}`);
  console.log(`\n${scanned} annonce(s) parcourue(s), ${changed} ${options.apply ? "corrigée(s)" : "à corriger"}.`);
  if (skippedWithoutOwner > 0) console.log(`${skippedWithoutOwner} sans createdBy/claimedBy exploitable.`);
  if (!options.apply && changed > 0) console.log("Dry-run : aucune écriture. Relancer avec --apply après validation.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
