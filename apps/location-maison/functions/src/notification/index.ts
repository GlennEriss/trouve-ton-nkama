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

export const onUserFavorisUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const uid = before.uid;

    const beforeFavoris = before.favoris || [];
    const afterFavoris = after.favoris || [];

    // Vérifie s'il y a une nouvelle propriété ajoutée en favoris
    const added = afterFavoris.find((id: string) => !beforeFavoris.includes(id));
    if (!added) return;

    const propertySnap = await adminDB.collection('properties').doc(added).get();
    if (!propertySnap.exists) return;

    const property = propertySnap.data();

    const notification: Notification = {
      idProperty: added,
      type: 'BOOKMARKING',
      title: property?.title,
      isRead: false,
      createdFor: property?.createdBy,
      state: 'IN_PROGRESS',
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
      message: uid === property?.createdBy
        ? 'Une annonce a été ajoutée à vos favoris'
        : `${before.firstname ?? ''} ${before.lastname ?? ''} a ajouté votre annonce à ses favoris`,
      actionUrl: uid === property?.createdBy
        ? '/favoris'
        : `/property/${added}`,
    };

    // Notification pour l'annonceur (déjà en place)
    await adminDB.collection('notifications').add(notification);

    // Si l'utilisateur qui a mis en favoris est différent du créateur de l'annonce
    if (uid !== property?.createdBy) {
      const notificationForUser: Notification = {
        idProperty: added,
        type: 'BOOKMARKING',
        title: property?.title,
        isRead: false,
        createdFor: uid,
        state: 'IN_PROGRESS',
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        message: `Vous avez ajouté l'annonce "${property?.title}" à vos favoris`,
        actionUrl: `/favoris`,
      };

      await adminDB.collection('notifications').add(notificationForUser);
    }
  });