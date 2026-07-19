/**
 * Demande de retrait du solde cadeaux. Règles (modèle occazGabon) :
 * - le solde est TOUJOURS re-dérivé côté serveur (le client n'envoie aucun montant) ;
 * - retrait de l'intégralité du disponible, pas de montant partiel ;
 * - minimum de solde requis ; une seule demande EN_ATTENTE à la fois ;
 * - frais de retrait (5 %) snapshotés sur le doc — l'admin envoie netPayoutXaf.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { z } from 'zod';
import firebaseCollectionNames from '@/constantes/firebase-collection-name';
import { adminApp } from '@/firebase/admin';
import {
  WITHDRAWAL_FEE_RATE,
  WITHDRAWAL_MINIMUM_XAF,
  computeWithdrawalFee,
  computeWithdrawalNetPayout,
} from '@/constantes/gifts';
import { isPhoneValidForNetwork, sanitizeLocalPhone } from '@/constantes/payment-methods';
import { computeGiftBalanceFromRows } from '@/lib/gifts/balance-calculator';
import { createLogger } from '@/lib/logger';
import { handleApiError, jsonApiError } from '@/lib/api/error-response';
import { AppError } from '@/lib/errors/app-error';
import { resolveAuthenticatedUid } from '@/lib/server/authenticated-uid';

const logger = createLogger('api.gifts.withdrawals');

const bodySchema = z.object({
  numero: z.string().trim().min(6).max(20),
  reseau: z.enum(['AM', 'MM']),
});

export async function POST(request: NextRequest) {
  try {
    const uid = await resolveAuthenticatedUid(request);
    if (!uid) {
      return jsonApiError(401, 'UNAUTHORIZED', 'Authentification requise');
    }

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonApiError(400, 'VALIDATION_ERROR', 'Données invalides.');
    }

    const numero = sanitizeLocalPhone(parsed.data.numero);
    const reseau = parsed.data.reseau;
    if (!isPhoneValidForNetwork(numero, reseau)) {
      return jsonApiError(
        400,
        'INVALID_PHONE',
        'Numéro invalide pour ce réseau (Airtel : 074/077 — Moov : 062/065/066).'
      );
    }

    const db = getAdminFirestore(adminApp as any);
    const ref = db.collection(firebaseCollectionNames.gift_withdrawals).doc();

    const result = await db.runTransaction(async (transaction) => {
      const usersQuery = db.collection(firebaseCollectionNames.users).where('uid', '==', uid).limit(1);
      const withdrawalsQuery = db.collection(firebaseCollectionNames.gift_withdrawals).where('announcerUid', '==', uid);

      const [usersSnap, withdrawalsSnap] = await Promise.all([
        transaction.get(usersQuery),
        transaction.get(withdrawalsQuery),
      ]);

      const balance = computeGiftBalanceFromRows(
        usersSnap.docs[0]?.data()?.giftTotalReceivedXaf,
        withdrawalsSnap.docs.map((doc) => doc.data()),
      );

      if (balance.hasPendingWithdrawal) {
        throw new AppError('Tu as déjà une demande de retrait en attente de traitement.', {
          code: 'WITHDRAWAL_PENDING',
          status: 409,
        });
      }

      if (balance.disponibleXaf < WITHDRAWAL_MINIMUM_XAF) {
        throw new AppError(
          `Le retrait est possible à partir de ${WITHDRAWAL_MINIMUM_XAF.toLocaleString('fr-FR')} FCFA de solde.`,
          {
            code: 'BELOW_MINIMUM',
            status: 400,
          },
        );
      }

      const montantXaf = balance.disponibleXaf;
      transaction.create(ref, {
        id: ref.id,
        announcerUid: uid,
        montantXaf,
        feeRate: WITHDRAWAL_FEE_RATE,
        feeXaf: computeWithdrawalFee(montantXaf),
        netPayoutXaf: computeWithdrawalNetPayout(montantXaf),
        numero,
        reseau,
        statut: 'EN_ATTENTE',
        dateCreation: FieldValue.serverTimestamp(),
        dateMiseAJour: FieldValue.serverTimestamp(),
      });

      return { withdrawalId: ref.id, montantXaf };
    });

    logger.info('Withdrawal requested', { uid, montantXaf: result.montantXaf });
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return handleApiError(error, {
      logger,
      route: '/api/gifts/withdrawals',
      fallbackMessage: 'Internal server error',
    });
  }
}
