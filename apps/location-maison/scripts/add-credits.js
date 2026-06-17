/* eslint-disable no-console */
/**
 * Ajoute des crédits à un utilisateur (recherche par email).
 *
 * Usage:
 *   node scripts/add-credits.js                       # glenneriss@gmail.com +100
 *   node scripts/add-credits.js <email> <montant>
 */

const path = require("path");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

const envPath = path.join(__dirname, "..", ".env.local.dev");
dotenv.config({ path: envPath });

function initFirestoreAdmin() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, "\n"),
  };
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(`Config Firebase incomplète dans ${envPath}`);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

async function main() {
  const email = (process.argv[2] || "glenneriss@gmail.com").toLowerCase();
  const amount = Number(process.argv[3] || 100);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("Montant invalide.");
  }

  const db = initFirestoreAdmin();
  console.log(`Projet: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`Recherche de l'utilisateur: ${email}`);

  const snap = await db.collection("users").where("email", "==", email).limit(1).get();
  if (snap.empty) {
    throw new Error(`Aucun utilisateur avec l'email ${email}`);
  }

  const doc = snap.docs[0];
  const before = Number(doc.data().credits ?? 0);
  await doc.ref.update({
    credits: admin.firestore.FieldValue.increment(amount),
    updatedAt: admin.firestore.Timestamp.now(),
  });

  const after = (await doc.ref.get()).data().credits;
  console.log(`✅ ${email} : ${before} → ${after} crédits (+${amount})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Échec:", err.message);
  process.exit(1);
});
