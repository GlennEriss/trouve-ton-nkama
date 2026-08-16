/* eslint-disable no-console */

/**
 * Rattrapage (2026-08-16) : les 18 annonces importées d'occazGabon ont été créées avec
 * `attributes: {}` (l'import initial ne reprenait que titre/prix/photos). Sans attributs,
 * le bloc "Détails" de la fiche et tout filtrage par attribut restent vides.
 *
 * occazGabon a un champ `etat` (NEUF|COMME_NEUF|BON|USAGE) qui correspond à notre attribut
 * `etat`. On ne mappe QUE là où la correspondance est exacte avec les options réellement
 * déclarées dans `listing_categories/{id}.attributeSchema` en prod :
 *
 *   vetements / chaussures / accessoires → ["Neuf","Très bon état","Bon état","Satisfaisant"]
 *     NEUF → "Neuf", COMME_NEUF → "Très bon état", BON → "Bon état", USAGE → "Satisfaisant"
 *
 *   parfums-beaute → ["Neuf sous blister","Neuf sans blister","Entamé"]
 *     Options pensées pour des cosmétiques scellés, alors que la catégorie contient surtout
 *     des perruques/extensions chez ces vendeurs. "BON" n'a pas d'équivalent honnête
 *     ("Entamé" affirmerait qu'une perruque est entamée) → volontairement NON mappé, à
 *     arbitrer côté produit (élargir les options de la catégorie depuis /dashboard/categories).
 *
 * Aucune valeur n'est inventée : si la correspondance n'existe pas, l'attribut est laissé vide.
 *
 * Usage :
 *   node scripts/backfill-occazgabon-attributes.js            # dry-run (défaut)
 *   node scripts/backfill-occazgabon-attributes.js --apply     # écriture réelle (prod)
 */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const path = require("node:path");

const APPLY = process.argv.includes("--apply");
const PROD_PROJECT_ID = "location-maison-prod-167da";
const OCCAZ_SECRET_PATH =
  "/Users/glenneriss/Documents/projets/occazGabon/secrets/occaz-gabon-firebase-adminsdk-fbsvc-8161251599.json";
const OCCAZ_DB_NAME = "occaz-gabon-prod";

const GENERIC_ETAT = {
  NEUF: "Neuf",
  COMME_NEUF: "Très bon état",
  BON: "Bon état",
  USAGE: "Satisfaisant",
};

/**
 * Mapping par catégorie cible. parfums-beaute utilise désormais la même échelle générique :
 * ses options d'origine ("Neuf sous blister"/"Neuf sans blister"/"Entamé") ont été seedées
 * en supposant des cosmétiques scellés, alors que la catégorie contient surtout des
 * perruques/extensions — annoncer "Neuf sous blister" pour une perruque ou "Entamé" pour un
 * article en bon état serait une affirmation invérifiable sur de vrais produits.
 * `--fix-schema` élargit les options de la catégorie en conséquence (cf. FIXED_ETAT_OPTIONS).
 */
const ETAT_BY_CATEGORY = {
  vetements: GENERIC_ETAT,
  chaussures: GENERIC_ETAT,
  accessoires: GENERIC_ETAT,
  "parfums-beaute": GENERIC_ETAT,
};

/**
 * Échelle générique + "Entamé" conservé pour les parfums réellement ouverts : couvre à la
 * fois les cosmétiques et les perruques/extensions vendues dans cette catégorie.
 */
const FIXED_ETAT_OPTIONS = ["Neuf", "Très bon état", "Bon état", "Satisfaisant", "Entamé"];

async function loadOccazEtatByAnnonceId() {
  const { initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const serviceAccount = require(OCCAZ_SECRET_PATH);
  const app = initializeApp(
    { credential: cert(serviceAccount), projectId: serviceAccount.project_id },
    "occaz-attrs-readonly",
  );
  const db = getFirestore(app, OCCAZ_DB_NAME);
  const snap = await db.collection("annonces").where("statut", "==", "PUBLIEE").get();
  return new Map(snap.docs.map((d) => [d.id, d.data().etat]));
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet résolu "${process.env.FIREBASE_PROJECT_ID}".`);
  }
  console.log(`Projet : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(APPLY ? "Mode: APPLY (écriture réelle)" : "Mode: DRY-RUN (aucune écriture)");
  console.log("");

  // Corrige d'abord les options de la catégorie, sinon les valeurs écrites ci-dessous ne
  // feraient pas partie du schéma (le formulaire admin et la future UI de filtres se basent
  // dessus, et le service de création valide l'appartenance à `options`).
  const parfumsRef = db.collection("listing_categories").doc("parfums-beaute");
  const parfums = await parfumsRef.get();
  const parfumsSchema = (parfums.data()?.attributeSchema ?? []).map((field) =>
    field.key === "etat" ? { ...field, options: FIXED_ETAT_OPTIONS } : field,
  );
  const currentEtatOptions = (parfums.data()?.attributeSchema ?? []).find((f) => f.key === "etat")?.options;
  console.log("parfums-beaute — options etat actuelles :", JSON.stringify(currentEtatOptions));
  console.log("parfums-beaute — options etat corrigées :", JSON.stringify(FIXED_ETAT_OPTIONS));
  console.log("");

  const etatBySourceId = await loadOccazEtatByAnnonceId();
  const snap = await db.collection("properties").where("importSource", "==", "occazgabon").get();

  const planned = [];
  const skipped = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const sourceEtat = etatBySourceId.get(data.importSourceId);
    const mapping = ETAT_BY_CATEGORY[data.categoryId];
    const mapped = mapping && sourceEtat ? mapping[sourceEtat] : undefined;

    if (!mapped) {
      skipped.push({ title: data.title, categoryId: data.categoryId, sourceEtat });
      continue;
    }
    planned.push({ ref: doc.ref, title: data.title, categoryId: data.categoryId, sourceEtat, etat: mapped });
  }

  console.log("=== À remplir ===");
  for (const p of planned) {
    console.log(`  [${p.categoryId}] ${p.title}\n      etat: ${p.sourceEtat} → "${p.etat}"`);
  }
  console.log(`\nTotal à remplir : ${planned.length}/${snap.size}`);

  if (skipped.length > 0) {
    console.log("\n=== Laissées vides (aucune correspondance honnête) ===");
    for (const s of skipped) {
      console.log(`  [${s.categoryId}] ${s.title} (etat occazGabon: ${s.sourceEtat})`);
    }
  }

  if (!APPLY) {
    console.log("\nDry-run : aucune écriture. Relancer avec --apply pour appliquer.");
    return;
  }

  await parfumsRef.update({
    attributeSchema: parfumsSchema,
    updatedBy: "script:backfill-occazgabon-attributes",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log("✓ Options etat de parfums-beaute corrigées.");

  const batch = db.batch();
  for (const p of planned) {
    // merge sur attributes : n'écrase pas d'éventuels autres attributs déjà présents.
    batch.update(p.ref, {
      "attributes.etat": p.etat,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  if (planned.length > 0) await batch.commit();

  console.log(`\n✓ ${planned.length} annonce(s) mise(s) à jour.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
