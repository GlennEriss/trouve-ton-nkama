#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const DEFAULT_TAGS = [
  "Travail",
  "Famille",
  "Couple",
  "Villa",
  "Sous barrière",
  "Meublé",
  "Centre-ville",
  "Vacances",
  "Nature",
  "Montagne",
  "Piscine",
  "Animaux admis",
  "Commerces proches",
  "Transport proche",
  "Parking",
  "Wi-Fi",
  "Sécurisé",
  "Vélo",
  "Activités sportives",
  "Adapté aux enfants",
  "Accessible handicapés",
  "Étudiant",
  "Calme et tranquillité",
  "Proche de la plage",
  "Duplex",
  "Boutique",
  "Balcon",
  "Terrasse",
  "Collocation",
  "Garage",
  "Court séjour",
  "Propriétaire",
  "Agence",
];

function parseArgs(argv) {
  const args = {
    envFile: null,
    collection: "listing_tags",
    apply: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--env-file") {
      args.envFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (arg === "--collection") {
      args.collection = argv[i + 1] ?? "listing_tags";
      i += 1;
      continue;
    }
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }
  }
  return args;
}

function loadEnvFile(filePath) {
  if (!filePath) return;
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function toSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function resolveCredentials() {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCP_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = privateKeyRaw ? privateKeyRaw.replace(/\\n/gm, "\n") : null;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY).",
    );
  }
  return { projectId, clientEmail, privateKey };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnvFile(args.envFile);
  const credentials = resolveCredentials();

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      projectId: credentials.projectId,
    });
  }

  const db = getFirestore();
  const snapshot = await db.collection(args.collection).get();
  const existingByNormalized = new Map();
  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    const rawName = typeof data.name === "string" ? data.name.trim() : "";
    const key = normalizeName(rawName);
    if (key) {
      existingByNormalized.set(key, doc);
    }
  }

  const planned = DEFAULT_TAGS.map((name, index) => {
    const normalized = normalizeName(name);
    const existing = existingByNormalized.get(normalized) ?? null;
    const ref = existing ? existing.ref : db.collection(args.collection).doc(toSlug(name));
    return {
      ref,
      docId: ref.id,
      name,
      nameLower: normalized,
      order: index + 1,
      isActive: true,
      exists: Boolean(existing),
    };
  });

  console.log(
    `Seed listing tags | project=${credentials.projectId} collection=${args.collection} mode=${args.apply ? "apply" : "dry-run"}`,
  );
  console.log(`Existing docs in collection: ${snapshot.size}`);
  console.log(`Target tags: ${planned.length}`);

  if (!args.apply) {
    for (const item of planned) {
      console.log(`- ${item.exists ? "update" : "create"} ${item.docId} => ${item.name}`);
    }
    console.log("Dry-run complete. Re-run with --apply to persist.");
    return;
  }

  let processed = 0;
  while (processed < planned.length) {
    const chunk = planned.slice(processed, processed + 400);
    const batch = db.batch();
    for (const item of chunk) {
      batch.set(
        item.ref,
        {
          name: item.name,
          nameLower: item.nameLower,
          order: item.order,
          isActive: item.isActive,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "system_seed_listing_tags",
          ...(item.exists
            ? {}
            : {
                createdAt: FieldValue.serverTimestamp(),
                createdBy: "system_seed_listing_tags",
              }),
        },
        { merge: true },
      );
    }
    await batch.commit();
    processed += chunk.length;
  }

  console.log(`Seed completed. Upserted tags: ${planned.length}`);
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
