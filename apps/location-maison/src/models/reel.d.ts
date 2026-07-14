/**
 * @module reel
 */
import { ICreation } from "./creation";
import type { ModerationStatus } from "./annonce";

export type ReelProcessingStatus = 'uploading' | 'processing' | 'ready' | 'failed';

export type Reel = ICreation & {
    // Optionnel : un réel peut être créé sans annonce existante (visiteur sans compte/sans
    // annonce, voir CreateOrphanReelClient) puis rattaché plus tard via attachReelToProperty.
    propertyId?: string | null;
    createdBy: string;
    // Numéro à contacter pour ce réel, indépendant d'une éventuelle annonce liée (un réel peut
    // exister sans annonce, voir propertyId). Optionnel : si absent, le feed retombe sur le
    // contact de l'annonce liée puis, en dernier recours, le numéro de profil du créateur.
    contact?: string;

    processingStatus: ReelProcessingStatus;
    processingError?: string;
    rawVideoPath: string;

    videoUrl?: string;
    videoPath?: string;
    thumbnailUrl?: string;
    thumbnailPath?: string;
    durationSeconds?: number;

    moderationStatus: ModerationStatus;
    rejectionReason?: string;
    moderationReviewedAt?: import("firebase/firestore").Timestamp;
    moderationReviewedBy?: string;

    viewCount: number;
    giftCount: number;
    giftTotalAmount: number;
}
