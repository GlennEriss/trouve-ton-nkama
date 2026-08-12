/**
 * Route API PUBLIQUE d'initiation d'un cadeau (don MoMo sur un réel ou une annonce).
 * Pas d'authentification : le donateur est anonyme (décision produit) — la
 * confirmation USSD sur son propre téléphone est le garde-fou du paiement.
 * Simple proxy vers la Cloud Function initiateGiftPayment, qui porte toute la
 * validation forte (bornes, réseau/numéro, cible APPROVED, anti-spam).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { GIFT_MAX_AMOUNT_XAF, GIFT_MESSAGE_MAX_LENGTH, GIFT_MIN_AMOUNT_XAF } from '@/constantes/gifts';

const logger = createLogger('api.gifts.initiate');

const bodySchema = z
  .object({
    reelId: z.string().trim().min(1).optional(),
    propertyId: z.string().trim().min(1).optional(),
    amount: z.number().int().min(GIFT_MIN_AMOUNT_XAF).max(GIFT_MAX_AMOUNT_XAF),
    phoneNumber: z.string().trim().min(6).max(20),
    network: z.enum(['AM', 'MM']),
    message: z.string().trim().max(GIFT_MESSAGE_MAX_LENGTH).optional(),
  })
  .refine((v) => Boolean(v.reelId) !== Boolean(v.propertyId), {
    message: 'Fournir soit reelId soit propertyId, jamais les deux ni aucun.',
  });

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Données invalides.', error: 'invalid_body' },
        { status: 400 }
      );
    }

    const cloudFunctionUrl = `https://us-central1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/initiateGiftPayment`;

    const cloudFunctionResponse = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const result = await cloudFunctionResponse.json().catch(() => null);

    if (!cloudFunctionResponse.ok) {
      logger.warn('Cloud function initiateGiftPayment refused', {
        status: cloudFunctionResponse.status,
        error: result?.error,
      });
      // Relayer le statut de la function (400 validation, 404 réel, 429 anti-spam,
      // 502 provider) pour que le client affiche le bon message.
      return NextResponse.json(
        {
          success: false,
          message: result?.message ?? "Erreur lors de l'initiation du paiement",
          error: result?.error,
        },
        { status: cloudFunctionResponse.status }
      );
    }

    logger.info('Gift payment initiated', { transactionId: result?.transactionId });
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Gift initiate API failed', { error });
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
