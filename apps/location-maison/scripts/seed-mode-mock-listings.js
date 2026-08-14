/* eslint-disable no-console */

/**
 * Bouchons de démo pour la catégorie Mode (Lot 2/5, voir docs/marketplace-multi-categories/
 * 07-lots-et-sequencement.md) : 5 annonces mock par sous-catégorie (Vêtements, Chaussures,
 * Parfums & beauté, Accessoires), directement APPROVED, pour peupler l'accueil/recherche/
 * onglets réels en DEV sans passer par le formulaire de saisie à chaque fois.
 *
 * DEV UNIQUEMENT : le script refuse d'écrire si le projet Firebase résolu est celui de
 * production (`location-maison-prod-167da`), même avec --apply.
 *
 * Idempotent par ID de document stable (`mock-<slug>-<index>`) : un rejeu ne duplique rien,
 * il saute les documents déjà présents (comme categories:seed, voir la leçon retenue au Lot 8).
 *
 * Usage :
 *   node scripts/seed-mode-mock-listings.js                 # dry-run (defaut)
 *   node scripts/seed-mode-mock-listings.js --apply          # ecriture reelle (dev)
 */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const path = require("node:path");

process.env.LOCATION_MAISON_ENV_PATH =
  process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.dev");

const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");

const PROD_PROJECT_ID = "location-maison-prod-167da";
const APPLY = process.argv.includes("--apply");

// Chef-lieux de provinces (packages/core/src/domain/gabon-locations.ts, recopié ici pour
// ne pas dépendre d'un import TS depuis un script CommonJS).
const LOCATIONS = [
  { province: "Estuaire", city: "Libreville", lat: 0.4162, lng: 9.4673 },
  { province: "Ogooué-Maritime", city: "Port-Gentil", lat: -0.7193, lng: 8.7815 },
  { province: "Haut-Ogooué", city: "Franceville", lat: -1.6332, lng: 13.5833 },
];

function image(slug, index) {
  return { fileURL: `https://picsum.photos/seed/mode-${slug}-${index}/800/800`, filePATH: "" };
}

