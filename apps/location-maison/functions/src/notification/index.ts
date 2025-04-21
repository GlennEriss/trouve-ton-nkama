import * as functions from 'firebase-functions/v1';
import { admin } from '../admin';
import { adminDB } from '../admin';
import { Notification } from '../models/notification';

export const onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const user = snapshot.data();
    const userId = user.uid;

    const notification: Notification = {
      title: 'Bienvenue sur LogisGabon 👋',
      message: 'Merci de vous être inscrit. Vous pouvez maintenant publier ou consulter des annonces immobilières au Gabon.',
      createdFor: userId,
      isRead: false,
      type: 'SECURITY',
      state: 'IN_PROGRESS',
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };

    await adminDB.collection('notifications').add(notification);
  });