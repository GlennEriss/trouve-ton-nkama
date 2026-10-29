import { createHash } from 'node:crypto';
const store = new Map<string, any>();
let queue: Promise<unknown> = Promise.resolve();
const doc = (path: string): any => ({ path, update: async (data: any) => { store.set(path, { ...store.get(path), ...data }); } });
jest.mock('firebase-functions/v2/https', () => ({ onRequest: (_options: any, handler: any) => handler }));
jest.mock('../../src/admin', () => ({ adminDB: {
  collection: (name: string) => ({ doc: (id: string) => doc(`${name}/${id}`) }),
  runTransaction: (cb: any) => {
    const run = queue.then(() => cb({ get: async (ref: any) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
      update: (ref: any, data: any) => { store.set(ref.path, { ...store.get(ref.path), ...data }); } }));
    queue = run.catch(() => undefined); return run;
  },
} }));
jest.mock('../../src/payments/mypayga/config', () => ({
  MYPAYGA_SECRETS: [], isPhoneValidForNetwork: () => true,
  getMyPayGaConfig: () => ({ apiKey: 'test', callbackSecret: 'test-secret', apiBaseUrl: 'https://provider.invalid', currency: 'XAF', timeoutMs: 1500 }),
}));
import { computeCallbackHash, type CallbackPayload } from '../../src/payments/mypayga/callback-shared';
import { verifiedQuickOutcome } from '../../src/payments/quick-listings/policy';
import { initiateQuickListingPayment, quickListingPaymentCallback } from '../../src/payments/quick-listings';
const id = 'a'.repeat(64);
const ticket = 'b'.repeat(64);
const paymentPath = `quick_listing_payments/${id}`;
const listingPath = `quick_listings/${id}`;
const payload = (patch: Partial<CallbackPayload> = {}): CallbackPayload => {
  const p = { uniqueId: id, hash: '', amount: '200', orderStatus: '200', statusRequest: '', paymentToken: 'tok', paymentMethod: 'mobile_money', message: '', clientPhone: '074000000', currency: 'XAF', ...patch };
  p.hash = computeCallbackHash(p, 'test-secret'); return p;
};
async function invoke(handler: any, body: any) {
  const res: any = { code: 200, status: jest.fn(function (this: any, n: number) { this.code = n; return this; }), json: jest.fn(), sendStatus: jest.fn() };
  await handler({ method: 'POST', body }, res); return res;
}
const callback = (patch: Partial<CallbackPayload> = {}) => invoke(quickListingPaymentCallback, payload(patch));
beforeEach(() => {
  store.clear(); queue = Promise.resolve(); process.env.GCLOUD_PROJECT = 'test-dev';
  store.set(paymentPath, { amountXaf: 200, currency: 'XAF', status: 'pending_confirmation', initiationStarted: true, providerPaymentToken: 'tok',
    ticketHash: createHash('sha256').update(ticket).digest('hex'), ticketExpiresAt: Date.now() + 60000, payerPhone: '074000000', network: 'AM' });
  store.set(listingPath, { paymentStatus: 'pending_confirmation', moderationStatus: null, state: 'IN_PROGRESS' });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ payment_token: 'tok' }) });
});
it.each(['', '0', '-200', '199', 'NaN', 'Infinity'])('rejette le montant signé %s', amount => {
  expect(() => verifiedQuickOutcome(payload({ amount }), 'test-secret')).toThrow();
});
it('rejette une mauvaise signature', () => {
  expect(() => verifiedQuickOutcome({ ...payload(), hash: 'bad' }, 'test-secret')).toThrow();
});
it('ignore statusRequest non signé et les messages ambigus', () => {
  expect(verifiedQuickOutcome(payload({ orderStatus: 'pending', statusRequest: '200', message: 'not paid' }), 'test-secret')).toBeNull();
});
it('confirme une seule fois et préserve une décision admin sur rejeu', async () => {
  await Promise.all([callback(), callback()]);
  expect(store.get(listingPath).moderationStatus).toBe('PENDING');
  store.get(listingPath).moderationStatus = 'APPROVED';
  await callback(); await callback({ orderStatus: 'failed' });
  expect(store.get(paymentPath).status).toBe('confirmed');
  expect(store.get(listingPath).moderationStatus).toBe('APPROVED');
});
it('accepte un succès tardif après échec signé', async () => {
  await callback({ orderStatus: 'failed' }); await callback();
  expect(store.get(paymentPath).status).toBe('confirmed');
});
it('ne ressuscite pas une annonce supprimée', async () => {
  store.delete(listingPath); await callback();
  expect(store.has(listingPath)).toBe(false);
  expect(store.get(paymentPath).status).toBe('confirmed');
});
it('ne modère pas une annonce archivée', async () => {
  store.get(listingPath).state = 'ARCHIVED'; await callback();
  expect(store.get(listingPath).moderationStatus).toBeNull();
});
it('refuse un token différent et un paiement absent', async () => {
  expect((await callback({ paymentToken: 'other' })).code).toBe(409);
  store.delete(paymentPath); expect((await callback()).code).toBe(409);
});
it('ne débite qu’une fois même avec deux initiations concurrentes', async () => {
  store.get(paymentPath).initiationStarted = false;
  await Promise.all([invoke(initiateQuickListingPayment, { id, ticket }), invoke(initiateQuickListingPayment, { id, ticket })]);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('refuse un ticket invalide sans appel fournisseur', async () => {
  store.get(paymentPath).initiationStarted = false;
  expect((await invoke(initiateQuickListingPayment, { id, ticket: 'c'.repeat(64) })).code).toBe(403);
  expect(global.fetch).not.toHaveBeenCalled();
});
it('conserve pending après coupure et interdit un deuxième débit', async () => {
  store.get(paymentPath).initiationStarted = false;
  (global.fetch as jest.Mock).mockRejectedValue(new Error('timeout'));
  await invoke(initiateQuickListingPayment, { id, ticket });
  await invoke(initiateQuickListingPayment, { id, ticket });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(store.get(paymentPath).status).toBe('pending_confirmation');
});
