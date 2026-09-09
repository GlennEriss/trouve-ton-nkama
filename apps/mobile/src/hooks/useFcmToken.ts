import { useEffect } from 'react';
import { getMessaging, requestPermission, getToken, onTokenRefresh, AuthorizationStatus } from '@react-native-firebase/messaging';
import { getFirestore, doc, updateDoc, arrayUnion } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

// Ajoute le token FCM de cet appareil dans users/{uid}.fcmTokens (champ déjà lu par
// sendUserPush côté Cloud Functions, voir functions/src/notification/push.ts, et déjà
// autorisé en auto-modification par isSafeUserSelfUpdate() dans firestore.rules) — aucun
// changement backend nécessaire, la livraison push est agnostique de la plateforme.
async function registerToken(uid: string): Promise<void> {
  const messaging = getMessaging();
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;
  if (!enabled) return;

  const token = await getToken(messaging);
  if (!token) return;
  await updateDoc(doc(getFirestore(), 'users', uid), { fcmTokens: arrayUnion(token) });
}

export function useFcmToken(): void {
  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    registerToken(uid).catch(() => {});

    const messaging = getMessaging();
    const unsubscribe = onTokenRefresh(messaging, (token) => {
      updateDoc(doc(getFirestore(), 'users', uid), { fcmTokens: arrayUnion(token) }).catch(() => {});
    });
    return unsubscribe;
  }, []);
}
