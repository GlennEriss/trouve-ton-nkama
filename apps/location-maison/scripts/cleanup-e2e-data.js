/* eslint-disable no-console */
/**
 * Rattrapage manuel du backlog laissé par la suite Playwright dans
 * location-maison-dev :
 *   - comptes Firebase Auth (+ doc Firestore users/{uid})
 *   - objets Storage sous reels/<uid>/, reels-raw/<uid>/, ad-campaigns/<uid>/
 *   - objets Storage property/ orphelins (référencés par aucune annonce vivante)
 *
 * Depuis l'ajout du globalTeardown Playwright, ce ménage est fait automatiquement
 * après chaque run — ce script sert au rattrapage ponctuel.
 *
 * Usage :
 *   node scripts/cleanup-e2e-data.js            # DRY-RUN
 *   node scripts/cleanup-e2e-data.js --apply    # supprime
 */

const path = require("path");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

const APPLY = process.argv.includes("--apply");
const envPath = path.join(__dirname, "..", ".env.local.dev");
dotenv.config({ path: envPath });

const PROTECTED_UIDS = new Set(["announcer-e2e"]);
const PROTECTED_EMAIL = /@ttn\.ga$|^glenneriss@gmail\.com$/i;

const isE2eUid = (uid, email = "") =>
  !PROTECTED_UIDS.has(uid) &&
  !(email && PROTECTED_EMAIL.test(email)) &&
  (/e2e/i.test(uid) ||
    /^lot\d/i.test(uid) ||
    /^tmp-/i.test(uid) ||
    /^debug-checkbox/i.test(uid) ||
    /-owner-[0-9a-f]{8}-[0-9a-f]{4}-/i.test(uid) ||
    /@example\.(test|com)$/i.test(email));

function human(bytes) {
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i += 1; }
  return `${n.toFixed(1)} ${u[i]}`;
}

async function main() {
  const svc = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, "\n"),
  };
  if (svc.projectId !== "location-maison-dev") {
    throw new Error(`Refus : projet=${svc.projectId}, ce script ne cible que location-maison-dev.`);
  }
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(svc) });

  const auth = admin.auth();
  const db = admin.firestore();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
  const bucket = admin.storage().bucket(bucketName);

  // ---- 1. comptes Auth ----
  const users = [];
  let token;
  do {
    const res = await auth.listUsers(1000, token);
    users.push(...res.users);
    token = res.pageToken;
  } while (token);
  const staleUsers = users.filter((u) => isE2eUid(u.uid, u.email || ""));

  // ---- 2. objets Storage ----
  const [files] = await bucket.getFiles();
  const staleByPrefix = files.filter((f) => {
    const seg = f.name.split("/");
    if (["reels", "reels-raw", "ad-campaigns"].includes(seg[0]) && seg[1]) return isE2eUid(seg[1]);
    return false;
  });

  // property/ : namespace plat, pas de uid dans le chemin → on supprime les objets
  // référencés par AUCUNE annonce vivante (orphelins). Un `thumb_<base>` est conservé
  // tant que `<base>` est référencé.
  const props = await db.collection("properties").get();
  const referenced = new Set();
  props.forEach((d) => (d.data().images || []).forEach((im) => {
    if (im && im.filePATH) {
      referenced.add(im.filePATH);
      const base = im.filePATH.replace(/^property\//, "");
      referenced.add(`property/thumb_${base}`);
    }
    if (im && im.thumbnailPATH) referenced.add(im.thumbnailPATH);
  }));
  const staleProperty = files.filter((f) => f.name.startsWith("property/") && !referenced.has(f.name));

  const staleFiles = [...staleByPrefix, ...staleProperty];
  const staleBytes = staleFiles.reduce((s, f) => s + Number(f.metadata.size || 0), 0);

  console.log(`Projet : ${svc.projectId}`);
  console.log(`\n[Auth] ${staleUsers.length} compte(s) e2e / ${users.length} total`);
  console.log(`[Storage] ${staleFiles.length} objet(s) à supprimer (${human(staleBytes)}) / ${files.length} total`);
  console.log(`   - sous reels|reels-raw|ad-campaigns/<uid-e2e>/ : ${staleByPrefix.length}`);
  console.log(`   - property/ orphelins                          : ${staleProperty.length}`);
  console.log("\nObjets Storage visés :");
  staleFiles.forEach((f) => console.log(`   ${human(Number(f.metadata.size || 0)).padStart(9)}  ${f.name}`));

  if (!APPLY) {
    console.log("\nDRY-RUN — rien supprimé. Relancer avec --apply.");
    return;
  }

  // suppression
  const uids = staleUsers.map((u) => u.uid);
  let authOk = 0;
  for (let i = 0; i < uids.length; i += 1000) {
    authOk += (await auth.deleteUsers(uids.slice(i, i + 1000))).successCount;
  }
  let fsOk = 0;
  for (const uid of uids) {
    const ref = db.collection("users").doc(uid);
    if ((await ref.get()).exists) { await ref.delete(); fsOk += 1; }
  }
  const results = await Promise.allSettled(staleFiles.map((f) => f.delete()));
  const filesOk = results.filter((r) => r.status === "fulfilled").length;

  console.log(`\nAuth supprimés           : ${authOk}/${staleUsers.length}`);
  console.log(`Docs users/ supprimés    : ${fsOk}`);
  console.log(`Objets Storage supprimés : ${filesOk}/${staleFiles.length}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
