import * as functions from 'firebase-functions/v1';
import { createHash, randomUUID } from 'node:crypto';
import { adminDB } from '../admin';
import { createEmailTransport } from './transport';
import { enteredModeration, isPendingListing, moderationMessage } from './moderation-policy';

const COLLECTION = 'admin_moderation_email_dispatches';
const LEASE_MS = 120000;
const MAX_ATTEMPTS = 5;

const createModerationAlert = (collection: string, quick = false) => functions
  .runWith({ timeoutSeconds: 60, failurePolicy: true, secrets: ['HOSTINGER_EMAIL_USER', 'HOSTINGER_EMAIL_PASS', 'EMAIL_DISPLAY_NAME'] })
  .firestore.document(`${collection}/{propertyId}`)
  .onWrite(async (change, context) => {
    if (process.env.ADMIN_MODERATION_EMAIL_ENABLED !== 'true') return;
    if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.FORCE_REAL_EMAILS !== 'true') return;
    const after = change.after.data();
    if (!enteredModeration(change.before.data(), after)) return;
    const user = process.env.HOSTINGER_EMAIL_USER || '';
    const pass = process.env.HOSTINGER_EMAIL_PASS || '';
    const to = process.env.ADMIN_MODERATION_EMAIL_TO || '';
    const adminUrl = process.env.ADMIN_MODERATION_APP_URL || '';
    if (!user || !pass || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !adminUrl) {
      throw new Error('Configuration alerte administrateur incomplète');
    }
    const message = moderationMessage(context.params.propertyId, quick ? { ...after, title: after?.description, categoryId: 'Annonce rapide' } : after!, context.timestamp, adminUrl,
      quick ? '/dashboard/quick-listings-moderation' : '/dashboard/moderation');
    const key = createHash('sha256').update(context.eventId).digest('hex');
    const ref = adminDB.collection(COLLECTION).doc(key);
    const token = randomUUID();
    const claim = await adminDB.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const job = snapshot.data();
      if (['sent', 'failed', 'skipped'].includes(job?.status)) return 'done';
      if (job?.leaseUntil > Date.now()) return 'busy';
      if ((job?.attempts || 0) >= MAX_ATTEMPTS) {
        transaction.set(ref, { status: 'failed', updatedAt: new Date() }, { merge: true });
        return 'done';
      }
      transaction.set(ref, { status: 'processing', token, leaseUntil: Date.now() + LEASE_MS,
        attempts: (job?.attempts || 0) + 1, propertyId: context.params.propertyId,
        eventId: context.eventId, updatedAt: new Date() }, { merge: true });
      return 'claimed';
    });
    if (claim === 'done') return;
    if (claim === 'busy') throw new Error('Envoi déjà en cours');
    const finish = async (fields: Record<string, unknown>) => adminDB.runTransaction(async transaction => {
      const current = await transaction.get(ref);
      if (current.data()?.token === token) transaction.update(ref, { ...fields, leaseUntil: 0, updatedAt: new Date() });
    });
    try {
      const current = await change.after.ref.get();
      // Une modification ordinaire en PENDING ne supprime pas l'alerte.
      if (!isPendingListing(current.data())) { await finish({ status: 'skipped' }); return; }
      const transport = createEmailTransport(user, pass);
      try {
        const result = await transport.sendMail({ ...message,
          from: { name: process.env.EMAIL_DISPLAY_NAME || 'Trouve Ton Nkama', address: user }, to,
          messageId: `<moderation-${key}@tonnkama.com>` });
        if (!result.accepted.map(String).some(address => address.toLowerCase() === to.toLowerCase())) throw new Error('Destinataire non accepté');
        await finish({ status: 'sent', sentAt: new Date(), messageId: result.messageId });
      } finally { transport.close(); }
    } catch {
      await finish({ status: 'retry', errorCode: 'SEND_OR_RECORD_FAILED' });
      functions.logger.error('Alerte modération à reprendre', { propertyId: context.params.propertyId, dispatchId: key });
      throw new Error('Échec alerte modération');
    }
  });

export const onListingPendingNotifyAdmin = createModerationAlert('properties');
export const onQuickListingPendingNotifyAdmin = createModerationAlert('quick_listings', true);
