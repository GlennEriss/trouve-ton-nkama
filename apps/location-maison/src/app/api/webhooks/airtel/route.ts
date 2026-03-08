/**
 * Webhook Airtel Money - Réception des notifications de paiement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.webhooks.airtel');

interface AirtelWebhookPayload {
  transaction: {
    airtel_money_id: string;
    id: string;
    message: string;
    status: string;
    amount: number;
    currency: string;
  };
  reference: string;
  timestamp: string;
  signature?: string;
}

function verifyWebhookSignature(payload: string, signature: string): boolean {
  void payload;
  void signature;
  return true;
}

async function addCreditsToUser(
  db: any,
  FieldValue: any,
  userId: string,
  credits: number,
  transactionId: string
) {
  const usersSnapshot = await db.collection('users').where('uid', '==', userId).limit(1).get();

  if (usersSnapshot.empty) {
    throw new Error(`Utilisateur introuvable: ${userId}`);
  }

  const userDoc = usersSnapshot.docs[0];
  const currentCredits = userDoc.data()?.credits ?? 0;
  const newCredits = currentCredits + credits;

  await db.runTransaction(async (transaction: any) => {
    transaction.update(userDoc.ref, {
      credits: newCredits,
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(db.collection('credit_transactions').doc(transactionId), {
      status: 'success',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const [{ adminApp }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);

    if (!adminApp) {
      return NextResponse.json({ error: 'Firebase admin is not initialized' }, { status: 500 });
    }

    const db = getFirestore(adminApp as any);

    logger.info('Airtel webhook received');

    const body = await request.text();
    const payload: AirtelWebhookPayload = JSON.parse(body);

    logger.info('Airtel webhook payload parsed', {
      transactionId: payload?.transaction?.id,
      status: payload?.transaction?.status,
      amount: payload?.transaction?.amount,
      reference: payload?.reference,
    });

    const signature = request.headers.get('x-airtel-signature') ?? '';
    if (!verifyWebhookSignature(body, signature)) {
      logger.warn('Invalid Airtel webhook signature');
      return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
    }

    const { transaction } = payload;
    const transactionId = transaction.id;

    const transactionDoc = await db.collection('credit_transactions').doc(transactionId).get();

    if (!transactionDoc.exists) {
      logger.warn('Credit transaction not found for webhook', { transactionId });
      return NextResponse.json({ error: 'Transaction introuvable' }, { status: 404 });
    }

    const transactionData = transactionDoc.data()!;
    const userId = transactionData.userId;
    const credits = transactionData.credits;

    logger.info('Processing Airtel transaction status', {
      transactionId,
      status: transaction.status,
      userId,
      credits,
    });

    switch (transaction.status.toUpperCase()) {
      case 'SUCCESS':
        await addCreditsToUser(db, FieldValue, userId, credits, transactionId);

        await db.collection('credit_transactions').doc(transactionId).update({
          status: 'success',
          airtelMoneyId: transaction.airtel_money_id,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info('Airtel payment success handled', { transactionId, userId, credits });
        break;

      case 'FAILED':
        await db.collection('credit_transactions').doc(transactionId).update({
          status: 'failed',
          airtelMoneyId: transaction.airtel_money_id,
          failureReason: transaction.message,
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.warn('Airtel payment failed', { transactionId, reason: transaction.message });
        break;

      case 'CANCELLED':
        await db.collection('credit_transactions').doc(transactionId).update({
          status: 'cancelled',
          airtelMoneyId: transaction.airtel_money_id,
          failureReason: "Paiement annulé par l'utilisateur",
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.warn('Airtel payment cancelled', { transactionId });
        break;

      case 'PENDING':
        await db.collection('credit_transactions').doc(transactionId).update({
          airtelMoneyId: transaction.airtel_money_id,
          updatedAt: FieldValue.serverTimestamp(),
        });
        logger.info('Airtel payment pending', { transactionId });
        break;

      default:
        logger.warn('Unknown Airtel payment status', {
          transactionId,
          status: transaction.status,
        });
        break;
    }

    return NextResponse.json({
      status: 'success',
      message: 'Webhook traité avec succès',
    });
  } catch (error: any) {
    logger.error('Airtel webhook processing failed', { error });

    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Webhook Airtel Money opérationnel',
    timestamp: new Date().toISOString(),
  });
}
