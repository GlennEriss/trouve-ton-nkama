/**
 * Route API pour récupérer le solde de crédits
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('api.credits.balance');

interface BalanceResponse {
  success: boolean;
  credits?: number;
  message: string;
  error?: string;
}

async function findUserDocumentByUID(db: any, userId: string) {
  const usersSnapshot = await db.collection('users').where('uid', '==', userId).limit(1).get();

  if (usersSnapshot.empty) {
    return null;
  }

  return usersSnapshot.docs[0];
}

export async function GET(request: NextRequest): Promise<NextResponse<BalanceResponse>> {
  try {
    const [{ adminAuth }, { getFirestore, FieldValue }] = await Promise.all([
      import('@/firebase/admin'),
      import('firebase-admin/firestore'),
    ]);
    const db = getFirestore();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: "Token d'authentification requis" }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const userDoc = await findUserDocumentByUID(db, userId);

    if (!userDoc) {
      return NextResponse.json(
        {
          success: false,
          message: 'Profil utilisateur non trouvé. Veuillez compléter votre inscription.',
        },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    let credits = userData?.credits;

    if (typeof credits === 'undefined') {
      credits = 3;
      await userDoc.ref.update({
        credits,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        credits,
        message: 'Bienvenue ! Vous avez reçu 3 crédits gratuits',
      });
    }

    return NextResponse.json({
      success: true,
      credits,
      message: `Vous avez ${credits} crédit${credits > 1 ? 's' : ''}`,
    });
  } catch (error: any) {
    logger.error('Balance API failed', { error });

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
        message: 'Erreur lors de la récupération du solde',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