// 5 annonces par feuille, avec des attributs cohérents avec le schéma seedé
// (apps/location-maison-admin/scripts/categories/seed-categories.ts::MODE_CHILDREN).
const MOCK_LISTINGS_BY_LEAF = {
  vetements: [
    { title: "Robe wax élégante", description: "Robe en wax authentique, coupe cintrée, portée deux fois seulement.", price: 18000, attributes: { taille: "M", marque: "Tissage Wax", genre: "Femme", etat: "Neuf", couleur: "Multicolore" } },
    { title: "Ensemble jogging Nike", description: "Jogging complet Nike, molleton doux, aucune tache ni trou.", price: 15000, attributes: { taille: "L", marque: "Nike", genre: "Homme", etat: "Très bon état", couleur: "Gris" } },
    { title: "Robe de soirée Zara", description: "Robe de soirée noire, taille ajustée, idéale cocktail ou mariage.", price: 25000, attributes: { taille: "S", marque: "Zara", genre: "Femme", etat: "Bon état", couleur: "Noire" } },
    { title: "T-shirt enfant H&M", description: "Lot de t-shirts enfant, coton, jamais portés hors essayage.", price: 5000, attributes: { taille: "XS", marque: "H&M", genre: "Enfant", etat: "Neuf", couleur: "Bleu" } },
    { title: "Ensemble streetwear unisexe", description: "Ensemble oversize style streetwear, très confortable.", price: 12000, attributes: { taille: "XL", marque: "Adidas", genre: "Unisexe", etat: "Satisfaisant", couleur: "Vert kaki" } },
  ],
  chaussures: [
    { title: "Baskets Nike Air Max", description: "Baskets Nike Air Max, semelle en bon état, peu de traces d'usure.", price: 25000, attributes: { pointure: "42", marque: "Nike", genre: "Homme", etat: "Très bon état" } },
    { title: "Escarpins talons Zara", description: "Escarpins à talon fin, portés une seule fois pour un événement.", price: 18000, attributes: { pointure: "38", marque: "Zara", genre: "Femme", etat: "Neuf" } },
    { title: "Bottines cuir Kickers", description: "Bottines en cuir véritable, ressemelées récemment.", price: 30000, attributes: { pointure: "43", marque: "Kickers", genre: "Homme", etat: "Bon état" } },
    { title: "Chaussures de sport Adidas", description: "Chaussures running unisexe, amorti encore correct.", price: 15000, attributes: { pointure: "40", marque: "Adidas", genre: "Unisexe", etat: "Satisfaisant" } },
    { title: "Sandales fille", description: "Sandales fillette, portées une saison, encore solides.", price: 6000, attributes: { pointure: "36", marque: "Générique", genre: "Enfant", etat: "Bon état" } },
  ],
  "parfums-beaute": [
    { title: "Eau de parfum Dior Sauvage 100ml", description: "Flacon neuf sous blister, jamais ouvert, achat en double.", price: 45000, attributes: { contenance: "100 ml", marque: "Dior", type: "Eau de parfum", etat: "Neuf sous blister" } },
    { title: "Crème hydratante Nivea", description: "Crème visage Nivea, entamée à environ 20%, encore beaucoup de contenu.", price: 8000, attributes: { contenance: "50 ml", marque: "Nivea", type: "Soin", etat: "Entamé" } },
    { title: "Eau de toilette CK One 100ml", description: "CK One, utilisé quelques fois, il en reste plus de la moitié.", price: 20000, attributes: { contenance: "100 ml", marque: "Calvin Klein", type: "Eau de toilette", etat: "Entamé" } },
    { title: "Rouge à lèvres MAC", description: "Rouge à lèvres MAC teinte Ruby Woo, neuf sans blister (testé une fois).", price: 12000, attributes: { contenance: "15 ml", marque: "MAC", type: "Cosmétique", etat: "Neuf sans blister" } },
    { title: "Parfum Chanel N°5 50ml", description: "Chanel N°5, cadeau reçu en double, jamais ouvert.", price: 60000, attributes: { contenance: "50 ml", marque: "Chanel", type: "Eau de parfum", etat: "Neuf sous blister" } },
  ],
  accessoires: [
    { title: "Sac à main en cuir", description: "Sac à main en cuir véritable, bandoulière amovible.", price: 35000, attributes: { categorieAccessoire: "Sac", marque: "Michael Kors", etat: "Très bon état" } },
    { title: "Montre connectée Fitbit", description: "Montre connectée, batterie encore bonne, chargeur inclus.", price: 28000, attributes: { categorieAccessoire: "Montre", marque: "Fitbit", etat: "Bon état" } },
    { title: "Lunettes de soleil Ray-Ban", description: "Lunettes Ray-Ban authentiques, étui d'origine fourni.", price: 22000, attributes: { categorieAccessoire: "Lunettes", marque: "Ray-Ban", etat: "Neuf" } },
    { title: "Collier plaqué or", description: "Collier plaqué or, ne noircit pas, porté occasionnellement.", price: 15000, attributes: { categorieAccessoire: "Bijou", marque: "Générique", etat: "Neuf" } },
    { title: "Ceinture cuir Fossil", description: "Ceinture en cuir Fossil, taille ajustable, boucle argentée.", price: 9000, attributes: { categorieAccessoire: "Ceinture", marque: "Fossil", etat: "Satisfaisant" } },
  ],
};

async function findAnnouncer(db) {
  const snapshot = await db.collection("users").limit(200).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const roles = Array.isArray(data.roles) ? data.roles : [];
    if (roles.some((role) => typeof role === "string" && role.trim().toLowerCase() === "announcer")) {
      return { uid: doc.id, phone: Array.isArray(data.phoneNumbers) ? data.phoneNumbers[0] : undefined };
    }
  }
  return null;
}

