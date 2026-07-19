/**
 * Route API pour initier l'achat de crédits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import {
  attachRequestId,
  createRequestLogContext,
} from '@/lib/observability/request-context';

interface PurchaseRequestBody {
  packId: string;
  phoneNumber: string;
  network?: 'AM' | 'MM';
}

interface PurchaseResponse {
  success: boolean;
  transactionId?: string;
  checkoutUrl?: string;
  providerPaymentToken?: string;
  message: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<PurchaseResponse>> {
  const requestContext = createRequestLogContext(request, 'credits.purchase', 'payment');
  const logger = createLogger('api.credits.purchase', requestContext);
  const respond = (payload: PurchaseResponse, status = 200) =>
    attachRequestId(NextResponse.json(payload, { status }), requestContext.requestId);

  try {
    const { adminAuth } = await import('@/firebase/admin');

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return respond({ success: false, message: "Token d'authentification requis" }, 401);
    }

    const token = authHeader.split('Bearer ')[1];

    await adminAuth.verifyIdToken(token);

    const body: PurchaseRequestBody = await request.json();
    const { packId, phoneNumber, network } = body;

    if (!packId || !phoneNumber) {
      return respond({ success: false, message: 'Pack ID et numéro de téléphone requis' }, 400);
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
          phoneNumber,
          network,
        },
      }),
    });

    if (!cloudFunctionResponse.ok) {
      const errorData = await cloudFunctionResponse.json().catch(() => ({}));
      logger.error('Cloud function initiatePurchase failed', {
        incidentCode: 'PAYMENT_FUNCTION_FAILED',
        retryable: cloudFunctionResponse.status >= 500,
        status: cloudFunctionResponse.status,
        errorData,
      });

      return respond(
        {
          success: false,
          message: errorData.error ?? "Erreur lors de l'initiation du paiement",
          error:
            process.env.NODE_ENV === 'development'
              ? `Cloud Function error: ${cloudFunctionResponse.status}`
              : undefined,
        },
        500,
      );
    }

    const functionPayload = await cloudFunctionResponse.json();
    const result = functionPayload?.result ?? functionPayload;
    logger.info('Cloud function initiatePurchase succeeded', {
      packId,
      hasCheckoutUrl: Boolean(result?.checkoutUrl),
      transactionId: result?.transactionId,
    });

    return respond(result);
  } catch (error: any) {
    logger.error('Purchase API failed', {
      incidentCode: 'CREDIT_PURCHASE_FAILED',
      retryable: !String(error?.code ?? '').startsWith('auth/'),
      error,
    });

    if (error.code === 'auth/id-token-expired') {
      return respond(
        { success: false, message: 'Session expirée, veuillez vous reconnecter' },
        401,
      );
    }

    if (error.code === 'auth/invalid-id-token') {
      return respond(
        { success: false, message: "Token d'authentification invalide" },
        401,
      );
    }

    return respond(
      {
        success: false,
        message: 'Erreur interne du serveur',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      500,
    );
  }
}
