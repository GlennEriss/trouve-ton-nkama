/* eslint-disable no-console */
/**
 * Script pour vérifier si un utilisateur existe dans Firebase Auth et Firestore
 * 
 * Usage:
 *   node scripts/check-user-exists.js <email>
 */

const path = require("path");
const admin = require("firebase-admin");
const dotenv = require("dotenv");

// Charger les variables d'environnement depuis .env.local.dev
const envPath = path.join(__dirname, "..", ".env.local.dev");
dotenv.config({ path: envPath });

// Initialiser Firebase Admin avec les variables du projet dev
function initFirestoreAdmin() {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      `Configuration Firebase incomplète: vérifie FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY dans ${envPath}`
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

async function checkUserExists(email) {
  try {
    console.log(`🔍 Vérification de l'utilisateur: ${email}`);
    console.log(`📦 Projet Firebase: ${process.env.FIREBASE_PROJECT_ID}\n`);
    
    const { admin, db } = initFirestoreAdmin();
    const adminAuth = admin.auth();

    // 1. Vérifier dans Firebase Auth
    console.log("1️⃣ Vérification dans Firebase Auth...");
    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      console.log(`   ✅ Utilisateur trouvé dans Firebase Auth:`);
      console.log(`      - UID: ${userRecord.uid}`);
      console.log(`      - Email: ${userRecord.email}`);
      console.log(`      - Email vérifié: ${userRecord.emailVerified}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`   ℹ️  Aucun utilisateur trouvé dans Firebase Auth`);
      } else {
        throw error;
      }
    }

    // 2. Vérifier dans Firestore par email
    console.log("\n2️⃣ Vérification dans Firestore (par email)...");
    const usersRef = db.collection('users');
    const emailQuery = await usersRef.where('email', '==', email).get();
    
    if (!emailQuery.empty) {
      console.log(`   ✅ ${emailQuery.size} document(s) trouvé(s) dans Firestore avec cet email:`);
      emailQuery.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`      Document ${index + 1}:`);
        console.log(`      - ID: ${doc.id}`);
        console.log(`      - UID: ${data.uid || 'N/A'}`);
        console.log(`      - Nom: ${data.firstname} ${data.lastname}`);
        console.log(`      - État: ${data.state || 'N/A'}`);
      });
    } else {
      console.log(`   ℹ️  Aucun document trouvé dans Firestore avec cet email`);
    }

    // 3. Vérifier dans Firestore par login
    console.log("\n3️⃣ Vérification dans Firestore (par login)...");
    const loginQuery = await usersRef.where('login', '==', email).get();
    
    if (!loginQuery.empty) {
      console.log(`   ✅ ${loginQuery.size} document(s) trouvé(s) dans Firestore avec ce login:`);
      loginQuery.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`      Document ${index + 1}:`);
        console.log(`      - ID: ${doc.id}`);
        console.log(`      - UID: ${data.uid || 'N/A'}`);
        console.log(`      - Nom: ${data.firstname} ${data.lastname}`);
        console.log(`      - État: ${data.state || 'N/A'}`);
      });
    } else {
      console.log(`   ℹ️  Aucun document trouvé dans Firestore avec ce login`);
    }

  } catch (error) {
    console.error(`❌ Erreur:`, error);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('❌ Erreur: Veuillez fournir un email');
  console.log('Usage: node scripts/check-user-exists.js <email>');
  process.exit(1);
}

checkUserExists(email);
