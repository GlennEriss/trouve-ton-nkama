/**
 * @module search-request
 */

import { Timestamp } from "firebase/firestore";
import { ICreation } from "./creation";
import type { TypePropertyKey, ModerationStatus } from "@trouve-ton-nkama/core/domain";
import type { StatusProperty } from "./annonce";

export type SearchRequestPaymentStatus = "pending_confirmation" | "confirmed" | "failed";
export type SearchRequestPayerNetwork = "AM" | "MM";

/**
 * Demande de recherche publiée anonymement par un visiteur qui n'a rien trouvé
 * sur /search. Un doc = un paiement (id = transactionId MyPayGa), contrairement
 * à gift_transactions qui est N:1 (plusieurs dons vers une même cible).
 *
 * moderationStatus démarre à `null` (pas 'PENDING') tant que le paiement n'est
 * pas confirmé — ça garde la queue de modération admin propre avec une seule
 * condition (`== 'PENDING'`), sans qu'un brouillon jamais payé ne puisse y
 * apparaître. Voir packages/core/src/domain/moderation-status.ts.
 */
export type SearchRequest = ICreation & {
    // Contenu soumis par le visiteur
    typeProperty: TypePropertyKey;
    transactionType: StatusProperty;
    province: string;
    city: string;
    neighborhood?: string;
    budgetMinXaf: number;
    budgetMaxXaf: number;
    description: string;
    whatsappContact: string;

    // Paiement MyPayGa (vit sur le doc lui-même, 1:1 avec la demande)
    provider: "mypayga";
    payerPhone: string;
    payerNetwork: SearchRequestPayerNetwork;
    paymentStatus: SearchRequestPaymentStatus;
    amountPaidXaf: number;
    providerPaymentToken?: string | null;
    failureReason?: string | null;

    // Boost optionnel (+1500 FCFA, 7 jours top de liste + badge)
    boostRequested: boolean;
    boostPaid: boolean;
    // Écrits UNIQUEMENT au moment de l'approbation admin (jamais dans le
    // webhook) : la fenêtre de boost démarre à l'approbation, pas au paiement,
    // pour ne pas pénaliser le payeur si la modération est lente.
    boostStartAt?: Timestamp | null;
    boostEndAt?: Timestamp | null;

    // Modération (même convention que Property, voir models/annonce.d.ts)
    moderationStatus: ModerationStatus | null;
    rejectionReason?: string;
    moderationReviewedAt?: Timestamp;
    moderationReviewedBy?: string;
};
