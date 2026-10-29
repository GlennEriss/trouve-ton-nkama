import '../../node/slow-buffer-compat';
import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { adminDB } from '../../admin';
import { getMyPayGaConfig, MYPAYGA_SECRETS, isPhoneValidForNetwork } from '../mypayga/config';
import { buildCallbackPayload, timingSafeEqual } from '../mypayga/callback-shared';
import { QUICK_AMOUNT_XAF, verifiedQuickOutcome } from './policy';

const digest = (v: string) => createHash('sha256').update(v).digest('hex');
const validKey = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);

export const initiateQuickListingPayment = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  if (req.method !== 'POST') { res.sendStatus(405); return; }
  const { id, ticket } = req.body ?? {};
  if (!validKey(id) || !validKey(ticket)) { res.sendStatus(403); return; }
  const config = getMyPayGaConfig();
  const project = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!config.apiKey || !config.callbackSecret || !project || config.currency !== 'XAF') { res.sendStatus(503); return; }
  const ref = adminDB.collection('quick_listing_payments').doc(id);
  try {
    const payment = await adminDB.runTransaction(async tx => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (!data || !timingSafeEqual(data.ticketHash ?? '', digest(ticket)) || data.ticketExpiresAt < Date.now()) throw new Error('FORBIDDEN');
      if (data.initiationStarted || data.status !== 'pending_confirmation') return null;
      if (data.amountXaf !== QUICK_AMOUNT_XAF || data.currency !== 'XAF' || !['AM', 'MM'].includes(data.network) || !isPhoneValidForNetwork(data.payerPhone, data.network)) throw new Error('INVALID');
      tx.update(ref, { initiationStarted: true, updatedAt: FieldValue.serverTimestamp() });
      return data;
    });
    if (!payment) { res.status(200).json({ accepted: true }); return; }
    try {
      const response = await fetch(`${config.apiBaseUrl.replace(/\/+$/, '')}/v1/payment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(config.timeoutMs),
        body: JSON.stringify({ urls: { callback_url: `https://us-central1-${project}.cloudfunctions.net/quickListingPaymentCallback`, success_url: config.successUrl, fail_url: config.failUrl },
          apikey: config.apiKey, client_phone: payment.payerPhone, amount: String(QUICK_AMOUNT_XAF), country: config.country,
          network: payment.network, type: 'mobile_money', unique_id: id, firstname: 'Visiteur', lastname: 'Trouve Ton Nkama',
          currency: 'XAF', description: 'Annonce rapide' }),
      });
      const result = await response.json().catch(() => null);
      const token = typeof result?.payment_token === 'string' ? result.payment_token : '';
      // HTTP rejection/timeout is not a verified financial failure. Remain pending for reconciliation.
      await adminDB.runTransaction(async tx => {
        const current = await tx.get(ref);
        if (!current.exists) return;
        const fields: { updatedAt: FieldValue; initiationResponse: string; providerPaymentToken?: string } = { updatedAt: FieldValue.serverTimestamp(), initiationResponse: response.ok ? 'received' : 'indeterminate' };
        if (token) fields.providerPaymentToken = token;
        tx.update(ref, fields);
      });
    } catch {
      await ref.update({ initiationResponse: 'indeterminate', updatedAt: FieldValue.serverTimestamp() });
    }
    res.status(202).json({ accepted: true });
  } catch { res.status(403).json({ error: 'operation_not_authorized' }); }
});

export const quickListingPaymentCallback = onRequest({ secrets: MYPAYGA_SECRETS }, async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') { res.sendStatus(405); return; }
  const payload = buildCallbackPayload(req);
  let outcome: 'confirmed' | 'failed' | null;
  try { outcome = verifiedQuickOutcome(payload, getMyPayGaConfig().callbackSecret || ''); }
  catch { res.status(401).json({ error: 'invalid_callback' }); return; }
  if (!outcome) { res.status(202).json({ pending: true }); return; }
  try {
    await adminDB.runTransaction(async tx => {
      const ref = adminDB.collection('quick_listing_payments').doc(payload.uniqueId);
      const listingRef = adminDB.collection('quick_listings').doc(payload.uniqueId);
      const [paymentSnap, listingSnap] = await Promise.all([tx.get(ref), tx.get(listingRef)]);
      const payment = paymentSnap.data();
      if (!payment || payment.amountXaf !== QUICK_AMOUNT_XAF || !payment.initiationStarted) throw new Error('UNKNOWN_PAYMENT');
      if (payment.providerPaymentToken && payment.providerPaymentToken !== payload.paymentToken) throw new Error('TOKEN_MISMATCH');
      if (payment.status === 'confirmed') return;
      const now = FieldValue.serverTimestamp();
      tx.update(ref, { status: outcome, callbackVerified: true, updatedAt: now,
        ...(outcome === 'confirmed' ? { completedAt: now } : {}) });
      const listing = listingSnap.data();
      if (!listing) return; // Keep financial proof, never resurrect a deleted listing.
      tx.update(listingRef, { paymentStatus: outcome, updatedAt: now,
        ...(outcome === 'confirmed' && listing.state === 'IN_PROGRESS' && listing.moderationStatus == null ? { moderationStatus: 'PENDING' } : {}) });
    });
    res.status(200).json({ ok: true });
  } catch { res.status(409).json({ error: 'callback_not_applied' }); }
});
