import { NextRequest, NextResponse } from 'next/server';
import { jest, beforeEach, it, expect } from '@jest/globals';
const mockGuard = jest.fn<(...args: any[]) => Promise<any>>();
let listing: any;
let privateDecision: any;
jest.mock('@/modules/iam/presentation/admin-guard', () => ({ requireAdmin: (...args: any[]) => mockGuard(...args) }));
jest.mock('@/lib/firebase/firebase-admin', () => ({ getFirebaseAdminDb: () => ({
  collection: (name: string) => ({ doc: (id: string) => ({ name, id }) }),
  runTransaction: async (cb: any) => cb({ get: async () => ({ data: () => listing }), update: (_ref: any, fields: any) => { listing = { ...listing, ...fields }; }, set: (_ref: any, data: any) => { privateDecision = data; } }),
}) }));
// The dedicated Jest config resolves @/ to the admin app; keep its tests in the
// existing Jest workspace instead of adding test dependencies to production admin.
const { POST } = require('../../../location-maison-admin/src/app/api/admin/v1/quick-listings/route');
const request = (decision = 'APPROVED', reason?: string) => new NextRequest('https://admin.example.com/api/admin/v1/quick-listings', {
  method: 'POST', headers: { origin: 'https://admin.example.com' }, body: JSON.stringify({ id: 'test-listing', decision, reason }),
});
beforeEach(() => {
  listing = { moderationStatus: 'PENDING', paymentStatus: 'confirmed', state: 'IN_PROGRESS' }; privateDecision = undefined;
  mockGuard.mockResolvedValue({ ok: true, admin: { uid: 'admin-test' } });
});
it('refuse un utilisateur non autorisé', async () => {
  mockGuard.mockResolvedValue({ ok: false, response: NextResponse.json({}, { status: 403 }) });
  expect((await POST(request())).status).toBe(403); expect(listing.moderationStatus).toBe('PENDING');
});
it('approuve et date la publication sans exposer l’administrateur', async () => {
  expect((await POST(request())).status).toBe(200);
  expect(mockGuard).toHaveBeenCalledWith(expect.anything(), 'listings.approve');
  expect(listing.moderationStatus).toBe('APPROVED'); expect(listing.publishedAt).toBeDefined();
  expect(listing.reviewedBy).toBeUndefined(); expect(privateDecision.reviewedBy).toBe('admin-test');
  expect((await POST(request())).status).toBe(409);
});
it('refuse une annonce impayée ou archivée', async () => {
  listing.paymentStatus = 'pending_confirmation'; expect((await POST(request())).status).toBe(409);
  listing.paymentStatus = 'confirmed'; listing.state = 'ARCHIVED'; expect((await POST(request())).status).toBe(409);
});
it('conserve le motif de rejet uniquement dans le document privé', async () => {
  expect((await POST(request('REJECTED'))).status).toBe(400);
  expect((await POST(request('REJECTED', 'Informations insuffisantes'))).status).toBe(200);
  expect(listing.moderationStatus).toBe('REJECTED'); expect(listing.reason).toBeUndefined();
  expect(privateDecision.reason).toBe('Informations insuffisantes');
});
