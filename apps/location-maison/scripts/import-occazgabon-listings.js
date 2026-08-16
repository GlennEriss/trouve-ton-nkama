/* eslint-disable no-console */

/**
 * Import ponctuel des annonces réelles occazGabon (comptes appartenant au même
 * utilisateur, migration interne — voir échange du 2026-08-15) vers Trouve Ton
 * Nkama, catégorie Mode.
 *
 * Ne crée AUCUN compte Firebase Auth pour les vendeurs : le numéro de téléphone
 * réel de chaque vendeur (normalisé, format Trouve Ton Nkama) est stocké comme
 * `contact` sur chaque annonce importée. Quand le vrai vendeur se connectera un
 * jour sur Trouve Ton Nkama via OTP téléphone, le mécanisme d'auto-attribution
 * déjà en prod (`claimListingsByVerifiedPhone`,
 * src/features/announcer/listing-claim/services/listing-claim.service.ts)
 * rattachera automatiquement ces annonces à son compte. `createdBy` reste un
 * compte annonceur existant (fourni par l'utilisateur) jusqu'à ce claim —
 * même principe que les imports Apify déjà en place.
 *
 * Source : Firestore occazGabon (projet occaz-gabon, base nommée
 * "occaz-gabon-prod"), lecture SEULE via le compte de service local dans
 * /Users/glenneriss/Documents/projets/occazGabon/secrets/.
 * Cible : Firestore + Storage Trouve Ton Nkama (lu via LOCATION_MAISON_ENV_PATH,
 * écriture seulement avec --apply).
 *
 * Usage :
 *   node scripts/import-occazgabon-listings.js                # dry-run (défaut)
 *   node scripts/import-occazgabon-listings.js --apply         # écriture réelle (prod)
 */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const path = require("node:path");
const https = require("node:https");

const APPLY = process.argv.includes("--apply");
const PROD_PROJECT_ID = "location-maison-prod-167da";
const CREATED_BY_UID = "cf3H6p5myIh11BVE9NSR55dN01y2"; // glenneriss@gmail.com, rôle Announcer déjà en prod

const OCCAZ_SECRET_PATH =
  "/Users/glenneriss/Documents/projets/occazGabon/secrets/occaz-gabon-firebase-adminsdk-fbsvc-8161251599.json";
const OCCAZ_DB_NAME = "occaz-gabon-prod";

// Correspondance déterminée manuellement à partir du titre réel de chaque annonce
// (categorieId occazGabon "mode"/"beaute-sante" ne suffit pas à distinguer
// vêtements/chaussures/accessoires) — voir le dry-run pour la liste complète.
const CATEGORY_LEAF_BY_ANNONCE_ID = {
  "ann_14a4a280-9598-4f02-8854-54ed4fe41e52": "parfums-beaute", // Musc
  "ann_348d538e-8cde-4604-b7d3-1602f2c84e32": "vetements", // Teeshirt
  "ann_3afd7400-740b-458e-92a7-a94ee055cbf9": "parfums-beaute", // Perruque Naturelle
  "ann_49260788-4145-47f6-84b7-4f6133fb3319": "chaussures", // Babouche
  "ann_5cd159bb-8abf-461b-8af5-fe91ff29b637": "vetements", // Chemise
  "ann_615acaf6-fa1a-4b90-a80b-446abda1dcda": "vetements", // Ensemble de sport
  "ann_6d74a303-a532-4aaa-b1b1-d4ee2205d4e4": "parfums-beaute", // "Beauté & Santé" générique
  "ann_7cf8274f-edf0-4fd1-abca-449c6319ab93": "vetements", // Robe de soirée bordeaux
  "ann_8e47ae8e-07f3-4d28-9b84-c886c40cd652": "parfums-beaute", // Perruque pixie
  "ann_8f09d31f-5962-4f97-9d87-cab17edc72d6": "parfums-beaute", // Huile de parfum 6ml
  "ann_90583bd4-5350-471b-a36c-8f74521da008": "vetements", // Robe simplicité/élégance
  "ann_92a0435d-4920-4365-99e4-bcb910acf87c": "parfums-beaute", // "Musc 6ml"
  "ann_abfb689d-bd58-437d-b396-46a974936262": "vetements", // Robe féminité
  "ann_b22435be-ed30-426c-b853-f541cb1112dd": "parfums-beaute", // Frensh curl (extension)
  "ann_c6eb7a6f-77e8-4467-804c-db06808438e3": "parfums-beaute", // Huile de parfum 3ml
  "ann_de58dc45-cd13-4736-a9af-16cda784b0b4": "vetements", // Ensemble Tailleur (Pantalon)
  "ann_f827183f-5383-412c-9f18-bb9c916db723": "vetements", // Ensemble tailleur
  "ann_fd523433-a61e-459f-bd47-893c5d22c774": "parfums-beaute", // 50ml parfum
};

