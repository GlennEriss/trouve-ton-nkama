/* eslint-disable no-console */

/**
 * Correction ponctuelle (2026-08-16) : les 18 annonces occazGabon importées la veille
 * (scripts/import-occazgabon-listings.js) avaient toutes `createdBy` = le compte de
 * l'utilisateur (ONDO Gerard), donc s'affichaient au nom de ce dernier au lieu du vrai
 * vendeur. Demande initiale (non respectée alors) : recréer les comptes vendeurs
 * occazGabon et leur rattacher leurs annonces.
 *
 * Ce script crée un VRAI compte annonceur par vendeur (Firebase Auth passwordless,
 * numéro de téléphone uniquement — occazGabon n'a ni email ni mot de passe, cf.
 * `apps/market/src/lib/auth.tsx` côté occazGabon) puis réaffecte `createdBy` sur ses
 * annonces.
 *
 * Pourquoi créer le compte Auth et pas seulement le doc Firestore : un numéro est unique
 * par projet Firebase, donc quand le vrai vendeur se connectera par OTP avec son numéro,
 * Firebase lui rendra EXACTEMENT cet uid → `resolveSessionUser({uid, phone})`
 * (features/auth/services/phone-auth.service.ts) retrouve ce doc, `ensurePhoneProvider`
 * passe `phoneNumberVerified` à true, et il voit directement ses annonces dans
 * "Mes annonces". Aucun mot de passe factice, aucune identité inventée.
 *
 * Le doc utilisateur reprend la forme exacte de `createMinimalPhoneUser`
 * (phone-auth.service.ts) : mêmes champs, mêmes rôles ['User','Announcer'], mêmes 3
 * crédits de bienvenue qu'un inscrit téléphone normal.
 *
 * Usage :
 *   node scripts/import-occazgabon-sellers.js               # dry-run (défaut)
 *   node scripts/import-occazgabon-sellers.js --apply        # écriture réelle (prod)
 */

const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const path = require("node:path");
const https = require("node:https");

const APPLY = process.argv.includes("--apply");
const PROD_PROJECT_ID = "location-maison-prod-167da";

const OCCAZ_SECRET_PATH =
  "/Users/glenneriss/Documents/projets/occazGabon/secrets/occaz-gabon-firebase-adminsdk-fbsvc-8161251599.json";
const OCCAZ_DB_NAME = "occaz-gabon-prod";

/**
 * Vendeurs cibles. `occazVendeurIds` peut en contenir plusieurs : "Royale parfumerie"
 * existait en DEUX comptes occazGabon (deux numéros) — l'utilisateur a confirmé que
 * +24165823103 est le compte INCORRECT et que tout doit aller sur +24177312395.
 * Les annonces des deux comptes sont donc fusionnées ici, et leur `contact` réaligné
 * sur le bon numéro (sinon l'auto-attribution par OTP échouerait pour ces 4 annonces).
 */
const TARGET_SELLERS = [
  {
    key: "royale-parfumerie",
    name: "Royale parfumerie",
    phone: "+24177312395",
    occazVendeurIds: ["uOYNu8ewtsQXJn2btWlRGSAmg5x2", "TcYAJ4l9HeZdHsrd3tfGLIazRCr1"],
    avatarFromVendeurId: "uOYNu8ewtsQXJn2btWlRGSAmg5x2",
  },
  {
    key: "dress-by-kth",
    name: "DRESS BY K’TH",
    phone: "+24162392203",
    occazVendeurIds: ["JrtjwrxZV2SnFvggzVxnNOAYssX2"],
    avatarFromVendeurId: "JrtjwrxZV2SnFvggzVxnNOAYssX2",
  },
  {
    key: "empire-elegance",
    name: "Empire elegance by S&S",
    phone: "+24174808635",
    occazVendeurIds: ["bfTJdpHVOUVTM90LSLGccmeY3cz1"],
    avatarFromVendeurId: "bfTJdpHVOUVTM90LSLGccmeY3cz1",
  },
  {
    key: "fleur",
    name: "Fleur",
    phone: "+24177606718",
    occazVendeurIds: ["08v3X8ob2WdO4pXLGPloCBixfSA3"],
    avatarFromVendeurId: "08v3X8ob2WdO4pXLGPloCBixfSA3",
  },
];

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchBuffer(res.headers.location).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers["content-type"] }));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}

