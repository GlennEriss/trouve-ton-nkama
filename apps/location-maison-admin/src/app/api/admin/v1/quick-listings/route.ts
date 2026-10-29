import { NextRequest } from 'next/server';
import { FieldPath, FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { requireAdmin } from '@/modules/iam/presentation/admin-guard';
import { jsonError, jsonSuccess } from '@/lib/api/response';
import { getFirebaseAdminDb } from '@/lib/firebase/firebase-admin';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request, 'listings.read');
  if (!auth.ok) return auth.response;
  const cursor = request.nextUrl.searchParams.get('cursor');
  if (cursor && !/^[\w-]{1,150}$/.test(cursor)) return jsonError({ code: 'VALIDATION_ERROR', message: 'Curseur invalide.' }, 400);
  try {
    let query = getFirebaseAdminDb().collection('quick_listings').where('paymentStatus', '==', 'confirmed').where('moderationStatus', '==', 'PENDING').where('state', '==', 'IN_PROGRESS').orderBy(FieldPath.documentId()).limit(21);
    if (cursor) query = query.startAfter(cursor);
    const docs = (await query.get()).docs;
    const items = docs.slice(0, 20).map(doc => {
      const data = doc.data();
      return { id: doc.id, description: data.description, province: data.province, city: data.city, neighborhood: data.neighborhood, contactPhone: data.contactPhone };
    });
    return jsonSuccess({ items, nextCursor: docs.length > 20 ? items[items.length - 1].id : null });
  } catch { return jsonError({ code: 'INTERNAL_ERROR', message: 'File indisponible.' }, 503); }
}
const decisionSchema = z.object({ id: z.string().regex(/^[\w-]{1,150}$/), decision: z.enum(['APPROVED', 'REJECTED']), reason: z.string().trim().max(1000).optional() }).strict()
  .refine(v => v.decision !== 'REJECTED' || (v.reason?.length ?? 0) >= 3);
export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return jsonError({ code: 'FORBIDDEN', message: 'Origine non autorisée.' }, 403);
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError({ code: 'VALIDATION_ERROR', message: 'Décision ou motif invalide.' }, 400);
  const auth = await requireAdmin(request, parsed.data.decision === 'APPROVED' ? 'listings.approve' : 'listings.reject');
  if (!auth.ok) return auth.response;
  const db = getFirebaseAdminDb();
  const { id, decision, reason } = parsed.data;
  try {
    await db.runTransaction(async tx => {
      const ref = db.collection('quick_listings').doc(id);
      const snapshot = await tx.get(ref);
      const data = snapshot.data();
      if (!data || data.paymentStatus !== 'confirmed' || data.moderationStatus !== 'PENDING' || data.state !== 'IN_PROGRESS') throw new Error('NOT_PENDING');
      const now = FieldValue.serverTimestamp();
      tx.update(ref, { moderationStatus: decision, updatedAt: now, ...(decision === 'APPROVED' ? { publishedAt: now } : {}) });
      // Motif et identité administrateur privés, jamais dans le document public.
      tx.set(db.collection('quick_listing_moderation').doc(id), { decision, reason: reason ?? null, reviewedBy: auth.admin.uid, reviewedAt: now });
    });
    return jsonSuccess({ id, decision });
  } catch { return jsonError({ code: 'CONFLICT', message: 'Décision non appliquée. Rechargez la file avant de réessayer.' }, 409); }
}
