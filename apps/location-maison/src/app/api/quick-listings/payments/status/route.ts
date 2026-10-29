import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '@/firebase/admin';
import { operationSecretSchema } from '@/features/quick-listings/payment';
import { digest } from '@/features/quick-listings/payment.server';

export async function GET(request: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  const secret = operationSecretSchema.safeParse(request.headers.get('authorization')?.replace(/^Bearer /, ''));
  if (!secret.success) return reply({ message: 'Suivi non autorisé.' }, 401);
  try {
    if (!adminApp) return reply({ message: 'Suivi temporairement indisponible.' }, 503);
    const id = digest(secret.data);
    const snap = await getFirestore(adminApp).collection('quick_listing_payments').doc(id).get();
    if (!snap.exists) return reply({ message: 'Opération non retrouvée. Ne relancez pas de paiement sans vérification.' }, 404);
    return reply({ transactionId: id, status: snap.data()?.status });
  } catch { return reply({ message: 'Suivi temporairement indisponible.' }, 503); }
}
