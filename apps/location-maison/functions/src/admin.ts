import * as admin from 'firebase-admin';

export const adminApp =
  admin.apps.length === 0
    ? admin.initializeApp()
    : admin.apps[0];

export const adminDB = admin.firestore(adminApp!);
export const adminAuth = admin.auth(adminApp!);

export { admin };