import { getPublicQuickListing } from '@/features/quick-listings/public-listing.server';
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/firebase/admin', () => ({ adminApp: {} }));
const mockGet = jest.fn();
const mockDoc = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({ doc: mockDoc }));
jest.mock('firebase-admin/firestore', () => ({ getFirestore: () => ({ collection: mockCollection }) }));
beforeEach(() => jest.clearAllMocks());

it.each(['', '../secret', 'a/b', '.'])('refuse un identifiant invalide %s sans lecture', async (id) => {
  expect(await getPublicQuickListing(id)).toBeNull();
  expect(mockGet).not.toHaveBeenCalled();
});
it('ne publie pas un document en attente lu via Admin SDK', async () => {
  mockGet.mockResolvedValue({ exists: true, id: 'pending', data: () => ({ paymentStatus: 'confirmed', moderationStatus: 'PENDING', state: 'IN_PROGRESS' }) });
  expect(await getPublicQuickListing('pending')).toBeNull();
  expect(mockCollection).toHaveBeenCalledWith('quick_listings');
});
it('retourne null si le document est absent', async () => {
  mockGet.mockResolvedValue({ exists: false });
  expect(await getPublicQuickListing('missing')).toBeNull();
});
