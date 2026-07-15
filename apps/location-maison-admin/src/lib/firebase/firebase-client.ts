import { initializeApp, getApps } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { FirebaseStorage, getStorage } from "firebase/storage";

function getFirebaseClientConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  if (!apiKey || !authDomain || !projectId || !appId) {
    throw new Error(
      "Missing Firebase client configuration. Expected NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID.",
    );
  }

  return { apiKey, authDomain, projectId, appId };
}

let cachedAuth: Auth | null = null;

export function getClientAuth() {
  if (cachedAuth) {
    return cachedAuth;
  }

  const app =
    getApps().length > 0 ? getApps()[0] : initializeApp(getFirebaseClientConfig());
  cachedAuth = getAuth(app);
  return cachedAuth;
}

let cachedStorage: FirebaseStorage | null = null;

// Ajouté pour l'upload direct-client des créas vidéo publicitaires
// (reels_infeed) — jusque-là l'admin n'utilisait le SDK client que pour
// l'authentification (getClientAuth), tout le reste passait par l'Admin SDK
// côté serveur. La session Firebase Auth du client persiste après connexion
// (signInWithEmailAndPassword sans signOut), donc request.auth.uid est
// disponible pour storage.rules ici aussi.
export function getClientStorage() {
  if (cachedStorage) {
    return cachedStorage;
  }

  const app =
    getApps().length > 0 ? getApps()[0] : initializeApp(getFirebaseClientConfig());
  cachedStorage = getStorage(app);
  return cachedStorage;
}
