import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { listPublicQuickListings } from '@/features/quick-listings/public-listing.server';

export const dynamic = 'force-dynamic';
const cursorSchema = z.object({ seconds: z.number().int().min(0).max(253402300799), nanoseconds: z.number().int().min(0).max(999999999), id: z.string().min(1).max(128).regex(/^[^/]+$/).refine(id => id !== '.' && id !== '..') });
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Number(params.get('limit') ?? 20);
  let cursor: z.infer<typeof cursorSchema> | undefined;
  try {
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error();
    const encoded = params.get('cursor');
    if (encoded !== null) {
      if (!encoded || encoded.length > 512) throw new Error();
      cursor = cursorSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
    }
  } catch { return NextResponse.json({ error: 'invalid_pagination' }, { status: 400 }); }
  try {
    return NextResponse.json(await listPublicQuickListings(limit, cursor), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'quick_listings_unavailable' }, { status: 503 });
  }
}