/** photoURL occazGabon = data URI base64 le plus souvent, URL http sinon. */
function decodeAvatar(photoURL) {
  if (typeof photoURL !== "string" || photoURL.length === 0) return null;
  if (photoURL.startsWith("data:")) {
    const match = photoURL.match(/^data:([^;]+);base64,(.*)$/);
    if (!match) return null;
    return { kind: "buffer", contentType: match[1], buffer: Buffer.from(match[2], "base64") };
  }
  if (photoURL.startsWith("http")) return { kind: "url", url: photoURL };
  return null;
}

async function loadOccaz() {
  const { initializeApp, cert } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  // eslint-disable-next-line global-require, import/no-dynamic-require
  const serviceAccount = require(OCCAZ_SECRET_PATH);
  const app = initializeApp(
    { credential: cert(serviceAccount), projectId: serviceAccount.project_id },
    "occaz-sellers-readonly",
  );
  const db = getFirestore(app, OCCAZ_DB_NAME);

  const usersSnap = await db.collection("utilisateurs").get();
  const usersById = new Map(usersSnap.docs.map((d) => [d.id, d.data()]));

  const annSnap = await db.collection("annonces").where("statut", "==", "PUBLIEE").get();
  const vendeurByAnnonceId = new Map(annSnap.docs.map((d) => [d.id, d.data().vendeurId]));

  return { usersById, vendeurByAnnonceId };
}

