import { App, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let cachedApp: App | undefined;

function getFirebaseAdminConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/gm, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase admin configuration. Expected FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.",
    );
  }

  return { projectId, clientEmail, privateKey };
}

export function getFirebaseAdminApp() {
  if (cachedApp) {
    return cachedApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    cachedApp = apps[0];
    return cachedApp;
  }

  cachedApp = initializeApp({
    credential: cert(getFirebaseAdminConfig()),
  });

  return cachedApp;
}

export function getFirebaseAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
