import { listPublicQuickListings } from '@/features/quick-listings/public-listing.server';
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/firebase/admin', () => ({ adminApp: {} }));
const mockQuery = { where: jest.fn().mockReturnThis(), orderBy: jest.fn().mockReturnThis(), startAfter: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), get: jest.fn() };
jest.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({ collection: () => mockQuery }), FieldPath: { documentId: () => '__name__' }, Timestamp: class { constructor(public seconds: number, public nanoseconds: number) {} } }));
const data = { description: 'Description de test pour maison', province: 'Estuaire', city: 'Libreville', contactPhone: '+24160000000', paymentStatus: 'confirmed', moderationStatus: 'APPROVED', state: 'IN_PROGRESS' };
const doc = (id: string, extra = {}) => ({ id, data: () => ({ ...data, ...extra }), get: () => ({ seconds: 1234, nanoseconds: 2 }) });
beforeEach(() => jest.clearAllMocks());
it('filtre serveur, trie et lit uniquement limite + 1', async () => {
  mockQuery.get.mockResolvedValue({ docs: [doc('a'), doc('b')], size: 2 });
  const page = await listPublicQuickListings(1);
  expect(mockQuery.where.mock.calls).toEqual([['paymentStatus', '==', 'confirmed'], ['moderationStatus', '==', 'APPROVED'], ['state', '==', 'IN_PROGRESS']]);
  expect(mockQuery.orderBy.mock.calls).toEqual([['publishedAt', 'desc'], ['__name__', 'desc']]);
  expect(mockQuery.limit).toHaveBeenCalledWith(2);
  expect(page.items.map(item => item.id)).toEqual(['a']);
  expect(JSON.parse(Buffer.from(page.nextCursor!, 'base64url').toString())).toEqual({ seconds: 1234, nanoseconds: 2, id: 'a' });
});
it('avance même si une donnée invalide doit être écartée', async () => {
  mockQuery.get.mockResolvedValue({ docs: [doc('a', { contactPhone: '' }), doc('b')], size: 2 });
  const page = await listPublicQuickListings(1, { seconds: 2000, nanoseconds: 0, id: 'previous' });
  expect(mockQuery.startAfter).toHaveBeenCalledWith(expect.objectContaining({ seconds: 2000 }), 'previous');
  expect(page.items).toEqual([]);
  expect(page.nextCursor).not.toBeNull();
});
it('termine la pagination et refuse une limite non bornée', async () => {
  mockQuery.get.mockResolvedValue({ docs: [], size: 0 });
  expect(await listPublicQuickListings(20)).toEqual({ items: [], nextCursor: null });
  await expect(listPublicQuickListings(10000)).rejects.toThrow('invalid_limit');
});
