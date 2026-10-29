import { NextRequest, NextResponse } from 'next/server';
import { jest, beforeEach, it, expect } from '@jest/globals';

const mockGuard = jest.fn<(...args: any[]) => Promise<any>>();
const mockAnnouncer = jest.fn<(...args: any[]) => Promise<any>>();
const mockClassic = jest.fn<(...args: any[]) => Promise<any>>();
const mockDownload = jest.fn<(...args: any[]) => Promise<any>>();
const mockSave = jest.fn<(...args: any[]) => Promise<any>>();
let documents = new Map<string, any>();
let queue = Promise.resolve();
jest.mock('@/modules/iam/presentation/admin-guard', () => ({ requireAdmin: (...args: any[]) => mockGuard(...args) }));
jest.mock('@/modules/announcer-management/infrastructure/announcer.repository', () => ({ getAnnouncerUserByUid: (...args: any[]) => mockAnnouncer(...args) }));
jest.mock('@/modules/account-provisioning/application/account-provisioning.service', () => ({ createListingForAnnouncer: (...args: any[]) => mockClassic(...args) }));
jest.mock('@/modules/audit-compliance/application/audit-log.service', () => ({ logAudit: async () => {} }));
jest.mock('@/modules/apify/infrastructure/apify-remote-download', () => ({
  normalizeRemoteUrl: (url: string) => url.startsWith('https://') ? url : null,
  errorDetail: () => 'erreur réseau', downloadRemoteFile: (...args: any[]) => mockDownload(...args),
}));
jest.mock('@/lib/firebase/firebase-admin', () => ({
  getFirebaseAdminDb: () => ({
    collection: (name: string) => ({ doc: (id: string) => ({ id, path: `${name}/${id}` }) }),
    runTransaction: (cb: any) => {
      const result = queue.then(() => cb({
        get: async (ref: any) => ({ exists: documents.has(ref.path), data: () => documents.get(ref.path) }),
        create: (ref: any, value: any) => { if (documents.has(ref.path)) throw new Error('duplicate'); documents.set(ref.path, value); },
      }));
      queue = result.then(() => undefined, () => undefined); return result;
    },
  }),
  getFirebaseAdminStorage: () => ({ bucket: () => ({ name: 'test', file: () => ({ save: (...args: any[]) => mockSave(...args) }) }) }),
}));
const { POST } = require('../../../location-maison-admin/src/app/api/admin/v1/apify/import/route');
const { createApifyQuickListing } = require('../../../location-maison-admin/src/modules/apify/application/apify-quick-listing.service');
const draft = { title: 'Maison à louer', description: 'Maison à louer à Libreville pour 100000 FCFA.', province: 'Estuaire', city: 'Libreville', street: 'Nzeng Ayong', contact: '074124961', images: [], source: { rawText: 'Maison à louer 100000 FCFA', authorId: 'source-author' } };
const request = (drafts: any[]) => new NextRequest('https://admin.example.com/api/admin/v1/apify/import', { method: 'POST', body: JSON.stringify({ announcerUid: 'announcer', drafts }) });
beforeEach(() => {
  jest.clearAllMocks(); documents = new Map(); queue = Promise.resolve();
  mockGuard.mockResolvedValue({ ok: true, admin: { uid: 'admin', roles: ['admin'] }, correlationId: 'test' });
  mockAnnouncer.mockResolvedValue({ uid: 'announcer' });
  mockClassic.mockResolvedValue({ propertyId: 'classic' });
  mockDownload.mockResolvedValue({ status: 200, buffer: Buffer.from('test image'), contentType: 'image/jpeg' });
  mockSave.mockResolvedValue(undefined);
});
it('convertit sans upload ni fausse transaction financière et conserve une attribution privée', async () => {
  const response = await POST(request([draft])); const body = await response.json();
  expect(response.status).toBe(201); const result = body.data.results[0];
  expect(result).toMatchObject({ ok: true, imageCount: 0, alreadyExists: false });
  expect(result.propertyId).toBeUndefined();
  expect(mockGuard).toHaveBeenCalledWith(expect.anything(), 'listings.approve');
  expect(documents.get(`quick_listings/${result.quickListingId}`)).toMatchObject({ paymentStatus: 'not_required', moderationStatus: 'APPROVED', contactPhone: '+24174124961' });
  expect(documents.get(`quick_listing_moderation/${result.quickListingId}`)).toMatchObject({ announcerUid: 'announcer', reviewedBy: 'admin', paymentExemption: 'admin_apify_import' });
  expect(documents.size).toBe(2); expect(mockClassic).not.toHaveBeenCalled(); expect(mockDownload).not.toHaveBeenCalled();
});
it('déduplique les relances concurrentes et ne republie pas une annonce archivée', async () => {
  const results = await Promise.all([createApifyQuickListing(draft, 'announcer', 'admin'), createApifyQuickListing(draft, 'announcer', 'admin')]);
  expect(results[0].quickListingId).toBe(results[1].quickListingId); expect(results[1].alreadyExists).toBe(true); expect(documents.size).toBe(2);
  documents.get(`quick_listings/${results[0].quickListingId}`).state = 'ARCHIVED';
  await createApifyQuickListing({ ...draft, description: 'Texte corrigé par l’administrateur' }, 'other-announcer', 'admin');
  expect(documents.get(`quick_listings/${results[0].quickListingId}`).state).toBe('ARCHIVED');
});
it.each([{ contact: '' }, { province: '' }, { city: '' }, { description: 'court' }, { description: 'a'.repeat(3001) }])('refuse les données incomplètes %j', async patch => {
  await expect(createApifyQuickListing({ ...draft, ...patch }, 'announcer', 'admin')).rejects.toThrow('Annonce rapide');
  expect(documents.size).toBe(0);
});
it('vérifie le rôle annonceur', async () => {
  mockAnnouncer.mockResolvedValue(null);
  await expect(createApifyQuickListing(draft, 'missing', 'admin')).rejects.toThrow('Annonceur'); expect(documents.size).toBe(0);
});
it('refuse un import sans droit de modération avant toute écriture', async () => {
  mockGuard.mockImplementation(async (_req, permission) => permission === 'listings.approve' ? { ok: false, response: NextResponse.json({}, { status: 403 }) } : { ok: true, admin: { uid: 'admin' } });
  expect((await POST(request([draft]))).status).toBe(403); expect(documents.size).toBe(0);
});
it('ne convertit pas un échec de téléchargement en annonce sans photo', async () => {
  mockDownload.mockResolvedValue({ status: 403 });
  const body = await (await POST(request([{ ...draft, images: [{ fileURL: 'https://example.com/a.jpg' }] }]))).json();
  expect(body.data.results[0]).toMatchObject({ ok: false, imageCount: 0 }); expect(documents.size).toBe(0); expect(mockClassic).not.toHaveBeenCalled();
});
it('refuse les brouillons mal formés sans conversion', async () => {
  const body = await (await POST(request([null, { ...draft, images: undefined }]))).json();
  expect(body.data.failed).toBe(2); expect(documents.size).toBe(0);
});
it('conserve le chemin classique avec photos dans un lot mixte', async () => {
  const classic = { ...draft, typeProperty: 'Home', status: 'FOR_RENT', price: 100000, latitude: 0.4, longitude: 9.4, nbrRooms: 2, nbrKitchens: 1, nbrBathrooms: 1, nbrToilets: 1, nbrGarages: 0, nbrFloors: 0, nbrLivingRoom: 1, images: [{ fileURL: 'https://example.com/a.jpg' }] };
  const body = await (await POST(request([draft, classic]))).json();
  expect(body.data.results[0].quickListingId).toBeDefined();
  expect(body.data.results[1]).toMatchObject({ ok: true, propertyId: 'classic', imageCount: 1 });
  expect(mockClassic).toHaveBeenCalledTimes(1); expect(mockSave).toHaveBeenCalledTimes(1);
});
