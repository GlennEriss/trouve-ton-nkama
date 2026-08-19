import '../node/slow-buffer-compat';
import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { adminDB } from '../admin';
import { needsPromotionExpiry, type RawPropertyRecord } from './expire-promotions.policy';

const DEFAULT_SCHEDULE = 'every 60 minutes';
const BATCH_CHUNK_SIZE = 400; // marge sous la limite Firestore de 500 écritures/batch.

/**
 * Désactive les promotions payantes (featured/trending) dont la date de fin est dépassée.
 *
 * Fait le pendant, côté écriture, de ce que /api/property/promoted recalcule déjà à chaque
 * lecture : sans ce nettoyage, `isPromoted` reste bloqué à `true` indéfiniment (jamais remis à
 * false ailleurs dans le code), ce qui fausserait durablement le classement Algolia — voir
 * expire-promotions.policy.ts pour le détail du raisonnement.
 */
export const expireStalePromotions = onSchedule(
  {
    schedule: process.env.PROMOTION_EXPIRY_SCHEDULE?.trim() || DEFAULT_SCHEDULE,
    timeZone: process.env.PROMOTION_EXPIRY_TIMEZONE?.trim() || 'Africa/Libreville',
    timeoutSeconds: 120,
    memory: '256MiB',
    retryCount: 1,
  },
  async () => {
    const snapshot = await adminDB.collection('properties').where('isPromoted', '==', true).get();

    const now = Date.now();
    const toExpire = snapshot.docs.filter((doc) => needsPromotionExpiry(doc.data() as RawPropertyRecord, now));

    if (toExpire.length === 0) {
      functions.logger.debug('No stale promotions to expire.');
      return;
    }

    for (let start = 0; start < toExpire.length; start += BATCH_CHUNK_SIZE) {
      const batch = adminDB.batch();
      for (const doc of toExpire.slice(start, start + BATCH_CHUNK_SIZE)) {
        batch.update(doc.ref, {
          isPromoted: false,
          'currentPromotion.isActive': false,
        });
      }
      await batch.commit();
    }

    functions.logger.info('Expired stale promotions.', { count: toExpire.length });
  },
);
