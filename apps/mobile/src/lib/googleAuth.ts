import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { getAuth, GoogleAuthProvider, signInWithCredential } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from '@react-native-firebase/firestore';
import { buildNewGoogleUserDocument } from './firestoreUser';

// webClientId = client_type 3 (client OAuth "Web") de google-services.json — c'est celui-là
// qu'il faut passer à GoogleSignin.configure() (pas le client_type 1, spécifique Android/SHA-1)
// pour obtenir un idToken que Firebase Auth accepte, exactement comme GOOGLE_CLIENT_ID côté web
// (apps/location-maison/.env.local, auth.config.ts) — même client OAuth des deux côtés en dev.
const WEB_CLIENT_ID = '237524455298-35dqvnbrrtsek2tr6uf7s822sv13stin.apps.googleusercontent.com';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({ webClientId: WEB_CLIENT_ID });
  configured = true;
}

export class GoogleSignInCancelledError extends Error {}

// Miroir de handleGoogleSignIn / handleNewGoogleUser / handleExistingGoogleUser (web,
// oauth-google.service.ts) — voir [[feedback-mobile-reuse-pwa-design]]. Écart assumé : là où le
// web échange le code OAuth côté serveur (NextAuth) puis authentifie un Firebase Auth "serveur"
// juste pour satisfaire les règles Firestore (le navigateur, lui, ne voit jamais cette session
// Firebase — son état d'auth réel est le cookie de session NextAuth), le mobile n'a ni serveur
// ni NextAuth : l'échange idToken -> credential -> signInWithCredential se fait directement sur
// l'appareil, et c'est CETTE session Firebase qui devient l'état d'auth réel de l'app (comme
// pour email/mot de passe et téléphone). Ce n'est pas une déviation du modèle web, juste
// l'adaptation de la même logique à une architecture sans couche serveur intermédiaire.
export async function signInWithGoogle(): Promise<{ uid: string; isNewUser: boolean }> {
  ensureConfigured();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (isCancelledResponse(response)) {
    throw new GoogleSignInCancelledError();
  }
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new Error('Google Sign-In : aucun idToken renvoyé.');
  }

  const { idToken, user } = response.data;
  const { email, photo } = user;
  // Pas de second argument (access token) : GoogleSignin ne fournit pas d'access token OAuth
  // classique par défaut (offlineAccess non activé) — l'idToken seul suffit à
  // signInWithCredential, comme pour la vérification serveur côté web.
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(getAuth(), credential);
  const uid = userCredential.user.uid;

  const db = getFirestore();
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    await setDoc(userRef, buildNewGoogleUserDocument(uid, { email: email ?? userCredential.user.email ?? '', photoURL: photo }));
    return { uid, isNewUser: true };
  }

  // Compte déjà existant (créé par email/mot de passe, téléphone, ou une précédente connexion
  // Google) : on rattache juste 'GOOGLE' à ses providers s'il n'y est pas déjà — comme
  // handleExistingGoogleUser (web), sans la branche de liaison Facebook (le mobile n'a pas
  // d'auth Facebook).
  const existing = userSnap.data() as { providers?: string[] } | undefined;
  const providers = Array.isArray(existing?.providers) ? existing!.providers : [];
  if (!providers.includes('GOOGLE')) {
    await updateDoc(userRef, { providers: [...providers, 'GOOGLE'] });
  }

  return { uid, isNewUser: false };
}

export function mapGoogleSignInError(err: unknown): string | null {
  if (err instanceof GoogleSignInCancelledError) return null;

  if (isErrorWithCode(err)) {
    if (err.code === statusCodes.IN_PROGRESS) return null;
    if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return 'Google Play Services est indisponible ou obsolète sur cet appareil.';
    }
  }

  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/operation-not-allowed') {
    return "La connexion Google n'est pas activée pour le moment.";
  }

  return 'Impossible de se connecter avec Google. Réessayez.';
}
