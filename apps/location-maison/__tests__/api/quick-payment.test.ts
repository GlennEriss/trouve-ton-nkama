/** @jest-environment node */
import { NextRequest } from 'next/server';
jest.mock('server-only', () => ({}), { virtual: true });
const store = new Map<string, any>();
let queue: Promise<unknown> = Promise.resolve();
const mockRef = (path: string): any => ({ path, get: async () => ({ exists: store.has(path), data: () => store.get(path) }) });
jest.mock('@/firebase/admin', () => ({ adminApp: {} }));
jest.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => 'now' }, getFirestore: () => ({
  collection: (name: string) => ({ doc: (id: string) => mockRef(`${name}/${id}`) }),
  runTransaction: (cb: any) => {
    const run = queue.then(() => cb({ get: (ref: any) => ref.get(), create: (ref: any, data: any) => store.set(ref.path, data), set: (ref: any, data: any) => store.set(ref.path, data) }));
    queue = run.catch(() => undefined); return run;
  },
}) }));
jest.mock('@/lib/location/gabon-osm-source.server', () => ({ getGabonOsmRootServer: async () => ({ root: {} }) }));
jest.mock('@/lib/location/gabon-osm-projection.server', () => ({ shouldPreferGabonOsmProjectionServer: () => false }));
jest.mock('@/data/gabon-osm-locations', () => ({ loadOSMLocationsFromRaw: () => ({ provinces: [{ name: 'Estuaire' }], cityToProvince: new Map([['Libreville', 'Estuaire']]), quarterToCity: new Map([['Nzeng-Ayong', 'Libreville']]) }) }));
import { POST } from '@/app/api/quick-listings/initiate/route';
import { GET } from '@/app/api/quick-listings/payments/status/route';
import { digest } from '@/features/quick-listings/payment.server';
const body = { draft: { description: 'Studio à louer 100 000 FCFA', address: { province: 'Estuaire', city: 'Libreville', district: 'Nzeng-Ayong' }, contactPhone: '+24166123456' }, payerPhone: '074000000', network: 'AM', operationSecret: 'a'.repeat(64) };
const request = (data: any = body, origin = 'http://localhost:3000') => new NextRequest('http://localhost:3000/api/quick-listings/initiate', { method: 'POST', headers: { origin }, body: JSON.stringify(data) });
beforeEach(() => { store.clear(); queue = Promise.resolve(); process.env.QUICK_LISTINGS_PAYMENTS_ENABLED = 'true'; process.env.FIREBASE_PROJECT_ID = 'test-dev'; global.fetch = jest.fn().mockResolvedValue({ ok: true }); });
it('réserve atomiquement à 200 FCFA et n’envoie qu’une initiation concurrente', async () => {
  const responses = await Promise.all([POST(request()), POST(request())]);
  expect(responses.map(r => r.status)).toEqual([202, 202]); expect(global.fetch).toHaveBeenCalledTimes(1);
  const payment = store.get(`quick_listing_payments/${digest(body.operationSecret)}`);
  expect(payment.amountXaf).toBe(200);
  const listing = store.get(`quick_listings/${digest(body.operationSecret)}`);
  expect(listing.moderationStatus).toBeNull(); expect(listing.payerPhone).toBeUndefined(); expect(listing.ticketHash).toBeUndefined();
});
it('refuse une clé réutilisée avec un autre texte', async () => {
  await POST(request());
  expect((await POST(request({ ...body, draft: { ...body.draft, description: 'Autre annonce à louer' } }))).status).toBe(409);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('refuse l’usurpation, le tarif client, une localisation inconnue et origine tierce', async () => {
  expect((await POST(request({ ...body, ownerUid: 'victim' }))).status).toBe(400);
  expect((await POST(request({ ...body, amount: 1 }))).status).toBe(400);
  expect((await POST(request({ ...body, draft: { ...body.draft, address: { ...body.draft.address, city: 'inconnue' } } }))).status).toBe(400);
  expect((await POST(request(body, 'https://evil.invalid'))).status).toBe(403);
  expect(global.fetch).not.toHaveBeenCalled();
});
it('borne les initiations par payeur', async () => {
  for (const key of ['a', 'b', 'c']) expect((await POST(request({ ...body, operationSecret: key.repeat(64) }))).status).toBe(202);
  expect((await POST(request({ ...body, operationSecret: 'd'.repeat(64) }))).status).toBe(429);
});
it('conserve la même référence après timeout', async () => {
  (global.fetch as jest.Mock).mockRejectedValue(new Error('timeout'));
  await POST(request()); await POST(request()); expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('protège le suivi par secret et ne retourne aucune donnée payeur', async () => {
  await POST(request());
  expect((await GET(new NextRequest('http://localhost:3000/api/quick-listings/payments/status'))).status).toBe(401);
  const response = await GET(new NextRequest('http://localhost:3000/api/quick-listings/payments/status', { headers: { authorization: `Bearer ${body.operationSecret}` } }));
  expect(await response.json()).toEqual({ transactionId: digest(body.operationSecret), status: 'pending_confirmation' });
  expect((await GET(new NextRequest('http://localhost:3000/api/quick-listings/payments/status', { headers: { authorization: `Bearer ${'b'.repeat(64)}` } }))).status).toBe(404);
});
it('reste fermé avant activation', async () => {
  process.env.QUICK_LISTINGS_PAYMENTS_ENABLED = 'false';
  expect((await POST(request())).status).toBe(503); expect(store.size).toBe(0);
});
