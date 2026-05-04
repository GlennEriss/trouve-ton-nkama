import { initializeApp, getApps } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";

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
