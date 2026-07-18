/**
 * Résumé cadeaux de l'annonceur connecté : solde dérivé + historique des
 * cadeaux reçus (montants NETS uniquement, numéro donateur masqué) +
 * historique des retraits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp } from '@/firebase/admin';
import { deriveGiftBalance } from '@/lib/gifts/balance';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { resolveAuthenticatedUid } from '@/lib/server/authenticated-uid';

const logger = createLogger('api.gifts.summary');

const HISTORY_LIMIT = 50;

/** 074123456 → 074****56 : l'annonceur n'a pas à connaître le numéro du donateur. */
function maskPhone(phone: string): string {
  const digits = String(phone ?? '');
  if (digits.length < 5) return '*'.repeat(digits.length);
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
}

export async function GET(request: NextRequest) {
  try {
    const uid = await resolveAuthenticatedUid(request);
    if (!uid) {
      return jsonApiError(401, 'UNAUTHORIZED', 'Authentification requise');
    }

    const db = getAdminFirestore(adminApp as any);
    const [balance, giftsSnap, withdrawalsSnap] = await Promise.all([
      deriveGiftBalance(uid),
      db.collection(firebaseCollectionNames.gift_transactions)
        .where('announcerUid', '==', uid)
        .where('status', '==', 'success')
        .orderBy('createdAt', 'desc')
        .limit(HISTORY_LIMIT)
        .get(),
      db.collection(firebaseCollectionNames.gift_withdrawals)
        .where('announcerUid', '==', uid)
        .orderBy('dateCreation', 'desc')
        .limit(HISTORY_LIMIT)
        .get(),
    ]);

    const gifts = giftsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        netAmountXaf: data.netAmountXaf ?? 0,
        message: data.message ?? null,
        reelId: data.reelId ?? null,
        donorPhoneMasked: maskPhone(data.donorPhone),
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    const withdrawals = withdrawalsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        montantXaf: data.montantXaf ?? 0,
        feeXaf: data.feeXaf ?? 0,
        netPayoutXaf: data.netPayoutXaf ?? 0,
        numero: data.numero ?? '',
        reseau: data.reseau ?? 'AM',
        statut: data.statut ?? 'EN_ATTENTE',
        motifRefus: data.motifRefus ?? null,
        dateCreation: data.dateCreation?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ balance, gifts, withdrawals });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/gifts/summary',
      fallbackMessage: 'Internal server error',
    });
  }
}