async function main() {
  const { db, admin } = initFirestoreAdmin();

  const resolvedProjectId = process.env.FIREBASE_PROJECT_ID;
  if (resolvedProjectId === PROD_PROJECT_ID) {
    throw new Error(
      `Refus d'écrire : le projet résolu est ${resolvedProjectId} (PRODUCTION). ` +
        "Ce script ne doit tourner qu'en dev. Vérifie LOCATION_MAISON_ENV_PATH.",
    );
  }
  console.log(`Projet Firebase résolu : ${resolvedProjectId}`);
  console.log(APPLY ? "Mode: APPLY (écriture réelle)" : "Mode: DRY-RUN (aucune écriture)");

  const categoriesSnapshot = await db.collection("listing_categories").get();
  const categoriesById = new Map(categoriesSnapshot.docs.map((doc) => [doc.id, doc.data()]));
  const root = categoriesById.get("mode");
  if (!root) {
    throw new Error(
      'Catégorie racine "mode" introuvable dans listing_categories. Lance ' +
        "categories:seed dans apps/location-maison-admin avant ce script.",
    );
  }
  const rootName = root.name || "Mode";

  const announcer = await findAnnouncer(db);
  if (!announcer) {
    console.log(
      "⚠️ Aucun compte avec le rôle Announcer trouvé dans `users` (dev) — les annonces mock " +
        'utiliseront un createdBy synthétique ("mock-seed-announcer") et un contact factice.',
    );
  } else {
    console.log(`Annonceur réutilisé pour createdBy : ${announcer.uid}`);
  }
  const announcerUid = announcer?.uid ?? "mock-seed-announcer";
  const contact = announcer?.phone ?? "+24177000000";

  let created = 0;
  let skipped = 0;
  const batch = db.batch();

  for (const [slug, listings] of Object.entries(MOCK_LISTINGS_BY_LEAF)) {
    const leaf = categoriesById.get(slug);
    if (!leaf) {
      console.log(`⚠️ Catégorie "${slug}" introuvable, annonces ignorées pour cette feuille.`);
      continue;
    }

    for (let index = 0; index < listings.length; index += 1) {
      const listing = listings[index];
      const docId = `mock-${slug}-${index + 1}`;
      const ref = db.collection("properties").doc(docId);

      // eslint-disable-next-line no-await-in-loop
      const existing = await ref.get();
      if (existing.exists) {
        skipped += 1;
        continue;
      }

      const location = LOCATIONS[(index + slug.length) % LOCATIONS.length];
      const createdAtOffsetMs = index * 60_000 + slug.length * 1000;

      created += 1;
      if (APPLY) {
        batch.set(ref, {
          title: listing.title,
          description: listing.description,
          price: listing.price,
          images: [image(slug, index + 1)],
          categoryId: slug,
          categoryPath: { lvl0: rootName, lvl1: `${rootName} > ${leaf.name}` },
          attributes: listing.attributes,
          street: "",
          city: location.city,
          province: location.province,
          country: "Gabon",
          countryCode: "GA",
          latitude: location.lat,
          longitude: location.lng,
          isLocExact: false,
          locationSource: "UNVERIFIED",
          contact,
          whatsappContact: contact,
          callContact: contact,
          createdBy: announcerUid,
          searchableName: listing.title.trim().toLowerCase(),
          moderationStatus: "APPROVED",
          moderationReviewedAt: admin.firestore.FieldValue.serverTimestamp(),
          moderationReviewedBy: "mock-seed-script",
          rejectionReason: null,
          state: "IN_PROGRESS",
          tags: [],
          mockSeed: true,
          createdAt: admin.firestore.Timestamp.fromMillis(Date.now() - createdAtOffsetMs),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }

  if (APPLY && created > 0) {
    await batch.commit();
  }

  console.log(`À créer: ${created}`);
  console.log(`Déjà présentes (ignorées): ${skipped}`);
  console.log(
    APPLY
      ? `Documents créés: ${created}`
      : "Dry-run: aucune écriture effectuée. Relancer avec --apply pour appliquer.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
