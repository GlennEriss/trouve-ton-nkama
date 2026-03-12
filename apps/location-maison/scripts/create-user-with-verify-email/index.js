/* eslint-disable no-console */
/**
 * Script de création d'utilisateur avec email vérifié
 *
 * Crée un compte utilisateur dans Firebase Authentication avec emailVerified: true
 * et crée le document correspondant dans Firestore collection 'users'.
 *
 * Usage:
 *   node scripts/create-user-with-verify-email/index.js
 */

const path = require("node:path");

// Compat Node >= 25 pour dépendances legacy qui attendent buffer.SlowBuffer.
const bufferModule = require("node:buffer");
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

const { initFirestoreAdmin } = require("../openstreetmap/firestore-admin");

// Nom de la collection Firestore pour les utilisateurs
const COLLECTION_USERS = "users";

// Configuration de l'utilisateur à créer
const USER_DATA = {
  login: "kevingayitou@ttn.ga",
  password: "kevingayitou",
  roles: ["Announcer"],
  provider: ["CREDENTIALS"],
  credits: 100,
  firstname: "Kevin",
  lastname: "Gayitou",
  country: { name: "Gabon", code: "GA" },
  phoneNumbers: ["+24174203330"], // Format nettoyé : +241 74 20 33 30 -> +24174203330
  searchableName: "kevin gayitou",
};

// Paramètres de notification par défaut
const DEFAULT_NOTIFICATION_PARAMETER = {
  isNew: true,
  isAccountActivity: true,
  isNewAnnouncement: true,
  isFavoris: true,
  isPersonalizedSuggestions: true,
  isSystemUpdated: true,
};

// Crédits par défaut pour les comptes créés via script
const DEFAULT_CREDITS = 25;

async function checkUserExistsByEmail(email, adminAuth) {
  try {
    await adminAuth.getUserByEmail(email);
    return true; // Utilisateur existe
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return false; // Utilisateur n'existe pas
    }
    throw error; // Autre erreur
  }
}

async function checkUserExistsByPhoneNumber(phoneNumber, db) {
  try {
    const usersRef = db.collection(COLLECTION_USERS);
    const querySnapshot = await usersRef.where("phoneNumbers", "array-contains", phoneNumber).get();
    return !querySnapshot.empty; // true si trouvé, false sinon
  } catch (error) {
    console.error("Erreur lors de la vérification du numéro de téléphone:", error);
    throw error;
  }
}

async function createUserInFirebaseAuth(email, password, adminAuth) {
  // Créer l'utilisateur avec emailVerified: true directement
  const userRecord = await adminAuth.createUser({
    email: email,
    password: password,
    emailVerified: true, // Email vérifié directement
  });

  return userRecord;
}

async function createUserInFirestore(userData, uid, db) {
  const { Timestamp } = require("firebase-admin/firestore");

  const now = Timestamp.now();
  
  // IMPORTANT: Ne jamais stocker le password dans Firestore
  // Le password est géré uniquement par Firebase Authentication
  // Extraire les données nécessaires sans le password (comme dans Signup.tsx)
  const { password, ...userDetailsWithoutPassword } = userData;
  
  // Préparer les données pour Firestore (sans password)
  const firestoreUser = {
    uid: uid,
    login: userDetailsWithoutPassword.login,
    firstname: userDetailsWithoutPassword.firstname,
    lastname: userDetailsWithoutPassword.lastname,
    email: userDetailsWithoutPassword.login, // email = login
    country: userDetailsWithoutPassword.country,
    phoneNumbers: userDetailsWithoutPassword.phoneNumbers,
    phoneNumberVerified: false, // Non vérifié par défaut (nécessite OTP)
    roles: userDetailsWithoutPassword.roles,
    emailVerified: true, // Email vérifié
    providers: userDetailsWithoutPassword.provider,
    credits: userDetailsWithoutPassword.credits || DEFAULT_CREDITS,
    favoris: [],
    notificationParameter: DEFAULT_NOTIFICATION_PARAMETER,
    searchableName: userDetailsWithoutPassword.searchableName || `${userDetailsWithoutPassword.firstname} ${userDetailsWithoutPassword.lastname}`.toLowerCase(),
    state: "IN_PROGRESS",
    createdAt: now,
    updatedAt: now,
  };

  // Créer le document dans Firestore (utiliser l'UID comme document ID pour cohérence)
  await db.collection(COLLECTION_USERS).doc(uid).set(firestoreUser);

  return firestoreUser;
}

