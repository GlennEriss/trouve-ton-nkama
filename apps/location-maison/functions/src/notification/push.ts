import '../node/slow-buffer-compat';
import * as functions from 'firebase-functions/v1';
import { admin, adminDB } from '../admin';

const INVALID_FCM_TOKEN_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// Push FCM générique vers tous les appareils d'un utilisateur (lookup par champ
// uid, comme partout ailleurs). Best-effort : l'appelant doit wrapper dans un
// try/catch pour ne jamais bloquer l'action principale. Purge automatiquement
// les tokens invalides du doc user.
export async function sendUserPush(params: {
  uid: string;
  title: string;
  body: string;
  actionUrl: string;
  data?: Record<string, string>;
}): Promise<void> {
  const { uid, title, body, actionUrl, data } = params;

  const usersSnapshot = await adminDB
    .collection('users')
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const tokens = (userDoc.data().fcmTokens as string[] | undefined) ?? [];
  if (tokens.length === 0) {
    return;
  }

  const response = await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    webpush: {
      fcmOptions: { link: actionUrl },
      notification: { icon: '/icons/icon-192x192.png' },
    },
    data: { ...data, actionUrl },
  });

  const invalidTokens = response.responses
    .map((result, index) => ({ result, token: tokens[index] }))
    .filter(({ result }) => result.error && INVALID_FCM_TOKEN_ERROR_CODES.has(result.error.code))
    .map(({ token }) => token);

  if (invalidTokens.length > 0) {
    await userDoc.ref.update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
    });
    functions.logger.info('Removed invalid FCM tokens', {
      uid,
      removedCount: invalidTokens.length,
    });
  }

  functions.logger.info('Push notification sent', {
    uid,
    successCount: response.successCount,
    failureCount: response.failureCount,
  });
}
