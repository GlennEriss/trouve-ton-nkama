import { GET } from '@/app/api/quick-listings/route';
import { listPublicQuickListings } from '@/features/quick-listings/public-listing.server';
import type { NextRequest } from 'next/server';
jest.mock('@/features/quick-listings/public-listing.server', () => ({ listPublicQuickListings: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => body }) } }));
const list = jest.mocked(listPublicQuickListings);
const request = (query: string) => ({ nextUrl: new URL(`http://localhost/api/quick-listings${query}`) } as NextRequest);
beforeEach(() => jest.resetAllMocks());
it.each(['?limit=0', '?limit=51', '?limit=NaN', '?limit=1.5', '?cursor=bad'])('refuse une pagination invalide %s', async query => {
  expect((await GET(request(query))).status).toBe(400);
  expect(list).not.toHaveBeenCalled();
});
it('transmet une limite bornée et un curseur validé', async () => {
  const cursor = { seconds: 1234, nanoseconds: 5, id: 'test' };
  list.mockResolvedValue({ items: [], nextCursor: null });
  expect((await GET(request(`?limit=4&cursor=${Buffer.from(JSON.stringify(cursor)).toString('base64url')}`))).status).toBe(200);
  expect(list).toHaveBeenCalledWith(4, cursor);
});
it('ne divulgue pas les erreurs du serveur', async () => {
  list.mockRejectedValue(new Error('private credentials'));
  const result = await GET(request(''));
  expect(result.status).toBe(503);
  expect(await result.json()).toEqual({ error: 'quick_listings_unavailable' });
});
