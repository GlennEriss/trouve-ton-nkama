/* eslint-disable no-console */
const admin = require("firebase-admin");

function parseArgs(argv = []) {
  return argv.reduce((acc, arg, index, all) => {
    if (!arg.startsWith("--")) return acc;
    const key = arg.slice(2);
    const next = all[index + 1];
    acc[key] = next && !next.startsWith("--") ? next : true;
    return acc;
  }, {});
}

function parseBoolean(value, defaultValue = true) {
  if (value === undefined || value === null) return defaultValue;
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

function normalizeRoles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function main() {
  require("dotenv").config();

  const args = parseArgs(process.argv.slice(2));
  const dryRun = parseBoolean(args["dry-run"], true);
  const pageSize = Math.max(50, Math.min(1000, Number(args["page-size"] || 500)));
  const batchSize = Math.max(50, Math.min(500, Number(args["batch-size"] || 300)));
  const limit = Number(args.limit || 0);
  const targetRole = String(args.role || "User").trim() || "User";

  const serviceAccount = require("./firebase-config.js");
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error("Configuration Firebase incomplète (projectId/clientEmail/privateKey).");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.projectId}.firebasestorage.app`,
    });
  }

  const db = admin.firestore();
  console.log(`🌍 Project: ${serviceAccount.projectId}`);
  console.log(`🧪 Dry-run: ${dryRun ? "ON" : "OFF"}`);
  console.log(`🎯 Rôle ajouté si manquant: ${targetRole}`);
  console.log(`📄 Page size: ${pageSize}`);
  console.log("");

  let scanned = 0;
  let matchedMissingRoles = 0;
  let patched = 0;
  let unchanged = 0;
  let cursor = null;
  const samples = [];

  let batch = db.batch();
  let pendingWrites = 0;

  while (true) {
    let query = db.collection("users").orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (cursor) {
      query = query.startAfter(cursor);
    }

    const page = await query.get();
    if (page.empty) {
      break;
    }

    for (const doc of page.docs) {
      scanned += 1;
      cursor = doc.id;

      const data = doc.data() || {};
      const uid = typeof data.uid === "string" && data.uid.trim() ? data.uid.trim() : doc.id;
      const email =
        typeof data.email === "string" && data.email.trim()
          ? data.email.trim().toLowerCase()
          : typeof data.login === "string" && data.login.trim()
            ? data.login.trim().toLowerCase()
            : "N/A";

      const roles = normalizeRoles(data.roles);
      const hasAnyRole = roles.length > 0;

      if (hasAnyRole) {
        unchanged += 1;
      } else {
        matchedMissingRoles += 1;

        if (samples.length < 20) {
          samples.push({
            docId: doc.id,
            uid,
            email,
            previousRoles: Array.isArray(data.roles) ? data.roles : data.roles ?? null,
          });
        }

        if (!dryRun) {
          batch.set(
            doc.ref,
            {
              roles: [targetRole],
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          pendingWrites += 1;
          patched += 1;

          if (pendingWrites >= batchSize) {
            await batch.commit();
            batch = db.batch();
            pendingWrites = 0;
          }
        }
      }

      if (limit > 0 && scanned >= limit) {
        break;
      }
    }

    if (limit > 0 && scanned >= limit) {
      break;
    }
  }

  if (!dryRun && pendingWrites > 0) {
    await batch.commit();
  }

  console.log(`📊 Scannés: ${scanned}`);
  console.log(`🎯 Utilisateurs sans rôle: ${matchedMissingRoles}`);
  console.log(`🟢 Déjà avec rôle: ${unchanged}`);
  if (!dryRun) {
    console.log(`✅ Patchés: ${patched}`);
  }

  if (samples.length > 0) {
    console.log("\n🔍 Exemples (max 20):");
    for (const sample of samples) {
      console.log(
        `- doc=${sample.docId} | uid=${sample.uid} | email=${sample.email} | roles_avant=${JSON.stringify(sample.previousRoles)}`,
      );
    }
  }

  if (dryRun) {
    console.log("\n🧪 Aucune modification appliquée (dry-run).");
    console.log("▶️ Pour appliquer: --dry-run false");
  }
}

main().catch((error) => {
  console.error("❌ backfill-missing-user-roles failed:", error.message);
  process.exit(1);
});

