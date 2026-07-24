/**
 * One-shot backfill: re-normalize existing `users.phoneNumbers[]` and
 * `properties.contact` to the canonical compact E.164 form (+241XXXXXXXX).
 *
 * Prerequisite for announcer auto-attribution (Lot 4): the join key
 * (listing.contact == verified phone) only works if every record already in
 * Firestore uses the same stored format the OTP/provisioning/edit paths now
 * produce (see src/lib/phone/gabon-phone.ts). Idempotent — running it again
 * after `--apply` reports zero changes.
 *
 * Usage:
 *   tsx scripts/phone/normalize-existing-phones.ts [--env-file=.env.local] [--apply]
 * Dry-run by default (reports what would change); pass --apply to write.
 */
import { COLLECTIONS } from "@trouve-ton-nkama/core/constants";

import { normalizeGabonPhoneE164 } from "@/lib/phone/gabon-phone";

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

function dedupePreservingOrder(values: string[]): string[] {
  return Array.from(new Set(values));
}

async function migrateUsers(apply: boolean) {
  const { getFirebaseAdminDb } = await import("@/lib/firebase/firebase-admin");
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTIONS.users).get();

  let changed = 0;
  let unparseable = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const phoneNumbers = Array.isArray(data.phoneNumbers) ? (data.phoneNumbers as unknown[]) : [];
    const original = phoneNumbers.filter((value): value is string => typeof value === "string");
    if (original.length === 0) continue;

    const parsed = original.map((value) => normalizeGabonPhoneE164(value));
    if (parsed.some((value) => value === null)) unparseable += 1;
    const normalized = original.map((value, index) => parsed[index] ?? value);

    const deduped = dedupePreservingOrder(normalized);
    const isUnchanged = deduped.length === original.length && deduped.every((value, index) => value === original[index]);
    if (isUnchanged) continue;

    changed += 1;
    console.log(`[users] ${doc.id}: ${JSON.stringify(original)} -> ${JSON.stringify(deduped)}`);
    if (apply) {
      await doc.ref.update({ phoneNumbers: deduped });
    }
  }

  console.log(`[users] ${changed} document(s) ${apply ? "updated" : "would be updated"}, ${unparseable} non-Gabonese/unparseable number(s) left as-is.`);
}

async function migrateProperties(apply: boolean) {
  const { getFirebaseAdminDb } = await import("@/lib/firebase/firebase-admin");
  const db = getFirebaseAdminDb();
  const snapshot = await db.collection(COLLECTIONS.properties).get();

  let changed = 0;
  let unparseable = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const contact = data.contact;
    if (typeof contact !== "string" || contact.trim() === "") continue;

    const normalized = normalizeGabonPhoneE164(contact);
    if (!normalized) {
      unparseable += 1;
      continue;
    }
    if (normalized === contact) continue;

    changed += 1;
    console.log(`[properties] ${doc.id}: ${JSON.stringify(contact)} -> ${JSON.stringify(normalized)}`);
    if (apply) {
      await doc.ref.update({ contact: normalized });
    }
  }

  console.log(`[properties] ${changed} document(s) ${apply ? "updated" : "would be updated"}, ${unparseable} non-Gabonese/unparseable contact(s) left as-is.`);
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  process.loadEnvFile(options.envFile);

  console.log(`Mode: ${options.apply ? "APPLY (writing changes)" : "DRY-RUN (no writes)"}`);
  await migrateUsers(options.apply);
  await migrateProperties(options.apply);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