const LOCATION = { city: "Libreville", province: "Estuaire", lat: 0.4162, lng: 9.4673 };

// Copié depuis apps/location-maison-admin/src/lib/phone/gabon-phone.ts (même règle,
// script standalone, pas d'accès direct au workspace admin).
function normalizeGabonPhoneE164(raw) {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("241")) digits = digits.slice(3);
  if (digits.length === 9 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length !== 8) return null;
  return `+241${digits}`;
}

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
          return;
        }
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

async function loadOccazAnnonces() {
  const { initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");

  // eslint-disable-next-line global-require
  const serviceAccount = require(OCCAZ_SECRET_PATH);
  const app = initializeApp(
    { credential: cert(serviceAccount), projectId: serviceAccount.project_id },
    "occazgabon-readonly",
  );
  const db = getFirestore(app, OCCAZ_DB_NAME);

  const usersSnap = await db.collection("utilisateurs").get();
  const usersById = new Map(usersSnap.docs.map((doc) => [doc.id, doc.data()]));

  const annSnap = await db.collection("annonces").where("statut", "==", "PUBLIEE").get();
  const annonces = annSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return { annonces, usersById };
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();

  const resolvedProjectId = process.env.FIREBASE_PROJECT_ID;
  if (resolvedProjectId !== PROD_PROJECT_ID) {
    throw new Error(
      `Refus : le projet Trouve Ton Nkama résolu est "${resolvedProjectId}", attendu "${PROD_PROJECT_ID}". ` +
        "Vérifie LOCATION_MAISON_ENV_PATH avant de continuer.",
    );
  }

  console.log(`Projet cible (Trouve Ton Nkama) : ${resolvedProjectId}`);
  console.log(APPLY ? "Mode: APPLY (écriture réelle)" : "Mode: DRY-RUN (aucune écriture)");
  console.log("");

  const { annonces, usersById } = await loadOccazAnnonces();
  console.log(`occazGabon : ${annonces.length} annonces PUBLIEE lues (lecture seule, jamais d'écriture).`);

  const categoriesSnapshot = await db.collection("listing_categories").get();
  const categoriesById = new Map(categoriesSnapshot.docs.map((doc) => [doc.id, doc.data()]));
  const root = categoriesById.get("mode");
  if (!root) {
    throw new Error('Catégorie racine "mode" introuvable dans listing_categories.');
  }
  const rootName = root.name || "Mode";

  const createdByDoc = await db.collection("users").doc(CREATED_BY_UID).get();
  if (!createdByDoc.exists) {
    throw new Error(`Compte createdBy introuvable: users/${CREATED_BY_UID}`);
  }

  const plan = [];
  const unresolvedPhones = [];
  const unmappedListings = [];

  for (const annonce of annonces) {
    const leafSlug = CATEGORY_LEAF_BY_ANNONCE_ID[annonce.id];
    if (!leafSlug) {
      unmappedListings.push(annonce.id);
      continue;
    }
    const leaf = categoriesById.get(leafSlug);
    if (!leaf) {
      throw new Error(`Catégorie feuille "${leafSlug}" introuvable dans listing_categories.`);
    }

    const seller = usersById.get(annonce.vendeurId);
    const normalizedPhone = normalizeGabonPhoneE164(seller && seller.telephone);
    if (!normalizedPhone) {
      unresolvedPhones.push({ annonceId: annonce.id, vendeurId: annonce.vendeurId, telephone: seller && seller.telephone });
      continue;
    }

    plan.push({
      sourceId: annonce.id,
      title: annonce.titre,
      description: annonce.description,
      price: annonce.prix,
      leafSlug,
      leafName: leaf.name,
      categoryPath: { lvl0: rootName, lvl1: `${rootName} > ${leaf.name}` },
      sellerName: seller && seller.nom,
      contact: normalizedPhone,
      photos: (annonce.photos || []).map((p) => p.url).filter(Boolean),
    });
  }

  console.log("");
  console.log("=== Plan d'import ===");
  for (const item of plan) {
    console.log(
      `- [${item.leafSlug}] "${item.title}" — ${item.price} FCFA — vendeur "${item.sellerName}" (${item.contact}) — ${item.photos.length} photo(s)`,
    );
  }
  console.log("");
  console.log(`Total à importer : ${plan.length}/${annonces.length}`);
  if (unmappedListings.length > 0) {
    console.log(`⚠️ Annonces sans mapping catégorie (ignorées) : ${unmappedListings.join(", ")}`);
  }
  if (unresolvedPhones.length > 0) {
    console.log(`⚠️ Annonces avec téléphone vendeur non résolu (ignorées) :`, unresolvedPhones);
  }

  if (!APPLY) {
    console.log("");
    console.log("Dry-run : aucune écriture, aucun téléchargement d'image. Relancer avec --apply pour appliquer.");
    return;
  }

  console.log("");
  console.log("=== Application ===");
  // .env.local.prod n'expose le bucket que sous NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  // (variable client) ; initFirestoreAdmin() ne lit que la variante serveur
  // FIREBASE_STORAGE_BUCKET, absente ici — on passe donc le nom explicitement.
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) {
    throw new Error("Bucket Storage introuvable (ni FIREBASE_STORAGE_BUCKET ni NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).");
  }
  const bucket = admin.storage().bucket(bucketName);
  let created = 0;

  for (const item of plan) {
    const ref = db.collection("properties").doc();

    const images = [];
    for (let i = 0; i < item.photos.length; i += 1) {
      const sourceUrl = item.photos[i];
      try {
        const { buffer, contentType } = await fetchBuffer(sourceUrl);
        const ext = contentType && contentType.includes("png") ? "png" : "jpg";
        const storagePath = `property/${ref.id}/${i}.${ext}`;
        const file = bucket.file(storagePath);
        await file.save(buffer, {
          metadata: { contentType: contentType || "image/jpeg", cacheControl: "public, max-age=31536000" },
        });
        await file.makePublic();
        images.push({ fileURL: `https://storage.googleapis.com/${bucket.name}/${storagePath}`, filePATH: storagePath });
      } catch (error) {
        console.error(`  ⚠️ Échec téléchargement/upload photo pour ${item.sourceId} (${sourceUrl}):`, error.message);
      }
    }

    await ref.set({
      title: item.title,
      description: item.description,
      price: item.price,
      images,
      categoryId: item.leafSlug,
      categoryPath: item.categoryPath,
      attributes: {},
      street: "",
      city: LOCATION.city,
      province: LOCATION.province,
      country: "Gabon",
      countryCode: "GA",
      latitude: LOCATION.lat,
      longitude: LOCATION.lng,
      isLocExact: false,
      locationSource: "UNVERIFIED",
      contact: item.contact,
      whatsappContact: item.contact,
      callContact: item.contact,
      createdBy: CREATED_BY_UID,
      searchableName: item.title.trim().toLowerCase(),
      moderationStatus: "APPROVED",
      moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      moderationReviewedBy: "import:occazgabon",
      rejectionReason: null,
      state: "IN_PROGRESS",
      tags: [],
      importSource: "occazgabon",
      importSourceId: item.sourceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    created += 1;
    console.log(`  ✓ Créée: ${ref.id} — "${item.title}" (${images.length} photo(s) importée(s))`);
  }

  console.log("");
  console.log(`Documents créés: ${created}/${plan.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
