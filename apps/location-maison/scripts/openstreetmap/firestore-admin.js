const admin = require("firebase-admin");
const path = require("node:path");

function initFirestoreAdmin() {
  // Par défaut, on réutilise le .env déjà maintenu par scripts/firebase
  // (afin d’éviter de dupliquer les secrets dans plusieurs endroits).
  const envPath =
    process.env.LOCATION_MAISON_ENV_PATH ||
    path.join(__dirname, "..", "firebase", ".env");

  // NB: dans l'environnement Cursor sandbox, la lecture de .env peut être bloquée (EPERM).
  // En local (hors sandbox), ça fonctionne normalement.
  const dotenv = require("dotenv");
  const res = dotenv.config({ path: envPath });

  // Réutiliser la config du dossier scripts/firebase (même modèle que tes scripts existants)
  // NB: le fichier lit FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY depuis .env
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const serviceAccount = require("../firebase/firebase-config.js");

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    const extra =
      res && res.error
        ? ` (dotenv error: ${res.error.code || ""} ${res.error.message || ""})`
        : "";
    throw new Error(
      `Configuration Firebase incomplète: vérifie FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY dans ${envPath}${extra}`
    );
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  }

  return { admin, db: admin.firestore() };
}

module.exports = { initFirestoreAdmin };


