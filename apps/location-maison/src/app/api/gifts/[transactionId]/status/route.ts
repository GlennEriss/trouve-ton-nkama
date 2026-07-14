/**
 * Statut d'une transaction cadeau, pour le polling du donateur anonyme.
 * Ne renvoie QUE {status, failureReason} : le doc complet (téléphone du
 * donateur, montants) ne doit jamais être exposé publiquement — l'id de
 * transaction non devinable sert de capability token temporaire.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp } from '@/firebase/admin';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';

const logger = createLogger('api.gifts.status');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params;
    if (!transactionId) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Transaction ID is required');
    }

    const db = getAdminFirestore(adminApp as any);
    const snap = await db
      .collection(firebaseCollectionNames.gift_transactions)
      .doc(transactionId)
      .get();

    if (!snap.exists) {
      return jsonApiError(404, 'NOT_FOUND', 'Transaction introuvable');
    }

    const data = snap.data() ?? {};
    return NextResponse.json({
      status: data.status ?? 'pending',
      failureReason: data.failureReason ?? null,
    });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/gifts/[transactionId]/status',
      fallbackMessage: 'Internal server error',
    });
  }
}
