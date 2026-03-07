import * as functions from 'firebase-functions/v1';
import { admin, adminDB } from '../admin';
import { Notification } from '../models/notification';
import {
  matchesNewAnnouncementCriteria,
  type RawPropertyRecord,
  type RawUserRecord,
} from './new-announcement-policy';

const NEW_ANNOUNCEMENT_DISPATCH_COLLECTION = 'new_announcement_dispatch';

function sanitizeDocId(value: string): string {
  return value.replace(/[^\w.-]/g, '_').slice(0, 180);
}

function buildNewAnnouncementMessage(property: RawPropertyRecord): string {
  const title = typeof property.title === 'string' && property.title.trim().length > 0
    ? property.title.trim()
    : 'Nouvelle annonce';

  const locationParts = [property.city, property.province].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const locationLabel = locationParts.length > 0 ? ` (${locationParts.join(', ')})` : '';

  return `${title}${locationLabel} correspond à vos préférences.`;
}

export const onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const user = snapshot.data();
    const userId = user.uid;

    const notification: Notification = {
      title: 'Bienvenue sur Trouve Ton Nkama 👋',
      message: 'Merci de vous être inscrit ! Vous avez reçu 3 crédits gratuits pour commencer. Vous pouvez maintenant publier ou consulter des annonces immobilières au Gabon.',
      createdFor: userId,
      isRead: false,
      type: 'SECURITY',
      state: 'IN_PROGRESS',
      createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };

    await adminDB.collection('notifications').add(notification);

    // Vérifie si l'utilisateur ne s'est pas inscrit via CREDENTIALS
    const providers = user.providers ?? [];
    if (!providers.includes('CREDENTIALS')) {
      const profileNotification: Notification = {
        title: 'Complétez votre profil ✍️',
        message: 'Ajoutez vos informations personnelles pour profiter pleinement de la plateforme.',
        createdFor: userId,
        isRead: false,
        type: 'SECURITY',
        state: 'IN_PROGRESS',
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
        actionUrl: '/profil/informations'
      };

      await adminDB.collection('notifications').add(profileNotification);
    }
  });

export const onUserFavorisUpdate = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const uid = before.uid;

    const beforeFavoris = before.favoris ?? [];
    const afterFavoris = after.favoris ?? [];

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

export const onPropertyCreateNewAnnouncement = functions.firestore
  .document('properties/{propertyId}')
  .onCreate(async (snapshot, context) => {
    const propertyId = context.params.propertyId as string;
    const property = snapshot.data() as RawPropertyRecord;
    const createdBy = typeof property.createdBy === 'string' ? property.createdBy.trim() : '';

    if (!propertyId || !createdBy) {
      functions.logger.warn('Skipping new announcement dispatch: missing propertyId or createdBy', {
        propertyId,
        createdBy,
      });
      return null;
    }

    const usersSnapshot = await adminDB
      .collection('users')
      .where('notificationParameter.isNewAnnouncement', '==', true)
      .get();

    let recipientsMatched = 0;
    let notificationsCreated = 0;
    let recipientsSkipped = 0;

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data() as RawUserRecord;
      const uid = typeof user.uid === 'string' ? user.uid.trim() : '';

      if (!uid || uid === createdBy) {
        recipientsSkipped += 1;
        continue;
      }

      if (!matchesNewAnnouncementCriteria(user, property)) {
        recipientsSkipped += 1;
        continue;
      }

      recipientsMatched += 1;

      const dedupeDocId = sanitizeDocId(`${propertyId}:${uid}`);
      try {
        await adminDB.collection(NEW_ANNOUNCEMENT_DISPATCH_COLLECTION).doc(dedupeDocId).create({
          propertyId,
          uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (error: unknown) {
        const code = (error as { code?: unknown })?.code;
        if (code === 6 || code === 'already-exists') {
          recipientsSkipped += 1;
          continue;
        }
        functions.logger.error('Failed to create dedupe marker for new announcement', {
          propertyId,
          uid,
          error,
        });
        recipientsSkipped += 1;
        continue;
      }

      const notification: Notification = {
        idProperty: propertyId,
        type: 'ANNOUNCEMENT',
        title: 'Nouvelle annonce disponible',
        message: buildNewAnnouncementMessage(property),
        isRead: false,
        createdFor: uid,
        actionUrl: `/houseDetails/${propertyId}`,
        state: 'IN_PROGRESS',
        createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
      };

      try {
        await adminDB.collection('notifications').add(notification);
        notificationsCreated += 1;
      } catch (error) {
        functions.logger.error('Failed to create new announcement notification', {
          propertyId,
          uid,
          error,
        });
        recipientsSkipped += 1;
      }
    }

    functions.logger.info('New announcement dispatch completed', {
      propertyId,
      createdBy,
      recipientsMatched,
      notificationsCreated,
      recipientsSkipped,
    });

    return null;
  });
