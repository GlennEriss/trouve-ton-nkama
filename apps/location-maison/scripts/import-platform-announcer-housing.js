/* eslint-disable no-console */

/**
 * Import idempotent de quatre annonces immobilières confiées à des identités
 * d'affichage gérées par la plateforme.
 *
 * Usage :
 *   node scripts/import-platform-announcer-housing.js          # dry-run
 *   node scripts/import-platform-announcer-housing.js --apply  # écrit en production
 *
 * Les annonceurs sont classés par un hash salé stable : la sélection est
 * pseudo-aléatoire, sans doublon, mais reste identique entre le dry-run et
 * l'application. Les contacts publiés sont ceux des propriétaires fournis dans
 * les annonces, jamais ceux des identités d'affichage.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");

const APPLY = process.argv.includes("--apply");
const PROD_PROJECT_ID = "location-maison-prod-167da";
const IMPORT_SOURCE = "platform-housing-batch-2026-09-18";
const ACCOUNT_SELECTION_SEED = "ttn-platform-housing-20260918-v1";
const IMAGES_ROOT = path.resolve(__dirname, "../../../imports/platform-announcers-housing/images");
const LIBREVILLE = { latitude: 0.4162, longitude: 9.4673 };

const CATALOG = [
  {
    sequence: "01",
    title: "Grande chambre américaine à louer à Nzeng-Ayong",
    description:
      "Grande chambre américaine carrelée avec douche, WC et coin cuisine équipé d’un évier. L’eau et l’électricité sont incluses dans le loyer. Située à Nzeng-Ayong, au carrefour GP.",
    price: 110000,
    typeProperty: "Room",
    categoryId: "room",
    street: "Nzeng-Ayong, carrefour GP",
    contact: "+24165768105",
    additionalContacts: ["+24174108846"],
    details: { nbrRooms: 1, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1 },
    imageNames: ["01.png"],
  },
  {
    sequence: "02",
    title: "Maison de 2 chambres climatisées avec cuve et surpresseur",
    description:
      "Maison de deux chambres climatisées, dont une chambre parentale avec salle de bain. Elle comprend un salon, une cuisine, un WC et une douche indépendante. Le logement dispose d’une cuve et d’un surpresseur. Il n’y a pas d’accès véhicule.",
    price: 250000,
    typeProperty: "Home",
    categoryId: "home",
    street: "Libreville",
    contact: "+24177262503",
    additionalContacts: [],
    details: {
      nbrRooms: 2,
      nbrKitchens: 1,
      nbrBathrooms: 2,
      nbrToilets: 1,
      nbrGarages: 0,
      nbrFloors: 0,
      nbrLivingRoom: 1,
    },
    imageNames: [
      "image copy 6.png",
      "image copy.png",
      "image copy 2.png",
      "image copy 5.png",
      "image copy 4.png",
      "image copy 3.png",
      "03.png",
      "image copy 7.png",
      "image copy 8.png",
      "image.png",
    ],
  },
  {
    sequence: "03",
    title: "Deux chambres individuelles à louer à Nzeng-Ayong",
    description:
      "Deux chambres individuelles sont proposées à Nzeng-Ayong, à l’échangeur du côté de la station Engen. Première option à 60 000 FCFA sans douche intérieure. Deuxième option à 80 000 FCFA avec douche et coin cuisine intérieurs. Les charges d’eau et d’électricité sont incluses. Conditions : loyer et caution.",
    price: 60000,
    typeProperty: "Room",
    categoryId: "room",
    street: "Nzeng-Ayong, échangeur côté station Engen",
    contact: "+24174313270",
    additionalContacts: [],
    details: { nbrRooms: 1, nbrKitchens: 0, nbrBathrooms: 0, nbrToilets: 0 },
    imageNames: ["image copy.png", "image.png"],
  },
  {
    sequence: "04",
    title: "Maison de 2 chambres avec compteur personnel",
    description:
      "Maison de deux chambres située à Belles-Peintures, avec toilette intérieure, grille de sécurité et compteur personnel. Le logement est proposé à 170 000 FCFA. L’entrée se fait avec la caution afin de permettre la remise en peinture.",
    price: 170000,
    typeProperty: "Home",
    categoryId: "home",
    street: "Belles-Peintures",
    contact: "+24166276166",
    additionalContacts: [],
    details: {
      nbrRooms: 2,
      nbrKitchens: 0,
      nbrBathrooms: 0,
      nbrToilets: 1,
      nbrGarages: 0,
      nbrFloors: 0,
      nbrLivingRoom: 0,
    },
    imageNames: ["image.png"],
  },
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function displayName(data, fallback) {
  return (
    data.pseudo ||
    data.displayName ||
    [data.firstname, data.lastname].filter(Boolean).join(" ").trim() ||
    fallback
  );
}

function stableRandomScore(uid) {
  return crypto.createHash("sha256").update(`${ACCOUNT_SELECTION_SEED}:${uid}`).digest("hex");
}

async function loadSelectedAnnouncers(db) {
  const snapshot = await db.collection("users").where("isPlatformAnnouncer", "==", true).get();
  if (snapshot.size < CATALOG.length) {
    throw new Error(`Seulement ${snapshot.size} annonceur(s) plateforme disponible(s), ${CATALOG.length} requis.`);
  }

  const announcers = snapshot.docs
    .map((doc) => ({ uid: doc.id, name: displayName(doc.data(), doc.id) }))
    .sort((left, right) => stableRandomScore(left.uid).localeCompare(stableRandomScore(right.uid)));

  return announcers.slice(0, CATALOG.length);
}

function firebaseDownloadUrl(bucketName, storagePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function optimizeImage(sourcePath) {
  const [main, thumb] = await Promise.all([
    sharp(sourcePath)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer(),
    sharp(sourcePath)
      .rotate()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer(),
  ]);
  return { main, thumb };
}

async function uploadOneImage(bucket, uid, propertyId, sourcePath, index) {
  const sequence = String(index + 1).padStart(2, "0");
  const filePATH = `property/${propertyId}/${sequence}.webp`;
  const thumbPATH = `property/${propertyId}/thumb_${sequence}.webp`;
  const mainToken = crypto.randomUUID();
  const thumbToken = crypto.randomUUID();
  const { main, thumb } = await optimizeImage(sourcePath);

  await Promise.all([
    bucket.file(filePATH).save(main, {
      resumable: false,
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { owner: uid, status: "InProgress", firebaseStorageDownloadTokens: mainToken },
      },
    }),
    bucket.file(thumbPATH).save(thumb, {
      resumable: false,
      metadata: {
        contentType: "image/webp",
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { owner: uid, status: "InProgress", firebaseStorageDownloadTokens: thumbToken },
      },
    }),
  ]);

  return {
    image: {
      filePATH,
      fileURL: firebaseDownloadUrl(bucket.name, filePATH, mainToken),
      thumbPATH,
      thumbURL: firebaseDownloadUrl(bucket.name, thumbPATH, thumbToken),
    },
    uploadedPaths: [filePATH, thumbPATH],
  };
}

async function uploadImages(bucket, uid, propertyId, imagePaths) {
  const images = [];
  const uploadedPaths = [];

  // Traitement volontairement séquentiel : un lot ne contient que dix images au
  // maximum et cette stratégie limite la mémoire consommée par Sharp en production.
  for (let index = 0; index < imagePaths.length; index += 1) {
    const uploaded = await uploadOneImage(bucket, uid, propertyId, imagePaths[index], index);
    images.push(uploaded.image);
    uploadedPaths.push(...uploaded.uploadedPaths);
  }

  return { images, uploadedPaths };
}

function validateLocalImages() {
  const pathsBySequence = new Map();
  const hashes = new Set();
  let count = 0;

  for (const item of CATALOG) {
    const imagePaths = item.imageNames.map((name) => path.join(IMAGES_ROOT, item.sequence, name));
    const missing = imagePaths.filter((imagePath) => !fs.existsSync(imagePath));
    if (missing.length) throw new Error(`Images manquantes pour l’annonce ${item.sequence} : ${missing.join(", ")}`);

    for (const imagePath of imagePaths) {
      const hash = crypto.createHash("sha256").update(fs.readFileSync(imagePath)).digest("hex");
      if (hashes.has(hash)) throw new Error(`Image dupliquée détectée : ${imagePath}`);
      hashes.add(hash);
      count += 1;
    }
    pathsBySequence.set(item.sequence, imagePaths);
  }

  if (count !== 14) throw new Error(`Nombre d’images inattendu : ${count}/14.`);
  return pathsBySequence;
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet Firebase « ${process.env.FIREBASE_PROJECT_ID} », attendu « ${PROD_PROJECT_ID} ».`);
  }
  if (CATALOG.length !== 4) throw new Error(`Catalogue incomplet : ${CATALOG.length}/4 annonce(s).`);

  const imagePathsBySequence = validateLocalImages();
  const [announcers, rootDoc, homeDoc, roomDoc] = await Promise.all([
    loadSelectedAnnouncers(db),
    db.collection("listing_categories").doc("immobilier").get(),
    db.collection("listing_categories").doc("home").get(),
    db.collection("listing_categories").doc("room").get(),
  ]);
  if (!rootDoc.exists || !homeDoc.exists || !roomDoc.exists) {
    throw new Error("Catégories Immobilier/Maison/Chambre introuvables en production.");
  }

  const rootName = rootDoc.data().name || "Immobilier";
  const categoryNames = {
    home: homeDoc.data().name || "Maison",
    room: roomDoc.data().name || "Chambre",
  };

  const plan = await Promise.all(
    CATALOG.map(async (item, index) => {
      const propertyId = `platform-housing-20260918-${item.sequence}`;
      const existing = await db.collection("properties").doc(propertyId).get();
      return {
        ...item,
        propertyId,
        imagePaths: imagePathsBySequence.get(item.sequence),
        announcer: announcers[index],
        alreadyExists: existing.exists,
      };
    }),
  );

  console.log(`Projet cible : ${PROD_PROJECT_ID}`);
  console.log(APPLY ? "Mode : APPLY (écriture production)" : "Mode : DRY-RUN (aucune écriture)");
  console.log(`Images validées : ${[...imagePathsBySequence.values()].flat().length}`);
  console.log("Attribution stable et sans doublon des comptes :");
  for (const item of plan) {
    const status = item.alreadyExists ? "DÉJÀ IMPORTÉE" : "À IMPORTER";
    console.log(
      `- ${item.propertyId} [${status}] ${item.title} — ${item.price} FCFA — ${item.imagePaths.length} photo(s) — ${item.announcer.name} (${item.announcer.uid})`,
    );
  }

  const pending = plan.filter((item) => !item.alreadyExists);
  console.log(`Bilan : ${pending.length} à importer, ${plan.length - pending.length} déjà présente(s).`);
  if (!APPLY) {
    console.log("Dry-run terminé : aucune donnée ni image n’a été écrite.");
    return;
  }

  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error("Bucket Firebase Storage introuvable dans l’environnement production.");
  const bucket = admin.storage().bucket(bucketName);

  let created = 0;
  for (const item of pending) {
    let uploadedPaths = [];
    try {
      const uploaded = await uploadImages(bucket, item.announcer.uid, item.propertyId, item.imagePaths);
      uploadedPaths = uploaded.uploadedPaths;
      await db.collection("properties").doc(item.propertyId).create({
        title: item.title,
        description: item.description,
        price: item.price,
        area: 0,
        images: uploaded.images,
        typeProperty: item.typeProperty,
        status: "FOR_RENT",
        categoryId: item.categoryId,
        categoryPath: {
          lvl0: rootName,
          lvl1: `${rootName} > ${categoryNames[item.categoryId]}`,
        },
        attributes: {},
        ...item.details,
        street: item.street,
        city: "Libreville",
        province: "Estuaire",
        country: "Gabon",
        countryCode: "GA",
        latitude: LIBREVILLE.latitude,
        longitude: LIBREVILLE.longitude,
        isLocExact: false,
        locationSource: "UNVERIFIED",
        contact: item.contact,
        whatsappContact: "",
        callContact: "",
        additionalContacts: item.additionalContacts,
        isOwner: false,
        createdBy: item.announcer.uid,
        ownerUids: [item.announcer.uid],
        searchableName: normalize(item.title),
        moderationStatus: "APPROVED",
        moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
        moderationReviewedBy: `import:${IMPORT_SOURCE}`,
        rejectionReason: null,
        state: "IN_PROGRESS",
        tags: [],
        importSource: IMPORT_SOURCE,
        importSourceId: item.propertyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created += 1;
      console.log(`✓ ${item.propertyId} publiée pour ${item.announcer.name} avec ${uploaded.images.length} photo(s).`);
    } catch (error) {
      await Promise.all(uploadedPaths.map((storagePath) => bucket.file(storagePath).delete({ ignoreNotFound: true })));
      throw new Error(`Échec sur ${item.propertyId} (fichiers de cette annonce nettoyés) : ${error.message}`);
    }
  }

  console.log(`Import terminé : ${created} annonce(s) publiée(s), ${plan.length - pending.length} déjà présente(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
