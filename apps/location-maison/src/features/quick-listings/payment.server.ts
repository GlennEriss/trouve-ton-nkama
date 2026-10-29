import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { QUICK_LISTING_PRICE_XAF } from './draft';
import type { QuickPaymentInput } from './payment';
import { loadOSMLocationsFromRaw, deserializeOSMLocationsData } from '@/data/gabon-osm-locations';
import { getGabonOsmRootServer } from '@/lib/location/gabon-osm-source.server';
import { loadGabonOsmProjectionSerializableServer, shouldPreferGabonOsmProjectionServer } from '@/lib/location/gabon-osm-projection.server';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export class QuickPaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function reserveQuickPayment(input: QuickPaymentInput) {
  if (!adminApp) throw new QuickPaymentError(503, 'Service indisponible. Aucun paiement lancé.');
  const db = getFirestore(adminApp);
  const id = digest(input.operationSecret);
  const ref = db.collection('quick_listing_payments').doc(id);
  const payloadHash = digest(JSON.stringify({ draft: input.draft, payerPhone: input.payerPhone, network: input.network }));
  // Same reference on retries, even after payment/decision; never issue a second debit.
  const previous = await ref.get();
  if (previous.exists) {
    if (previous.data()?.payloadHash !== payloadHash) throw new QuickPaymentError(409, 'Cette opération concerne une autre saisie. Reprenez son suivi.');
    return { id, created: false, ticket: '' };
  }
  const projection = shouldPreferGabonOsmProjectionServer() ? await loadGabonOsmProjectionSerializableServer() : null;
  const source = projection ? null : await getGabonOsmRootServer();
  const geo = projection ? deserializeOSMLocationsData(projection.data) : source && loadOSMLocationsFromRaw(source.root);
  if (!geo) throw new QuickPaymentError(503, 'Localisations indisponibles. Aucun paiement lancé.');
  const { province, city, district } = input.draft.address;
  if (!geo.provinces.some(p => p.name === province) || geo.cityToProvince.get(city) !== province || geo.quarterToCity.get(district) !== city)
    throw new QuickPaymentError(400, 'Localisation incohérente. Sélectionnez les valeurs proposées.');
  const ticket = randomBytes(32).toString('hex');
  const hour = Math.floor(Date.now() / 3600000);
  const phoneQuota = db.collection('quick_listing_payment_limits').doc(digest(`${hour}:${input.payerPhone}`));
  const globalQuota = db.collection('quick_listing_payment_limits').doc(`global-${hour}`);
  const created = await db.runTransaction(async tx => {
    const [current, phone, global] = await Promise.all([tx.get(ref), tx.get(phoneQuota), tx.get(globalQuota)]);
    if (current.exists) {
      if (current.data()?.payloadHash !== payloadHash) throw new QuickPaymentError(409, 'Opération déjà utilisée.');
      return false;
    }
    if ((phone.data()?.count ?? 0) >= 3 || (global.data()?.count ?? 0) >= 200)
      throw new QuickPaymentError(429, 'Trop de demandes de paiement. Réessayez plus tard.');
    const stamp = FieldValue.serverTimestamp();
    tx.set(phoneQuota, { count: (phone.data()?.count ?? 0) + 1 });
    tx.set(globalQuota, { count: (global.data()?.count ?? 0) + 1 });
    tx.create(ref, { listingId: id, payloadHash, amountXaf: QUICK_LISTING_PRICE_XAF, currency: 'XAF',
      payerPhone: input.payerPhone, network: input.network, status: 'pending_confirmation',
      ticketHash: digest(ticket), ticketExpiresAt: Date.now() + 15 * 60000, initiationStarted: false,
      createdAt: stamp, updatedAt: stamp });
    tx.create(db.collection('quick_listings').doc(id), { id, description: input.draft.description,
      province, city, neighborhood: district, contactPhone: input.draft.contactPhone,
      paymentStatus: 'pending_confirmation', moderationStatus: null, state: 'IN_PROGRESS',
      createdAt: stamp, updatedAt: stamp, publishedAt: null });
    return true;
  });
  return { id, created, ticket };
}
