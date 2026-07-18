/**
 * Route API pour vérifier le code de paiement et mettre à jour les crédits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.credits.verify-code');

interface VerifyCodeRequestBody {
  code: string;
  amount: number;
}

interface VerifyCodeResponse {
  success: boolean;
  message: string;
  credits?: number;
  expectedAmount?: number;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyCodeResponse>> {
  try {
    const { adminAuth, adminApp } = await import('@/firebase/admin');

    if (!adminApp) {
      return NextResponse.json({ success: false, message: 'Erreur de configuration du système' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: "Token d'authentification requis" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const body: VerifyCodeRequestBody = await request.json();
    const { code, amount } = body;

    if (!code || !amount) {
      return NextResponse.json({ success: false, message: 'Code et montant requis' }, { status: 400 });
    }

    const paymentQuery = await adminApp
      .firestore()
      .collection('credit_payments')
      .where('code', '==', code)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (paymentQuery.empty) {
      return NextResponse.json({ success: false, message: 'Code invalide ou déjà utilisé' }, { status: 400 });
    }

    const paymentDoc = paymentQuery.docs[0];
    const paymentData = paymentDoc.data();
    logger.info('Pending payment code found', {
      code,
      amountRequested: amount,
      amountExpected: paymentData?.amount,
      uid,
    });

    if (paymentData.amount !== amount) {
      return NextResponse.json(
        {
          success: false,
          message: `Le montant ne correspond pas au code. Ce code est pour un montant de ${paymentData.amount} FCFA`,
          expectedAmount: paymentData.amount,
        },
        { status: 400 }
      );
    }

    if (paymentData.usedBy) {
      return NextResponse.json({ success: false, message: 'Ce code a déjà été utilisé' }, { status: 400 });
    }

    if (!paymentData.name || !paymentData.credits || !paymentData.amount) {
      return NextResponse.json({ success: false, message: 'Données de paiement incomplètes' }, { status: 400 });
    }

    const userQuery = await adminApp.firestore().collection('users').where('uid', '==', uid).limit(1).get();

    if (userQuery.empty) {
      return NextResponse.json({ success: false, message: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const userDoc = userQuery.docs[0];
    const db = adminApp.firestore();
    const transactionRef = db.collection('credit_transactions').doc(`manual-code-${paymentDoc.id}-${uid}`);

    const result = await db.runTransaction(async (transaction) => {
      const [freshPaymentDoc, freshUserDoc] = await Promise.all([
        transaction.get(paymentDoc.ref),
        transaction.get(userDoc.ref),
      ]);

      const freshPaymentData = freshPaymentDoc.data();
      if (!freshPaymentDoc.exists || freshPaymentData?.status !== 'pending' || freshPaymentData?.usedBy) {
        throw new Error('CODE_ALREADY_USED');
      }

      const userData = freshUserDoc.data();
      const currentCredits = Number(userData?.credits ?? 0);
      const newCredits = currentCredits + Number(freshPaymentData.credits);
      const now = new Date();

      transaction.update(paymentDoc.ref, {
        status: 'success',
        usedBy: uid,
        usedAt: now,
      });

      transaction.update(userDoc.ref, {
        credits: newCredits,
        updatedAt: now,
      });

      transaction.set(transactionRef, {
        uid,
        type: 'purchase',
        packName: freshPaymentData.name,
        credits: freshPaymentData.credits,
        amount: freshPaymentData.amount,
        status: 'success',
        provider: 'airtel_money',
        description: 'Achat de crédits via code',
        phoneNumber: freshPaymentData.phoneNumber ?? null,
        createdAt: now,
        updatedAt: now,
        completedAt: now,
        paymentCodeId: paymentDoc.id,
      });

      return { newCredits };
    });

    return NextResponse.json({
      success: true,
      message: 'Code validé avec succès',
      credits: result.newCredits,
    });
  } catch (error: any) {
    if (error?.message === 'CODE_ALREADY_USED') {
      return NextResponse.json({ success: false, message: 'Code invalide ou déjà utilisé' }, { status: 400 });
    }

    logger.error('Verify code API failed', { error });

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
