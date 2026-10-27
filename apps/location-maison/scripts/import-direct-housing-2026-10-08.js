/* eslint-disable no-console */

/** Import idempotent de deux logements reçus directement du même propriétaire. */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");

const APPLY = process.argv.includes("--apply");
const PROJECT_ID = "location-maison-prod-167da";
const SOURCE = "direct-housing-2026-10-08";
const IMAGES_ROOT = path.resolve(__dirname, "../../../imports/direct-housing-2026-10-08/images");
const LIBREVILLE = { latitude: 0.4162, longitude: 9.4673 };
const CATALOG = [
  {
    sequence: "01",
    title: "Chambre en planches à louer à Montalier",
    description: "Chambre dans une maison en planches située à Montalier. Le loyer mensuel est de 60 000 FCFA, charges comprises. Contact direct avec le propriétaire.",
    price: 60000,
    images: ["01.png", "02.png", "03.png", "04.png"],
  },
  {
    sequence: "02",
    title: "Chambre économique en planches à Montalier",
    description: "Chambre dans une maison en planches située à Montalier. Le loyer mensuel est de 45 000 FCFA, charges comprises. Contact direct avec le propriétaire.",
    price: 45000,
    images: ["image.png"],
  },
];

const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/\s+/g, " ");
const displayName = (data, fallback) => data.pseudo || data.displayName || [data.firstname, data.lastname].filter(Boolean).join(" ").trim() || fallback;
const score = (uid) => crypto.createHash("sha256").update(`${SOURCE}:${uid}`).digest("hex");
const downloadUrl = (bucket, storagePath, token) => `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;

function validateImages() {
  const result = new Map();
  const hashes = new Set();
  for (const item of CATALOG) {
    const imagePaths = item.images.map((name) => path.join(IMAGES_ROOT, item.sequence, name));
    for (const imagePath of imagePaths) {
      if (!fs.existsSync(imagePath)) throw new Error(`Image manquante : ${imagePath}`);
      const hash = crypto.createHash("sha256").update(fs.readFileSync(imagePath)).digest("hex");
      if (hashes.has(hash)) throw new Error(`Image dupliquée : ${imagePath}`);
      hashes.add(hash);
    }
    result.set(item.sequence, imagePaths);
  }
  if ([...result.values()].flat().length !== 5) throw new Error("Le lot doit contenir exactement 5 images.");
  return result;
}

async function selectAnnouncer(db) {
  const snapshot = await db.collection("users").where("isPlatformAnnouncer", "==", true).get();
  if (snapshot.empty) throw new Error("Aucun compte annonceur plateforme disponible.");
  return snapshot.docs
    .map((doc) => ({ uid: doc.id, name: displayName(doc.data(), doc.id) }))
    .sort((a, b) => score(a.uid).localeCompare(score(b.uid)))[0];
}

async function uploadImage(bucket, uid, propertyId, sourcePath, index) {
  const number = String(index + 1).padStart(2, "0");
  const filePATH = `property/${propertyId}/${number}.webp`;
  const thumbPATH = `property/${propertyId}/thumb_${number}.webp`;
  const fileToken = crypto.randomUUID();
  const thumbToken = crypto.randomUUID();
  const [main, thumb] = await Promise.all([
    sharp(sourcePath).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(),
    sharp(sourcePath).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
  ]);
  await Promise.all([
    bucket.file(filePATH).save(main, { resumable: false, metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable", metadata: { owner: uid, status: "InProgress", firebaseStorageDownloadTokens: fileToken } } }),
    bucket.file(thumbPATH).save(thumb, { resumable: false, metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable", metadata: { owner: uid, status: "InProgress", firebaseStorageDownloadTokens: thumbToken } } }),
  ]);
  return {
    image: { filePATH, fileURL: downloadUrl(bucket.name, filePATH, fileToken), thumbPATH, thumbURL: downloadUrl(bucket.name, thumbPATH, thumbToken) },
    paths: [filePATH, thumbPATH],
  };
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH ||= path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();
  if (process.env.FIREBASE_PROJECT_ID !== PROJECT_ID) throw new Error(`Projet refusé : ${process.env.FIREBASE_PROJECT_ID}`);

  const imageMap = validateImages();
  const [announcer, rootDoc, roomDoc] = await Promise.all([
    selectAnnouncer(db),
    db.collection("listing_categories").doc("immobilier").get(),
    db.collection("listing_categories").doc("room").get(),
  ]);
  if (!rootDoc.exists || !roomDoc.exists) throw new Error("Catégories Immobilier/Chambre introuvables.");
  const rootName = rootDoc.data().name || "Immobilier";
  const roomName = roomDoc.data().name || "Chambre";
  const plan = await Promise.all(CATALOG.map(async (item) => {
    const propertyId = `${SOURCE}-${item.sequence}`;
    const existing = await db.collection("properties").doc(propertyId).get();
    return { ...item, propertyId, imagePaths: imageMap.get(item.sequence), exists: existing.exists };
  }));

  console.log(`Projet : ${PROJECT_ID}`);
  console.log(APPLY ? "Mode : APPLY" : "Mode : DRY-RUN");
  console.log(`Compte d’affichage commun : ${announcer.name} (${announcer.uid})`);
  plan.forEach((item) => console.log(`- ${item.propertyId} ${item.exists ? "[EXISTE]" : "[À CRÉER]"} — ${item.price} FCFA — ${item.imagePaths.length} image(s) — isOwner=true`));
  if (!APPLY) return console.log("Dry-run terminé : aucune écriture.");

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Bucket production introuvable.");
  const bucket = admin.storage().bucket(bucketName);
  for (const item of plan.filter((entry) => !entry.exists)) {
    const uploadedPaths = [];
    try {
      const uploadedImages = [];
      for (let index = 0; index < item.imagePaths.length; index += 1) {
        const uploaded = await uploadImage(bucket, announcer.uid, item.propertyId, item.imagePaths[index], index);
        uploadedImages.push(uploaded.image);
        uploadedPaths.push(...uploaded.paths);
      }
      await db.collection("properties").doc(item.propertyId).create({
        title: item.title, description: item.description, price: item.price, area: 0,
        images: uploadedImages, typeProperty: "Room", status: "FOR_RENT", categoryId: "room",
        categoryPath: { lvl0: rootName, lvl1: `${rootName} > ${roomName}` }, attributes: {},
        nbrRooms: 1, nbrKitchens: 0, nbrBathrooms: 0, nbrToilets: 0,
        street: "Montalier", city: "Libreville", province: "Estuaire", country: "Gabon", countryCode: "GA",
        ...LIBREVILLE, isLocExact: false, locationSource: "UNVERIFIED",
        contact: "+24166672773", whatsappContact: "", callContact: "", additionalContacts: [],
        isOwner: true, createdBy: announcer.uid, ownerUids: [announcer.uid], searchableName: normalize(item.title),
        moderationStatus: "APPROVED", moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        moderationReviewedBy: `import:${SOURCE}`, rejectionReason: null, state: "IN_PROGRESS", tags: [],
        importSource: SOURCE, importSourceId: item.propertyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`✓ ${item.propertyId} publiée avec ${uploadedImages.length} image(s).`);
    } catch (error) {
      await Promise.all(uploadedPaths.map((storagePath) => bucket.file(storagePath).delete({ ignoreNotFound: true })));
      throw new Error(`Échec ${item.propertyId}, images nettoyées : ${error.message}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
