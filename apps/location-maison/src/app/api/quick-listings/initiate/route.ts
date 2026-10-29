import { NextRequest, NextResponse } from 'next/server';
import { quickPaymentSchema } from '@/features/quick-listings/payment';
import { reserveQuickPayment, QuickPaymentError } from '@/features/quick-listings/payment.server';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site')
    return reply({ message: 'Origine non autorisée.' }, 403);
  if (process.env.QUICK_LISTINGS_PAYMENTS_ENABLED !== 'true') return reply({ message: 'Le paiement des annonces rapides est temporairement indisponible.' }, 503);
  if (!process.env.FIREBASE_PROJECT_ID) return reply({ message: 'Service indisponible.' }, 503);
  try {
    const raw = await request.text();
    if (raw.length > 16000) return reply({ message: 'Saisie trop volumineuse.' }, 400);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return reply({ message: 'Saisie invalide.' }, 400); }
    const parsed = quickPaymentSchema.safeParse(body);
    if (!parsed.success) return reply({ message: 'Vérifiez la saisie et le numéro payeur.' }, 400);
    const reserved = await reserveQuickPayment(parsed.data);
    if (reserved.created) {
      try {
        // Ticket serveur privé, jamais exposé au navigateur. Aucun retry financier.
        await fetch(`https://us-central1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/initiateQuickListingPayment`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: reserved.id, ticket: reserved.ticket }), signal: AbortSignal.timeout(20000),
        });
      } catch { /* Indéterminé : le callback ou un rapprochement décidera, pas le transport. */ }
    }
    return reply({ transactionId: reserved.id, status: 'pending_confirmation' }, 202);
  } catch (error) {
    if (error instanceof QuickPaymentError) return reply({ message: error.message }, error.status);
    // La réservation peut avoir abouti : ne jamais autoriser un nouveau débit sur cette base.
    return reply({ message: 'Résultat indéterminé. Conservez cette opération et reprenez son suivi.' }, 500);
  }
}
