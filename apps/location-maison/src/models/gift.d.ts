/**
 * @module gift
 *
 * Cadeaux (dons MoMo sur les réels) et retraits du solde cadeaux.
 * Les documents sont écrits exclusivement côté serveur (Cloud Functions +
 * routes API Admin SDK) — aucun accès client Firestore (voir firestore.rules).
 */
import type { Timestamp } from "firebase/firestore";

export type GiftTransactionStatus = 'pending' | 'success' | 'failed';
export type GiftNetwork = 'AM' | 'MM';
export type GiftWithdrawalStatus = 'EN_ATTENTE' | 'TRAITE' | 'REFUSE';

export type GiftTransaction = {
    id: string;
    type: 'gift';
    reelId: string;
    announcerUid: string;
    propertyId?: string | null;
    donorPhone: string;
    donorNetwork: GiftNetwork;
    message?: string | null;
    amountXaf: number;          // brut payé par le donateur
    commissionRate: number;     // snapshot au moment du don
    netAmountXaf: number;       // net crédité à l'annonceur
    status: GiftTransactionStatus;
    createdAt: Timestamp;
    completedAt?: Timestamp;
};

export type GiftWithdrawal = {
    id: string;
    announcerUid: string;
    montantXaf: number;         // solde débité (= tout le disponible à la demande)
    feeRate: number;            // snapshot frais de retrait
    feeXaf: number;
    netPayoutXaf: number;       // montant réellement envoyé par l'admin
    numero: string;
    reseau: GiftNetwork;
    statut: GiftWithdrawalStatus;
    traitePar?: string;
    motifRefus?: string;
    dateCreation: Timestamp;
    dateMiseAJour: Timestamp;
};
