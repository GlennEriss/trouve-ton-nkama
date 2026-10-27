import { EmailAuthProvider, GoogleAuthProvider, getAuth, linkWithCredential, reauthenticateWithCredential, reload } from '@react-native-firebase/auth';
import { arrayUnion, doc, getFirestore, updateDoc } from '@react-native-firebase/firestore';
import { requestGoogleIdentity } from './googleAuth';
import { apiFetch } from '../api/client';
import { requestFacebookCredential } from './facebookAuth';

export type AccountProvider = 'GOOGLE' | 'FACEBOOK';
const providerIds = { GOOGLE: 'google.com', FACEBOOK: 'facebook.com' };
export class AccountSessionChangedError extends Error {}
export function requireCurrentAccount() {
  const user = getAuth().currentUser;
  if (!user) throw new AccountSessionChangedError('Reconnectez-vous pour continuer.');
  return user;
}
function assertAccount(uid: string) {
  if (getAuth().currentUser?.uid !== uid) throw new AccountSessionChangedError('Votre session a changé. Recommencez.');
}

export async function linkAccountProvider(provider: AccountProvider, password?: string) {
  const user = requireCurrentAccount();
  await reload(user);
  assertAccount(user.uid);
  if (!user.providerData.some(item => item.providerId === providerIds[provider])) {
    if (user.providerData.some(item => item.providerId === 'password')) {
      if (!password?.trim() || !user.email) throw new Error('Veuillez entrer votre mot de passe.');
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
      assertAccount(user.uid);
    }
    const credential = provider === 'GOOGLE'
      ? GoogleAuthProvider.credential((await requestGoogleIdentity()).idToken!)
      : await requestFacebookCredential();
    assertAccount(user.uid);
    // Link to the captured account: NEVER signInWithCredential (would replace the session).
    await linkWithCredential(user, credential);
    assertAccount(user.uid);
  }
  // Safe to retry after a partial Firestore failure; no duplicate account or provider.
  await updateDoc(doc(getFirestore(), 'users', user.uid), { providers: arrayUnion(provider) });
  assertAccount(user.uid);
  let notificationSent = true;
  try {
    await apiFetch('/api/users/account-activity/notify', { method: 'POST', body: {
      eventType: 'ACCOUNT_PROVIDER_LINKED', eventId: `provider-linked:${user.uid}:${provider}`,
      context: { provider, source: 'login-and-security', actionUrl: '/login-and-security' },
    } });
  } catch { notificationSent = false; }
  return { notificationSent };
}

export function securityErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential') return 'Ce compte est déjà associé à un autre utilisateur.';
  if (code === 'auth/provider-already-linked') return 'Cette méthode est déjà associée à votre compte.';
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'Échec de la vérification. Vérifiez votre mot de passe.';
  if (code === 'auth/requires-recent-login') return 'Reconnectez-vous avant de modifier votre sécurité.';
  if (code === 'auth/too-many-requests') return 'Trop de tentatives. Réessayez plus tard.';
  if (error instanceof AccountSessionChangedError) return error.message;
  return 'Impossible de terminer l’association. Réessayez.';
}