async function main() {
  process.env.LOCATION_MAISON_ENV_PATH =
    process.env.LOCATION_MAISON_ENV_PATH || path.join(__dirname, "..", ".env.local.prod");
  const { initFirestoreAdmin } = require("./openstreetmap/firestore-admin");
  const { admin, db } = initFirestoreAdmin();

  if (process.env.FIREBASE_PROJECT_ID !== PROD_PROJECT_ID) {
    throw new Error(`Refus : projet résolu "${process.env.FIREBASE_PROJECT_ID}", attendu "${PROD_PROJECT_ID}".`);
  }
  console.log(`Projet cible : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(APPLY ? "Mode: APPLY (écriture réelle)" : "Mode: DRY-RUN (aucune écriture)");
  console.log("");

  const { usersById, vendeurByAnnonceId } = await loadOccaz();

  // Annonces importées la veille, retrouvées par leur champ de traçabilité.
  const propsSnap = await db.collection("properties").where("importSource", "==", "occazgabon").get();
  console.log(`Annonces importées trouvées en prod : ${propsSnap.size}`);

  const vendeurIdToSeller = new Map();
  for (const seller of TARGET_SELLERS) {
    for (const vid of seller.occazVendeurIds) vendeurIdToSeller.set(vid, seller);
  }

  // Répartition annonce -> vendeur cible
  const assignments = new Map(TARGET_SELLERS.map((s) => [s.key, []]));
  const unmatched = [];
  for (const doc of propsSnap.docs) {
    const sourceId = doc.data().importSourceId;
    const vendeurId = vendeurByAnnonceId.get(sourceId);
    const seller = vendeurId ? vendeurIdToSeller.get(vendeurId) : undefined;
    if (!seller) {
      unmatched.push({ id: doc.id, sourceId, vendeurId });
      continue;
    }
    assignments.get(seller.key).push(doc);
  }

  console.log("");
  console.log("=== Plan ===");
  for (const seller of TARGET_SELLERS) {
    const docs = assignments.get(seller.key);
    console.log(`\n${seller.name} (${seller.phone}) — ${docs.length} annonce(s)`);
    for (const d of docs) {
      const data = d.data();
      const contactFix = data.contact !== seller.phone ? `  [contact corrigé: ${data.contact} → ${seller.phone}]` : "";
      console.log(`   - ${data.title}${contactFix}`);
    }
  }
  if (unmatched.length > 0) {
    console.log("\n⚠️ Annonces non rattachées :", unmatched);
  }

  if (!APPLY) {
    console.log("");
    console.log("Dry-run : aucune écriture. Relancer avec --apply pour appliquer.");
    return;
  }

  console.log("");
  console.log("=== Application ===");
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = admin.storage().bucket(bucketName);

  for (const seller of TARGET_SELLERS) {
    const docs = assignments.get(seller.key);

    // 1) Compte Firebase Auth (téléphone uniquement). Réutilisé s'il existe déjà :
    //    un numéro est unique par projet, donc ré-exécuter le script est sans risque.
    let authUser = await admin.auth().getUserByPhoneNumber(seller.phone).catch(() => null);
    if (!authUser) {
      authUser = await admin.auth().createUser({ phoneNumber: seller.phone, displayName: seller.name });
      console.log(`  ✓ Compte Auth créé : ${seller.name} → ${authUser.uid}`);
    } else {
      console.log(`  = Compte Auth existant réutilisé : ${seller.name} → ${authUser.uid}`);
    }

    // 2) Avatar : réhébergé dans notre Storage (occazGabon le stocke souvent en base64
    //    dans le doc Firestore, trop lourd pour être recopié tel quel).
    let imageUrl = null;
    const avatar = decodeAvatar(usersById.get(seller.avatarFromVendeurId)?.photoURL);
    if (avatar) {
      try {
        const payload =
          avatar.kind === "buffer"
            ? { buffer: avatar.buffer, contentType: avatar.contentType }
            : await fetchBuffer(avatar.url);
        const ext = (payload.contentType || "").includes("png") ? "png" : "jpg";
        const storagePath = `users/${authUser.uid}/avatar.${ext}`;
        const file = bucket.file(storagePath);
        await file.save(payload.buffer, {
          metadata: { contentType: payload.contentType || "image/jpeg", cacheControl: "public, max-age=31536000" },
        });
        await file.makePublic();
        imageUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
      } catch (error) {
        console.error(`  ⚠️ Avatar non importé pour ${seller.name}: ${error.message}`);
      }
    }

    // 3) Doc utilisateur — même forme que createMinimalPhoneUser (phone-auth.service.ts).
    //    phoneNumberVerified reste FALSE : le numéro a été vérifié par OTP sur occazGabon,
    //    pas encore sur cette plateforme. Il passera à true tout seul à la première
    //    connexion OTP (ensurePhoneProvider), qui affichera alors le badge "Numéro vérifié".
    const userRef = db.collection("users").doc(authUser.uid);
    const existingUser = await userRef.get();
    if (existingUser.exists) {
      console.log(`  = Doc users/${authUser.uid} déjà présent, non écrasé`);
    } else {
      await userRef.set({
        uid: authUser.uid,
        login: seller.phone,
        firstname: seller.name,
        lastname: "",
        email: null,
        phoneNumbers: [seller.phone],
        phoneNumberVerified: false,
        roles: ["User", "Announcer"],
        emailVerified: false,
        providers: ["PHONE"],
        image: imageUrl,
        metadata: {
          needsProfileCompletion: true,
          importedFrom: "occazgabon",
          importedAt: new Date().toISOString(),
        },
        favoris: [],
        searchableName: seller.name.trim().toLowerCase(),
        credits: 3,
        state: "IN_PROGRESS",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✓ Doc users/${authUser.uid} créé (${seller.name})`);
    }

    // 4) Réaffectation des annonces + réalignement du contact si besoin.
    const batch = db.batch();
    for (const d of docs) {
      batch.update(d.ref, {
        createdBy: authUser.uid,
        contact: seller.phone,
        whatsappContact: seller.phone,
        callContact: seller.phone,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    if (docs.length > 0) await batch.commit();
    console.log(`  ✓ ${docs.length} annonce(s) rattachée(s) à ${seller.name}`);
  }

  console.log("");
  console.log("Terminé.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
