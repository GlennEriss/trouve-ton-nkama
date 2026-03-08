/**
 * Route API pour initier l'achat de crédits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.credits.purchase');

interface PurchaseRequestBody {
  packId: string;
  code: string;
}

interface PurchaseResponse {
  success: boolean;
  transactionId?: string;
  checkoutUrl?: string;
  message: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PurchaseResponse>> {
  try {
    const { adminAuth } = await import('@/firebase/admin');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: "Token d'authentification requis" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    await adminAuth.verifyIdToken(token);

    const body: PurchaseRequestBody = await request.json();
    const { packId, code } = body;

    if (!packId || !code) {
      return NextResponse.json({ success: false, message: 'Pack ID et code requis' }, { status: 400 });
    }

    const isLocalEnvironment = !process.env.VERCEL && !process.env.NETLIFY && !process.env.CF_PAGES;
    const cloudFunctionUrl = isLocalEnvironment
      ? `http://127.0.0.1:5001/${process.env.FIREBASE_PROJECT_ID}/us-central1/initiatePurchase`
      : `https://us-central1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/initiatePurchase`;

    logger.info('Calling credit purchase cloud function', {
      cloudFunctionUrl,
      packId,
    });

    const cloudFunctionResponse = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          packId,
          code,
        },
      }),
    });

    if (!cloudFunctionResponse.ok) {
      const errorData = await cloudFunctionResponse.json().catch(() => ({}));
      logger.error('Cloud function initiatePurchase failed', {
        status: cloudFunctionResponse.status,
        errorData,
      });

      return NextResponse.json(
        {
          success: false,
          message: errorData.error ?? "Erreur lors de l'initiation du paiement",
          error:
            process.env.NODE_ENV === 'development'
              ? `Cloud Function error: ${cloudFunctionResponse.status}`
              : undefined,
        },
        { status: 500 }
      );
    }

    const result = await cloudFunctionResponse.json();
    logger.info('Cloud function initiatePurchase succeeded', {
      packId,
      hasCheckoutUrl: Boolean(result?.checkoutUrl),
      transactionId: result?.transactionId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error('Purchase API failed', { error });

    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { success: false, message: 'Session expirée, veuillez vous reconnecter' },
        { status: 401 }
      );
    }

    if (error.code === 'auth/invalid-id-token') {
      return NextResponse.json(
        { success: false, message: "Token d'authentification invalide" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
