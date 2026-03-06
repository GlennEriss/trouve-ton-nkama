/* eslint-disable no-console */
/**
 * Script pour supprimer un utilisateur Firebase Auth par email
 * 
 * Usage:
 *   node scripts/delete-user-by-email.js <email>
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

async function deleteUserByEmail(email) {
  try {
    console.log(`🔍 Recherche de l'utilisateur avec l'email: ${email}`);
    
    // Initialiser Firebase Admin
    const { admin, db } = initFirestoreAdmin();
    const adminAuth = admin.auth();

    // 1. D'abord, chercher et supprimer tous les documents Firestore avec cet email
    console.log(`\n🔍 Recherche des documents Firestore avec l'email: ${email}`);
    const usersRef = db.collection('users');
    const emailQuery = await usersRef.where('email', '==', email).get();
    const loginQuery = await usersRef.where('login', '==', email).get();
    
    const allDocsToDelete = [];
    if (!emailQuery.empty) {
      emailQuery.docs.forEach(doc => {
        allDocsToDelete.push({ id: doc.id, type: 'email' });
      });
      console.log(`   ✅ ${emailQuery.size} document(s) trouvé(s) par email`);
    }
    if (!loginQuery.empty) {
      loginQuery.docs.forEach(doc => {
        if (!allDocsToDelete.find(d => d.id === doc.id)) {
          allDocsToDelete.push({ id: doc.id, type: 'login' });
        }
      });
      console.log(`   ✅ ${loginQuery.size} document(s) trouvé(s) par login`);
    }
    
    // Supprimer tous les documents Firestore trouvés
    if (allDocsToDelete.length > 0) {
      console.log(`\n🗑️  Suppression de ${allDocsToDelete.length} document(s) Firestore...`);
      for (const docInfo of allDocsToDelete) {
        await usersRef.doc(docInfo.id).delete();
        console.log(`   ✅ Document ${docInfo.id} (trouvé par ${docInfo.type}) supprimé`);
      }
    } else {
      console.log(`\nℹ️  Aucun document Firestore trouvé avec cet email/login`);
    }

    // 2. Trouver et supprimer l'utilisateur dans Firebase Auth (s'il existe)
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
      console.log(`\n✅ Utilisateur trouvé dans Firebase Auth:`);
      console.log(`   - UID: ${userRecord.uid}`);
      console.log(`   - Email: ${userRecord.email}`);
      console.log(`   - Email vérifié: ${userRecord.emailVerified}`);
      
      // Supprimer l'utilisateur de Firebase Auth
      console.log(`\n🗑️  Suppression de l'utilisateur de Firebase Auth...`);
      await adminAuth.deleteUser(userRecord.uid);
      console.log(`   ✅ Utilisateur supprimé de Firebase Auth`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`\nℹ️  Aucun utilisateur trouvé dans Firebase Auth avec l'email: ${email}`);
      } else {
        throw error;
      }
    }

    // 3. Si un utilisateur Firebase Auth a été trouvé, vérifier s'il reste un document avec son UID
    if (userRecord) {
      const userDoc = usersRef.doc(userRecord.uid);
      const docSnapshot = await userDoc.get();
      
      if (docSnapshot.exists) {
        console.log(`\n🗑️  Suppression du document Firestore avec UID ${userRecord.uid}...`);
        await userDoc.delete();
        console.log(`   ✅ Document Firestore supprimé`);
      }
    }

    console.log(`\n✅ Utilisateur ${email} supprimé avec succès!`);
  } catch (error) {
    console.error(`❌ Erreur lors de la suppression:`, error);
    process.exit(1);
  }
}

// Récupérer l'email depuis les arguments de ligne de commande
const email = process.argv[2];

if (!email) {
  console.error('❌ Erreur: Veuillez fournir un email');
  console.log('Usage: node scripts/delete-user-by-email.js <email>');
  process.exit(1);
}

deleteUserByEmail(email);
