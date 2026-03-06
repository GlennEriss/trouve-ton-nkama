/* eslint-disable no-console */
/**
 * Script pour lister tous les utilisateurs dans Firestore
 * 
 * Usage:
 *   node scripts/list-all-users.js
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

async function listAllUsers() {
  try {
    console.log(`📦 Projet Firebase: ${process.env.FIREBASE_PROJECT_ID}\n`);
    
    const { db } = initFirestoreAdmin();
    const usersRef = db.collection('users');
    const snapshot = await usersRef.get();
    
    console.log(`📊 Total d'utilisateurs dans Firestore: ${snapshot.size}\n`);
    
    if (snapshot.empty) {
      console.log('ℹ️  Aucun utilisateur trouvé dans Firestore');
      return;
    }
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`Utilisateur ${index + 1}:`);
      console.log(`  - ID: ${doc.id}`);
      console.log(`  - UID: ${data.uid || 'N/A'}`);
      console.log(`  - Email: ${data.email || 'N/A'}`);
      console.log(`  - Login: ${data.login || 'N/A'}`);
      console.log(`  - Nom: ${data.firstname || 'N/A'} ${data.lastname || 'N/A'}`);
      console.log(`  - État: ${data.state || 'N/A'}`);
      console.log('');
    });
    
    // Chercher spécifiquement l'email
    const emailToFind = 'hetiwoh254@feanzier.com';
    const emailQuery = await usersRef.where('email', '==', emailToFind).get();
    const loginQuery = await usersRef.where('login', '==', emailToFind).get();
    
    if (!emailQuery.empty || !loginQuery.empty) {
      console.log(`\n🔍 Recherche spécifique pour: ${emailToFind}`);
      if (!emailQuery.empty) {
        console.log(`  ✅ Trouvé ${emailQuery.size} utilisateur(s) avec cet email`);
      }
      if (!loginQuery.empty) {
        console.log(`  ✅ Trouvé ${loginQuery.size} utilisateur(s) avec ce login`);
      }
    } else {
      console.log(`\n🔍 Aucun utilisateur trouvé avec l'email/login: ${emailToFind}`);
    }
    
  } catch (error) {
    console.error(`❌ Erreur:`, error);
    process.exit(1);
  }
}

listAllUsers();
