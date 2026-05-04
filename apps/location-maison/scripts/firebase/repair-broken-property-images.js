#!/usr/bin/env node
"use strict";

const path = require("node:path");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

function parseArgs(argv) {
  const result = {
    envFile: "",
    apply: false,
    limit: 0,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file") result.envFile = argv[++i] || "";
    else if (arg === "--apply") result.apply = true;
    else if (arg === "--limit") result.limit = Number(argv[++i] || 0);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return result;
}

function printHelp() {
  console.log(`Repair broken property images in Firestore.

Usage:
  node scripts/firebase/repair-broken-property-images.js --env-file .env.local.dev --apply

Options:
  --env-file <path>   Env file to load (default: ../../.env.local.dev)
  --apply             Write fixes to Firestore (default: dry-run)
  --limit <n>         Only scan first n properties (default: all)
`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function encodeObjectPath(objectPath) {
  return objectPath
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function decodeObjectPath(encodedPath) {
  return encodedPath
    .split("/")
    .filter(Boolean)
    .map((part) => decodeURIComponent(part))
    .join("/");
}

function buildStoragePublicUrl(bucketName, objectPath) {
  return `https://storage.googleapis.com/${bucketName}/${encodeObjectPath(objectPath)}`;
}

function parseStorageUrl(value) {
  if (!isNonEmptyString(value)) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.hostname === "storage.googleapis.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const bucket = parts[0];
    const objectPath = decodeObjectPath(parts.slice(1).join("/"));
    return { bucket, objectPath };
  }

  if (parsed.hostname === "firebasestorage.googleapis.com") {
    const parts = parsed.pathname.split("/").filter(Boolean);
    const bucketIdx = parts.indexOf("b");
    const objectIdx = parts.indexOf("o");
    if (bucketIdx < 0 || objectIdx < 0 || !parts[bucketIdx + 1] || !parts[objectIdx + 1]) {
      return null;
    }

    const bucket = decodeURIComponent(parts[bucketIdx + 1]);
    const objectPath = decodeObjectPath(parts.slice(objectIdx + 1).join("/"));
    return { bucket, objectPath };
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const envFile = args.envFile
    ? path.resolve(process.cwd(), args.envFile)
    : path.resolve(__dirname, "..", "..", ".env.local.dev");

  const dotenvResult = dotenv.config({ path: envFile });
  if (dotenvResult.error) {
    throw new Error(`Impossible de charger ${envFile}: ${dotenvResult.error.message}`);
  }

  const serviceAccount = require("./firebase-config.js");
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error("Configuration Firebase Admin incomplète (firebase-config.js).");
  }

  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "";
  if (!bucketName) {
    throw new Error("Variable FIREBASE_STORAGE_BUCKET manquante.");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: bucketName,
    });
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket(bucketName);

  let query = db.collection("properties");
  if (Number.isFinite(args.limit) && args.limit > 0) {
    query = query.limit(Math.floor(args.limit));
  }

  const snapshot = await query.get();

  const stats = {
    scannedDocs: snapshot.size,
    updatedDocs: 0,
    totalImages: 0,
    storageUrlsChecked: 0,
    storageUrlsFixed: 0,
    storageUrlsNullified: 0,
    externalUrlsKept: 0,
    missingOrInvalidNullified: 0,
  };

  const fileExistsCache = new Map();
  const updates = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const images = Array.isArray(data.images) ? data.images : [];
    if (images.length === 0) {
      continue;
    }

    const nextImages = [];
    let docChanged = false;

    for (const image of images) {
      stats.totalImages += 1;

      const imageObj =
        typeof image === "string"
          ? { filePATH: null, fileURL: image.trim() || null }
          : image && typeof image === "object"
            ? {
                filePATH: isNonEmptyString(image.filePATH) ? image.filePATH.trim() : null,
                fileURL: isNonEmptyString(image.fileURL) ? image.fileURL.trim() : null,
              }
            : { filePATH: null, fileURL: null };

      let nextFilePATH = imageObj.filePATH;
      let nextFileURL = imageObj.fileURL;

      const parsedStorageUrl = parseStorageUrl(nextFileURL);
      if (parsedStorageUrl && !nextFilePATH) {
        nextFilePATH = parsedStorageUrl.objectPath;
      }

      if (parsedStorageUrl || nextFilePATH) {
        stats.storageUrlsChecked += 1;

        const candidateBucket = parsedStorageUrl?.bucket || bucketName;
        const objectPath = nextFilePATH || parsedStorageUrl?.objectPath || "";
        const shouldCheckInCurrentBucket = candidateBucket === bucketName && objectPath.length > 0;

        let exists = false;
        if (shouldCheckInCurrentBucket) {
          const cacheKey = objectPath;
          if (fileExistsCache.has(cacheKey)) {
            exists = fileExistsCache.get(cacheKey);
          } else {
            const [fileExists] = await bucket.file(objectPath).exists();
            exists = Boolean(fileExists);
            fileExistsCache.set(cacheKey, exists);
          }
        }

        if (shouldCheckInCurrentBucket && exists) {
          const canonicalUrl = buildStoragePublicUrl(bucketName, objectPath);
          if (canonicalUrl !== nextFileURL || objectPath !== nextFilePATH) {
            docChanged = true;
            stats.storageUrlsFixed += 1;
          }
          nextFilePATH = objectPath;
          nextFileURL = canonicalUrl;
        } else {
          if (nextFileURL !== null) {
            docChanged = true;
            stats.storageUrlsNullified += 1;
          }
          nextFileURL = null;
        }
      } else if (isNonEmptyString(nextFileURL)) {
        stats.externalUrlsKept += 1;
      } else {
        if (nextFileURL !== null) {
          docChanged = true;
        }
        nextFileURL = null;
        stats.missingOrInvalidNullified += 1;
      }

      const finalImage = {
        filePATH: nextFilePATH || null,
        fileURL: nextFileURL || null,
      };

      if (JSON.stringify(finalImage) !== JSON.stringify(image)) {
        docChanged = true;
      }
      nextImages.push(finalImage);
    }

    if (docChanged) {
      stats.updatedDocs += 1;
      updates.push({
        id: doc.id,
        beforeCount: images.length,
        afterCount: nextImages.length,
        payload: {
          images: nextImages,
          imageRepairVersion: "repair-broken-property-images-v1",
          imageRepairAt: admin.firestore.FieldValue.serverTimestamp(),
        },
      });
    }
  }

  console.log(`\nScan terminé sur ${stats.scannedDocs} propriétés`);
  console.log(`Images analysées: ${stats.totalImages}`);
  console.log(`Propriétés à corriger: ${stats.updatedDocs}`);
  console.log(`URLs storage contrôlées: ${stats.storageUrlsChecked}`);
  console.log(`URLs storage corrigées: ${stats.storageUrlsFixed}`);
  console.log(`URLs storage invalides nullifiées: ${stats.storageUrlsNullified}`);
  console.log(`URLs externes conservées: ${stats.externalUrlsKept}`);
  console.log(`URLs vides/invalides nullifiées: ${stats.missingOrInvalidNullified}`);

  if (!args.apply) {
    console.log("\nMode dry-run: aucune écriture Firestore.");
    if (updates.length > 0) {
      const sample = updates.slice(0, 5).map((u) => u.id);
      console.log(`Exemples d'IDs à corriger: ${sample.join(", ")}`);
    }
    return;
  }

  if (updates.length === 0) {
    console.log("\nAucune correction à appliquer.");
    return;
  }

  const chunkSize = 200;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + chunkSize);
    for (const item of chunk) {
      const ref = db.collection("properties").doc(item.id);
      batch.update(ref, item.payload);
    }
    await batch.commit();
    console.log(`Batch ${Math.floor(i / chunkSize) + 1} appliqué (${chunk.length} propriétés).`);
  }

  console.log(`\nCorrections appliquées sur ${updates.length} propriétés.`);
}

main().catch((error) => {
  console.error("Erreur durant la réparation des images:", error?.message || error);
  process.exit(1);
});
