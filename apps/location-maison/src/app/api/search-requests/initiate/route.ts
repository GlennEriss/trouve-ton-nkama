/**
 * Route API PUBLIQUE d'initiation d'une demande de recherche (visiteur anonyme,
 * aucun compte requis). Simple proxy vers la Cloud Function
 * initiateSearchRequestPayment, qui porte toute la validation forte (bornes,
 * réseau/numéro, anti-spam) — même modèle que /api/gifts/initiate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { TypePropertyEnum } from '@trouve-ton-nkama/core/domain';
import { SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH } from '@/constantes/search-requests';

const logger = createLogger('api.search-requests.initiate');

const bodySchema = z.object({
  typeProperty: z.enum(Object.keys(TypePropertyEnum) as [string, ...string[]]),
  transactionType: z.enum(['FOR_RENT', 'FOR_SALE']),
  province: z.string().trim().min(1),
  city: z.string().trim().min(1),
  neighborhood: z.string().trim().max(120).optional(),
  budgetMinXaf: z.number().int().min(0),
  budgetMaxXaf: z.number().int().min(1),
  description: z.string().trim().min(10).max(SEARCH_REQUEST_DESCRIPTION_MAX_LENGTH),
  whatsappContact: z.string().trim().min(6).max(20),
  payerPhone: z.string().trim().min(6).max(20),
  network: z.enum(['AM', 'MM']),
  boostRequested: z.boolean(),
}).refine((v) => v.budgetMinXaf <= v.budgetMaxXaf, {
  message: 'Le budget minimum doit être inférieur ou égal au budget maximum.',
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

    const cloudFunctionUrl = `https://us-central1-${process.env.FIREBASE_PROJECT_ID}.cloudfunctions.net/initiateSearchRequestPayment`;

    const cloudFunctionResponse = await fetch(cloudFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    const result = await cloudFunctionResponse.json().catch(() => null);

    if (!cloudFunctionResponse.ok) {
      logger.warn('Cloud function initiateSearchRequestPayment refused', {
        status: cloudFunctionResponse.status,
        error: result?.error,
      });
      return NextResponse.json(
        {
          success: false,
          message: result?.message ?? "Erreur lors de l'initiation du paiement",
          error: result?.error,
        },
        { status: cloudFunctionResponse.status }
      );
    }

    logger.info('Search request payment initiated', { transactionId: result?.transactionId });
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Search request initiate API failed', { error });
    return NextResponse.json(
      { success: false, message: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
