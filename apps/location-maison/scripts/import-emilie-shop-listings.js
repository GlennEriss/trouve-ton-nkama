/* eslint-disable no-console */

/**
 * Import ponctuel et idempotent des 17 articles Emilie Shop en production.
 *
 * Pré-requis :
 *   imports/emilie-shop/images/1.png ... 17.png
 *
 * Usage :
 *   node scripts/import-emilie-shop-listings.js          # dry-run, aucune écriture
 *   node scripts/import-emilie-shop-listings.js --apply  # import en production
 *
 * Le script refuse tout projet autre que la production attendue, retrouve le
 * compte par son nom exact, vérifie les images et la catégorie, puis utilise des
 * identifiants Firestore stables. Une relance ne recrée donc jamais une annonce.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");

const APPLY = process.argv.includes("--apply");
const PROD_PROJECT_ID = "location-maison-prod-167da";
const IMPORT_SOURCE = "emilie-shop-batch-2026-09-18";
const EXPECTED_SHOP_NAME = "Emilie Shop";
const IMAGES_DIR = path.resolve(__dirname, "../../../imports/emilie-shop/images");
const ZONES = [
  { city: "Libreville", province: "Estuaire", latitude: 0.4162, longitude: 9.4673 },
  { city: "Franceville", province: "Haut-Ogooué", latitude: -1.6332, longitude: 13.5833 },
];
const PRIMARY_ZONE = ZONES[0];

const CATALOG = [
  {
    title: "Pantalon palazzo femme – coupe large et fluide",
    price: 8000,
    description: "Pantalon palazzo femme à coupe large et fluide, élégant et confortable. Idéal pour une tenue chic, professionnelle ou décontractée.",
    couleur: "Blanc, bordeaux, camel, bleu marine, beige, marron et noir",
  },
  {
    title: "Jean large femme taille haute",
    price: 10000,
    description: "Jean large femme à taille haute, conçu dans un tissu résistant et confortable. Doté de poches arrière pratiques et d’un large revers tendance. Il convient aussi bien à une tenue chic qu’à un style décontracté.",
    couleur: "Bleu clair, noir et bleu foncé",
  },
  {
    title: "Pantalon large chic femme – taille haute",
    price: 10000,
    description: "Pantalon large femme à taille haute, élégant et confortable. Son tissu de qualité, sa coupe moderne et ses poches pratiques en font un modèle adapté au bureau, aux sorties et aux tenues du quotidien.",
    couleur: "Noir et beige",
  },
  {
    title: "Jean large femme tendance",
    price: 10000,
    description: "Jean large femme au style tendance, disponible en trois coloris. Sa coupe moderne et confortable s’adapte facilement à une tenue chic ou décontractée.",
    couleur: "Bleu clair, bleu foncé et noir",
  },
  {
    title: "Bermuda large femme en jean",
    price: 9000,
    description: "Bermuda femme en jean à coupe large, moderne et confortable. Sa taille haute et sa longueur sous le genou offrent un style tendance, idéal pour une tenue décontractée.",
    couleur: "Bleu et noir",
  },
  {
    title: "Jean large femme à revers",
    price: 10000,
    description: "Jean large femme à taille haute, sublimé par de larges revers tendance. Confortable et facile à assortir, il convient parfaitement aux tenues décontractées comme aux looks plus élégants.",
    couleur: "Bleu clair, bleu foncé et noir",
  },
  {
    title: "Jean large femme avec ceinture assortie",
    price: 10000,
    description: "Jean large femme à taille haute accompagné d’une ceinture assortie à nouer. Sa coupe fluide et moderne apporte confort et élégance pour composer facilement une tenue chic ou décontractée.",
    couleur: "Bleu clair, bleu foncé et noir",
  },
  {
    title: "Jean skinny femme taille haute",
    price: 8000,
    description: "Jean skinny femme à taille haute dont la coupe épouse élégamment la silhouette. Simple, confortable et tendance, il s’associe facilement à un t-shirt, une chemise ou un top, avec des baskets comme avec des talons.",
    couleur: "Bleu classique",
  },
  {
    title: "Crop top femme uni à manches courtes",
    price: 7000,
    description: "Crop top femme uni à manches courtes, doté d’une coupe courte et près du corps. Disponible dans un large choix de couleurs, il se porte facilement avec un jean, un short ou une jupe pour créer une tenue tendance et décontractée.",
    couleur: "Plusieurs coloris",
  },
  {
    title: "Robe longue femme en jean, boutonnée et ceinturée",
    price: 16000,
    description: "Robe longue femme en jean sans manches, élégante et structurée. Sa fermeture boutonnée, son col chemise et sa ceinture assortie permettent de souligner la taille. Idéale pour une tenue moderne, féminine et décontractée.",
    couleur: "Bleu jean",
  },
  {
    title: "Robe longue noire à liseré blanc",
    price: 14000,
    description: "Robe longue noire à manches courtes, élégamment rehaussée d’un liseré blanc contrasté. Son col V, sa coupe féminine et sa fente avant créent une silhouette chic, idéale pour une sortie ou une occasion spéciale.",
    couleur: "Noir et blanc",
  },
  {
    title: "Combinaison pantalon chic plissée avec ceinture",
    price: 17000,
    description: "Combinaison pantalon femme élégante avec un haut croisé inspiré du blazer et une ceinture assortie qui souligne la taille. Son pantalon large et plissé offre une silhouette fluide et sophistiquée, idéale pour le bureau, une cérémonie ou une sortie habillée.",
    couleur: "Vert émeraude et marron",
  },
  {
    title: "T-shirt femme blanc imprimé",
    price: 7000,
    description: "T-shirt blanc pour femme à manches courtes, agrémenté d’un imprimé coloré et original. Sa coupe classique et confortable se porte facilement avec un jean, un short ou une jupe pour composer une tenue décontractée.",
    couleur: "Blanc avec imprimé multicolore",
  },
  {
    title: "T-shirt femme beige « Miami City »",
    price: 7000,
    description: "T-shirt beige pour femme à la coupe ample et confortable, agrémenté d’un imprimé urbain « Miami City 62 ». Facile à associer avec un jean, un short ou un pantalon pour créer un look tendance et décontracté.",
    couleur: "Beige",
  },
  {
    title: "Jean femme taille haute à jambes larges",
    price: 10000,
    description: "Jean femme à taille haute et jambes larges, conçu pour mettre en valeur la silhouette tout en garantissant un bon confort. Disponible en bleu clair et bleu foncé, il s’accorde facilement avec un haut ajusté, une chemise, des baskets ou des talons.",
    couleur: "Bleu clair et bleu foncé",
  },
  {
    title: "Ensemble femme deux pièces noir et blanc",
    price: 15000,
    description: "Ensemble femme deux pièces noir et blanc composé d’une chemise ample boutonnée et d’un pantalon large assorti. Son imprimé graphique et sa coupe fluide offrent un style original et confortable, adapté aux sorties comme aux tenues décontractées.",
    couleur: "Noir et blanc",
  },
  {
    title: "Corset femme structuré à fines bretelles",
    price: 8000,
    description: "Corset femme structuré à fines bretelles, conçu pour mettre en valeur la silhouette. Disponible dans plusieurs coloris, il s’associe facilement avec un jean, un pantalon ou une jupe pour composer une tenue chic et tendance.",
    couleur: "Plusieurs coloris",
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

function userNames(data) {
  return [
    data.pseudo,
    data.searchableName,
    data.displayName,
    data.businessName,
    data.shopName,
    [data.firstname, data.lastname].filter(Boolean).join(" "),
  ].filter(Boolean);
}

async function findExactShopAccount(db, admin) {
  const expected = normalize(EXPECTED_SHOP_NAME);
  const candidates = new Map();
  const exactQueries = [
    ["pseudo", EXPECTED_SHOP_NAME],
    ["pseudo", expected],
    ["searchableName", expected],
    ["displayName", EXPECTED_SHOP_NAME],
    ["businessName", EXPECTED_SHOP_NAME],
    ["shopName", EXPECTED_SHOP_NAME],
  ];

  const snapshots = await Promise.all(
    exactQueries.map(([field, value]) => db.collection("users").where(field, "==", value).limit(5).get()),
  );
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) candidates.set(doc.id, doc);
  }

  // La requête exacte couvre le schéma actuel. Ce repli paginé ne sert qu'aux
  // anciens comptes où le nom de boutique était réparti entre prénom et nom.
  if (candidates.size === 0) {
    let lastDoc = null;
    do {
      let query = db.collection("users").orderBy(admin.firestore.FieldPath.documentId()).limit(250);
      if (lastDoc) query = query.startAfter(lastDoc);
      const snapshot = await query.get();
      for (const doc of snapshot.docs) {
        if (userNames(doc.data()).some((name) => normalize(name) === expected)) candidates.set(doc.id, doc);
      }
      lastDoc = snapshot.docs.at(-1) || null;
      if (snapshot.size < 250) break;
    } while (lastDoc);
  }

  const matches = [...candidates.values()].filter((doc) =>
    userNames(doc.data()).some((name) => normalize(name) === expected),
  );

  if (matches.length !== 1) {
    throw new Error(`Compte « ${EXPECTED_SHOP_NAME} » ambigu ou introuvable : ${matches.length} correspondance(s).`);
  }

  const doc = matches[0];
  return { uid: doc.id, ...doc.data() };
}

function resolveContact(shop) {
  const accountPhone = Array.isArray(shop.phoneNumbers) && shop.phoneNumbers[0];
  const contact = shop.callNumber || accountPhone || shop.whatsappNumber;
  if (!contact) throw new Error("Le compte Emilie Shop ne possède aucun numéro de contact.");
  return contact;
}

function firebaseDownloadUrl(bucketName, storagePath, token) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function optimizeImage(sourcePath) {
  const [main, thumb] = await Promise.all([
    sharp(sourcePath).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer(),
    sharp(sourcePath).rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer(),
  ]);
  return { main, thumb };
}

async function uploadImage(bucket, uid, propertyId, sourcePath) {
  const basePath = `property/${propertyId}`;
  const filePATH = `${basePath}/emilie-shop.webp`;
  const thumbPATH = `${basePath}/thumb_emilie-shop.webp`;
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

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet Firebase « ${process.env.FIREBASE_PROJECT_ID} », attendu « ${PROD_PROJECT_ID} ».`);
  }
  console.log(`Projet cible : ${PROD_PROJECT_ID}`);
  console.log(APPLY ? "Mode : APPLY (écriture production)" : "Mode : DRY-RUN (aucune écriture)");
  console.log("Validation des images, du compte et des catégories…");
  if (CATALOG.length !== 17) throw new Error(`Catalogue incomplet : ${CATALOG.length}/17 article(s).`);

  const imagePaths = CATALOG.map((_, index) => path.join(IMAGES_DIR, `${index + 1}.png`));
  const missingImages = imagePaths.filter((imagePath) => !fs.existsSync(imagePath));
  if (missingImages.length) throw new Error(`Images manquantes : ${missingImages.join(", ")}`);

  const hashes = imagePaths.map((imagePath) => crypto.createHash("sha256").update(fs.readFileSync(imagePath)).digest("hex"));
  if (new Set(hashes).size !== CATALOG.length) throw new Error("Deux fichiers image ou plus sont identiques.");

  const [shop, rootDoc, leafDoc] = await Promise.all([
    findExactShopAccount(db, admin),
    db.collection("listing_categories").doc("mode").get(),
    db.collection("listing_categories").doc("vetements").get(),
  ]);
  if (!rootDoc.exists || !leafDoc.exists) throw new Error("Catégories Mode/Vêtements introuvables en production.");

  const contact = resolveContact(shop);
  const rootName = rootDoc.data().name || "Mode";
  const leafName = leafDoc.data().name || "Vêtements";
  const plan = [];

  for (let index = 0; index < CATALOG.length; index += 1) {
    const sequence = String(index + 1).padStart(2, "0");
    const propertyId = `emilie-shop-20260918-${sequence}`;
    const existing = await db.collection("properties").doc(propertyId).get();
    plan.push({
      ...CATALOG[index],
      propertyId,
      imagePath: imagePaths[index],
      alreadyExists: existing.exists,
    });
  }

  console.log(`Compte : ${EXPECTED_SHOP_NAME} (${shop.uid})`);
  console.log(`Contact : ${contact}`);
  console.log(`Catégorie : ${rootName} > ${leafName}`);
  console.log(`Zones de disponibilité : ${ZONES.map((zone) => zone.city).join(", ")}`);
  console.log("Taille : non renseignée (information non fournie, aucune valeur inventée)");
  console.log("");

  for (const item of plan) {
    const status = item.alreadyExists ? "DÉJÀ IMPORTÉE" : "À IMPORTER";
    console.log(`- ${item.propertyId} [${status}] ${item.title} — ${item.price} FCFA — ${path.basename(item.imagePath)}`);
  }

  const pending = plan.filter((item) => !item.alreadyExists);
  console.log("");
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
      const uploaded = await uploadImage(bucket, shop.uid, item.propertyId, item.imagePath);
      uploadedPaths = uploaded.uploadedPaths;
      await db.collection("properties").doc(item.propertyId).create({
        title: item.title,
        description: item.description,
        price: item.price,
        images: [uploaded.image],
        categoryId: "vetements",
        categoryPath: { lvl0: rootName, lvl1: `${rootName} > ${leafName}` },
        attributes: {
          marque: EXPECTED_SHOP_NAME,
          genre: "Femme",
          etat: "Neuf",
          couleur: item.couleur,
        },
        street: "",
        zones: ZONES,
        cities: ZONES.map((zone) => zone.city),
        provinces: [...new Set(ZONES.map((zone) => zone.province))],
        city: PRIMARY_ZONE.city,
        province: PRIMARY_ZONE.province,
        country: "Gabon",
        countryCode: "GA",
        latitude: PRIMARY_ZONE.latitude,
        longitude: PRIMARY_ZONE.longitude,
        isLocExact: false,
        locationSource: "UNVERIFIED",
        contact,
        whatsappContact: shop.whatsappNumber || "",
        callContact: shop.callNumber || "",
        createdBy: shop.uid,
        ownerUids: [shop.uid],
        searchableName: normalize(item.title),
        moderationStatus: "PENDING",
        rejectionReason: null,
        state: "IN_PROGRESS",
        tags: [],
        importSource: IMPORT_SOURCE,
        importSourceId: item.propertyId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created += 1;
      console.log(`✓ ${item.propertyId} créée avec son image et sa vignette.`);
    } catch (error) {
      await Promise.all(uploadedPaths.map((storagePath) => bucket.file(storagePath).delete({ ignoreNotFound: true })));
      throw new Error(`Échec sur ${item.propertyId} (fichiers de cette annonce nettoyés) : ${error.message}`);
    }
  }

  console.log(`Import terminé : ${created} annonce(s) créée(s), ${plan.length - pending.length} ignorée(s) car déjà présentes.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