async function main() {
  try {
    console.log("🚀 Démarrage de la création d'utilisateur...\n");

    // 1. Initialiser Firebase Admin
    const { admin, db } = initFirestoreAdmin();
    // Utiliser admin.auth() directement au lieu de getAuth()
    const adminAuth = admin.auth();

    // 2. Vérifier que l'email n'existe pas déjà
    console.log(`📧 Vérification de l'email: ${USER_DATA.login}`);
    const emailExists = await checkUserExistsByEmail(USER_DATA.login, adminAuth);
    if (emailExists) {
      console.error(`❌ Erreur: L'email ${USER_DATA.login} est déjà associé à un compte.`);
      process.exit(1);
    }
    console.log("   ✅ Email disponible\n");

    // 3. Vérifier que le numéro de téléphone n'est pas déjà associé
    const phoneNumber = USER_DATA.phoneNumbers[0];
    console.log(`📱 Vérification du numéro de téléphone: ${phoneNumber}`);
    const phoneExists = await checkUserExistsByPhoneNumber(phoneNumber, db);
    if (phoneExists) {
      console.error(`❌ Erreur: Le numéro ${phoneNumber} est déjà associé à un compte.`);
      process.exit(1);
    }
    console.log("   ✅ Numéro de téléphone disponible\n");

    // 4. Créer l'utilisateur dans Firebase Authentication
    console.log("🔐 Création de l'utilisateur dans Firebase Authentication...");
    const userRecord = await createUserInFirebaseAuth(USER_DATA.login, USER_DATA.password, adminAuth);
    console.log(`   ✅ Utilisateur créé avec UID: ${userRecord.uid}`);
    console.log(`   ✅ Email vérifié: ${userRecord.emailVerified}\n`);

    // 5. Créer le document dans Firestore
    console.log("💾 Création du document dans Firestore...");
    const firestoreUser = await createUserInFirestore(USER_DATA, userRecord.uid, db);
    console.log(`   ✅ Document créé avec ID: ${userRecord.uid}\n`);

    // 6. Résumé
    console.log("📊 Résumé de la création:");
    console.log(`   - UID: ${userRecord.uid}`);
    console.log(`   - Email: ${firestoreUser.email}`);
    console.log(`   - Nom complet: ${firestoreUser.firstname} ${firestoreUser.lastname}`);
    console.log(`   - Rôles: ${firestoreUser.roles.join(", ")}`);
    console.log(`   - Crédits: ${firestoreUser.credits}`);
    console.log(`   - Email vérifié: ${firestoreUser.emailVerified}`);
    console.log(`   - Téléphone: ${firestoreUser.phoneNumbers.join(", ")}`);
    console.log(`   - Pays: ${firestoreUser.country.name} (${firestoreUser.country.code})\n`);

    console.log("✅ Utilisateur créé avec succès !");
    console.log(`\n💡 Note: Le numéro de téléphone n'est pas vérifié par défaut.`);
    console.log(`   L'utilisateur devra le vérifier via OTP lors de sa première connexion.\n`);
  } catch (error) {
    console.error("\n❌ Erreur lors de la création de l'utilisateur:", error);
    
    // Gestion spécifique des erreurs Firebase
    if (error.code === "auth/email-already-exists") {
      console.error("   → L'email est déjà utilisé par un autre compte.");
    } else if (error.code === "auth/invalid-email") {
      console.error("   → L'adresse email fournie n'est pas valide.");
    } else if (error.code === "auth/weak-password") {
      console.error("   → Le mot de passe est trop faible.");
    } else if (error.code === "auth/operation-not-allowed") {
      console.error("   → L'inscription par email/mot de passe n'est pas activée.");
    }
    
    process.exit(1);
  }
}

// Lancer le script
main();
